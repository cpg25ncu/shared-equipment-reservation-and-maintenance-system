package sg.edu.nus.serms.shared;

import static org.assertj.core.api.Assertions.assertThat;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.regex.Pattern;
import net.javacrumbs.shedlock.core.LockConfiguration;
import net.javacrumbs.shedlock.core.LockProvider;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.postgresql.ds.PGSimpleDataSource;
import org.springframework.aop.support.AopUtils;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.boot.web.server.context.WebServerApplicationContext;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import sg.edu.nus.serms.SermsApplication;
import sg.edu.nus.serms.notification.service.NotificationWorker;
import sg.edu.nus.serms.testsupport.SermsFixtures;
import sg.edu.nus.serms.testsupport.SermsPostgres;

/**
 * Horizontal scaling (report AD-02, AD-08): two real application replicas on their own HTTP ports
 * share one PostgreSQL 18 database, as they do behind the nginx load balancer. A login on one
 * replica must be valid on the other, a logout on either must end it everywhere, and a scheduled
 * job lock held by one replica must keep the other from running the same job.
 */
class ClusterScalingPostgresTest {
  static final String PASSWORD = "cluster-test-password";
  static ConfigurableApplicationContext replicaA;
  static ConfigurableApplicationContext replicaB;
  static JdbcTemplate jdbc;
  final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build();

  @BeforeAll
  static void startTwoReplicas() {
    var db = (PGSimpleDataSource) SermsPostgres.dataSource();
    replicaA = replica(db, "replica-a");
    replicaB = replica(db, "replica-b");
    jdbc = new JdbcTemplate(db);
  }

  @AfterAll
  static void stop() {
    if (replicaA != null) replicaA.close();
    if (replicaB != null) replicaB.close();
  }

  static ConfigurableApplicationContext replica(PGSimpleDataSource db, String name) {
    Map<String, String> args = new java.util.LinkedHashMap<>();
    args.put("server.port", "0");
    args.put("server.address", "127.0.0.1");
    args.put("spring.application.name", "serms-" + name);
    args.put("spring.datasource.url", db.getURL() + "?currentSchema=serms,public");
    args.put("spring.datasource.username", db.getUser());
    args.put("spring.datasource.password", db.getPassword());
    // SermsPostgres already applied V001-V009 with the same scripts Flyway uses.
    args.put("spring.flyway.enabled", "false");
    args.put("serms.notifications.poll-ms", "3600000");
    args.put("serms.notifications.scan-enabled", "false");
    args.put("serms.security.secure-cookies", "false");
    args.put("server.servlet.session.cookie.secure", "false");
    // Command-line arguments outrank application.properties and its environment defaults.
    return new SpringApplicationBuilder(SermsApplication.class)
        .run(args.entrySet().stream().map(e -> "--" + e.getKey() + "=" + e.getValue()).toArray(String[]::new));
  }

  static String base(ConfigurableApplicationContext replica) {
    int port = ((WebServerApplicationContext) replica).getWebServer().getPort();
    return "http://127.0.0.1:" + port + "/api/v1";
  }

  record Cookies(String session, String xsrf) {
    String header() {
      return "JSESSIONID=" + session + (xsrf == null ? "" : "; XSRF-TOKEN=" + xsrf);
    }
  }

  static String cookie(HttpResponse<?> response, String name) {
    Pattern p = Pattern.compile("^" + name + "=([^;]*)");
    return response.headers().allValues("set-cookie").stream()
        .map(p::matcher).filter(java.util.regex.Matcher::find).map(m -> m.group(1))
        .reduce((first, second) -> second).orElse(null);
  }

  UUID borrower() {
    UUID id = new SermsFixtures(jdbc).user("BORROWER");
    var encoder = replicaA.getBean(PasswordEncoder.class);
    jdbc.update("UPDATE serms.app_user SET password_hash=? WHERE user_id=?", encoder.encode(PASSWORD), id);
    return id;
  }

