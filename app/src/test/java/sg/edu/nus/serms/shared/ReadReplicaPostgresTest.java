package sg.edu.nus.serms.shared;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.file.Path;
import java.time.Duration;
import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.postgresql.ds.PGSimpleDataSource;
import org.springframework.beans.factory.support.StaticListableBeanFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.testcontainers.containers.BindMode;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.containers.Network;
import org.testcontainers.containers.wait.strategy.Wait;
import org.testcontainers.postgresql.PostgreSQLContainer;
import sg.edu.nus.serms.report.repository.ReportRepository;
import sg.edu.nus.serms.shared.persistence.ReadReplica;
import sg.edu.nus.serms.testsupport.SermsPostgres;

/**
 * Read replica (report AD-18) with the repository's own PostgreSQL configuration: the primary runs
 * with postgres/pg_hba.conf and the compose.yaml replication settings, the standby is cloned by
 * postgres/replica-entrypoint.sh. Report queries must run on the standby while it is healthy and
 * fall back to the primary when it stops.
 */
class ReadReplicaPostgresTest {
  static final Path CONFIG = Path.of("..", "postgres").toAbsolutePath().normalize();
  static final String USER = "serms_rr", PASSWORD = "replica-test-password", DB = "serms_rr";
  static Network network;
  static PostgreSQLContainer primary;
  static GenericContainer<?> standby;
  static PGSimpleDataSource primaryDs;

  @BeforeAll
  static void start() throws Exception {
    network = Network.newNetwork();
    primary = new PostgreSQLContainer("postgres:18-alpine")
        .withDatabaseName(DB).withUsername(USER).withPassword(PASSWORD)
        .withNetwork(network).withNetworkAliases("db")
        .withFileSystemBind(CONFIG.toString(), "/etc/serms/postgres", BindMode.READ_ONLY)
        .withCommand("postgres", "-c", "fsync=off", "-c", "hba_file=/etc/serms/postgres/pg_hba.conf",
            "-c", "wal_level=replica", "-c", "max_wal_senders=10", "-c", "max_replication_slots=10");
    primary.start();
    primaryDs = new PGSimpleDataSource();
    primaryDs.setUrl(primary.getJdbcUrl());
    primaryDs.setUser(USER);
    primaryDs.setPassword(PASSWORD);
    SermsPostgres.migrate(primaryDs);

    standby = new GenericContainer<>("postgres:18-alpine")
        .withNetwork(network)
        .withEnv("POSTGRES_USER", USER).withEnv("POSTGRES_PASSWORD", PASSWORD).withEnv("POSTGRES_DB", DB)
        .withFileSystemBind(CONFIG.toString(), "/etc/serms/postgres", BindMode.READ_ONLY)
        .withCreateContainerCmdModifier(c -> c.withEntrypoint("/etc/serms/postgres/replica-entrypoint.sh"))
        .withExposedPorts(5432)
        .waitingFor(Wait.forLogMessage(".*ready to accept read-only connections.*", 1)
            .withStartupTimeout(Duration.ofMinutes(2)));
    standby.start();
  }

  @AfterAll
  static void stop() {
    if (standby != null) standby.stop();
    if (primary != null) primary.stop();
    if (network != null) network.close();
  }

  static String standbyUrl() {
    return "jdbc:postgresql://" + standby.getHost() + ":" + standby.getMappedPort(5432) + "/" + DB;
  }

  static ReadReplica readReplica(String url) {
    return new ReadReplica(new NamedParameterJdbcTemplate(primaryDs), url, USER, PASSWORD, 2, 300,
        new StaticListableBeanFactory().getBeanProvider(io.micrometer.core.instrument.MeterRegistry.class));
  }

  static boolean inRecovery(NamedParameterJdbcTemplate jdbc) {
    return Boolean.TRUE.equals(jdbc.getJdbcTemplate().queryForObject("SELECT pg_is_in_recovery()", Boolean.class));
  }

  @Test
  void primaryWritesStreamToTheStandbyAndReportsReadThere() throws Exception {
    var replica = readReplica(standbyUrl());
    try {
      assertThat(replica.configured()).isTrue();
      assertThat(replica.usable()).as("caught-up hot standby").isTrue();
      assertThat(inRecovery(replica.jdbc())).as("report queries run on the standby").isTrue();

      String category = "Replica " + UUID.randomUUID();
      var write = new JdbcTemplate(primaryDs);
      write.update("INSERT INTO serms.equipment_category(name) VALUES (?)", category);
      var reports = new ReportRepository(replica);
      long deadline = System.currentTimeMillis() + 15_000;
      Integer seen = 0;
      while (System.currentTimeMillis() < deadline) {
        seen = replica.jdbc().getJdbcTemplate().queryForObject(
            "SELECT count(*) FROM serms.equipment_category WHERE name = ?", Integer.class, category);
        if (seen == 1) break;
        Thread.sleep(200);
      }
      assertThat(seen).as("streamed from the primary").isOne();
      assertThat(reports.reservationsByCategory(Instant.EPOCH, Instant.now())).isNotNull();
      assertThat(primary.execInContainer("psql", "-U", USER, "-d", DB, "-tAc",
              "SELECT count(*) FROM pg_stat_replication WHERE state = 'streaming'").getStdout().strip())
          .isEqualTo("1");
    } finally {
      replica.destroy();
    }
  }

  @Test
  void reportsFallBackToThePrimaryWhenTheReplicaIsUnreachable() {
    var replica = readReplica("jdbc:postgresql://127.0.0.1:1/" + DB);
    try {
      assertThat(replica.configured()).isTrue();
      assertThat(replica.usable()).isFalse();
      assertThat(inRecovery(replica.jdbc())).as("primary serves reports").isFalse();
    } finally {
      replica.destroy();
    }
  }

  @Test
  void withoutAReplicaUrlReportsUseThePrimary() {
    var replica = readReplica("");
    assertThat(replica.configured()).isFalse();
    assertThat(inRecovery(replica.jdbc())).isFalse();
  }
}