  Cookies login(ConfigurableApplicationContext replica, UUID user) throws Exception {
    var csrf = http.send(HttpRequest.newBuilder(URI.create(base(replica) + "/auth/csrf")).GET().build(),
        HttpResponse.BodyHandlers.discarding());
    String xsrf = cookie(csrf, "XSRF-TOKEN");
    assertThat(xsrf).isNotBlank();
    var response = http.send(HttpRequest.newBuilder(URI.create(base(replica) + "/auth/login"))
            .header("Content-Type", "application/json")
            .header("Cookie", "XSRF-TOKEN=" + xsrf)
            .header("X-XSRF-TOKEN", xsrf)
            .POST(HttpRequest.BodyPublishers.ofString(
                "{\"email\":\"" + user + "@example.invalid\",\"password\":\"" + PASSWORD + "\"}"))
            .build(),
        HttpResponse.BodyHandlers.ofString());
    assertThat(response.statusCode()).isEqualTo(200);
    String session = cookie(response, "JSESSIONID");
    assertThat(session).as("Spring Session issues the contract JSESSIONID cookie").isNotBlank();
    String rotated = cookie(response, "XSRF-TOKEN");
    return new Cookies(session, rotated == null || rotated.isEmpty() ? xsrf : rotated);
  }

  HttpResponse<String> me(ConfigurableApplicationContext replica, Cookies cookies) throws Exception {
    return http.send(HttpRequest.newBuilder(URI.create(base(replica) + "/auth/me"))
            .header("Cookie", cookies.header()).GET().build(),
        HttpResponse.BodyHandlers.ofString());
  }

  @Test
  void loginOnOneReplicaIsValidOnTheOtherAndLogoutEndsItEverywhere() throws Exception {
    UUID user = borrower();
    Cookies cookies = login(replicaA, user);

    var onB = me(replicaB, cookies);
    assertThat(onB.statusCode()).isEqualTo(200);
    assertThat(onB.body()).contains(user.toString());
    assertThat(me(replicaA, cookies).statusCode()).isEqualTo(200);
    assertThat(jdbc.queryForObject(
            "SELECT count(*) FROM serms.spring_session WHERE principal_name IS NOT NULL AND principal_name = ?",
            Long.class, user.toString()))
        .as("the session row is shared in PostgreSQL, not held in one JVM").isOne();

    var csrf = http.send(HttpRequest.newBuilder(URI.create(base(replicaB) + "/auth/csrf"))
            .header("Cookie", cookies.header()).GET().build(),
        HttpResponse.BodyHandlers.discarding());
    String xsrf = cookie(csrf, "XSRF-TOKEN");
    if (xsrf == null || xsrf.isEmpty()) xsrf = cookies.xsrf();
    var logout = http.send(HttpRequest.newBuilder(URI.create(base(replicaB) + "/auth/logout"))
            .header("Cookie", "JSESSIONID=" + cookies.session() + "; XSRF-TOKEN=" + xsrf)
            .header("X-XSRF-TOKEN", xsrf)
            .POST(HttpRequest.BodyPublishers.noBody()).build(),
        HttpResponse.BodyHandlers.discarding());
    assertThat(logout.statusCode()).isEqualTo(204);
    assertThat(me(replicaA, cookies).statusCode()).isEqualTo(401);
    assertThat(me(replicaB, cookies).statusCode()).isEqualTo(401);
  }

  @Test
  void aScheduledJobLockHeldByOneReplicaBlocksTheOther() {
    LockProvider a = replicaA.getBean(LockProvider.class);
    LockProvider b = replicaB.getBean(LockProvider.class);
    String name = "cluster-test-" + UUID.randomUUID();
    var config = new LockConfiguration(Instant.now(), name, Duration.ofMinutes(1), Duration.ZERO);

    var held = a.lock(config);
    assertThat(held).isPresent();
    assertThat(b.lock(config)).as("second replica must not run the same job").isEmpty();
    held.get().unlock();
    var next = b.lock(config);
    assertThat(next).as("lock is released for the next run").isPresent();
    next.get().unlock();
    assertThat(jdbc.queryForObject("SELECT count(*) FROM serms.shedlock WHERE name=?", Long.class, name)).isOne();
  }

  @Test
  void scheduledNotificationDeliveryIsWrappedByTheClusterLock() {
    for (var replica : List.of(replicaA, replicaB)) {
      var worker = replica.getBean(NotificationWorker.class);
      assertThat(AopUtils.isAopProxy(worker)).as("@SchedulerLock interception").isTrue();
    }
  }
}
