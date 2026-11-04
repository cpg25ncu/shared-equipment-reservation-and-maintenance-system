package sg.edu.nus.serms.shared.persistence;

import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import io.micrometer.core.instrument.Gauge;
import io.micrometer.core.instrument.MeterRegistry;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.DisposableBean;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Read-only access for reporting (report AD-18).
 *
 * <p>When {@code serms.datasource.replica.url} is set, report queries run on the PostgreSQL
 * streaming replica ({@code db-replica} in compose.yaml), so long aggregations never compete with
 * bookings on the primary. Every replica of the app probes the standby on its own (this is
 * per-instance routing state, not a cluster job): while the standby is unreachable, has been
 * promoted, or replays more than {@code max-lag-seconds} behind, reports fall back to the primary.
 * The replica pool is not a Spring {@code DataSource} bean, so Boot's primary datasource, JPA and
 * Flyway configuration stay unchanged.
 */
@Component
public class ReadReplica implements DisposableBean {
  private static final Logger log = LoggerFactory.getLogger(ReadReplica.class);
  static final String LAG_SQL =
      "SELECT pg_is_in_recovery(), CASE WHEN pg_last_wal_receive_lsn() = pg_last_wal_replay_lsn()"
          + " THEN 0 ELSE COALESCE(EXTRACT(EPOCH FROM now() - pg_last_xact_replay_timestamp()), 0)"
          + " END";

  private final NamedParameterJdbcTemplate primary;
  private final NamedParameterJdbcTemplate replicaJdbc;
  private final HikariDataSource replica;
  private final double maxLagSeconds;
  private volatile boolean usable;
  private volatile double lagSeconds = Double.NaN;

  public ReadReplica(
      NamedParameterJdbcTemplate primary,
      @Value("${serms.datasource.replica.url:}") String url,
      @Value("${serms.datasource.replica.username:${spring.datasource.username:}}") String username,
      @Value("${serms.datasource.replica.password:${spring.datasource.password:}}") String password,
      @Value("${serms.datasource.replica.maximum-pool-size:4}") int poolSize,
      @Value("${serms.datasource.replica.max-lag-seconds:300}") double maxLagSeconds,
      ObjectProvider<MeterRegistry> meters) {
    this.primary = primary;
    this.maxLagSeconds = maxLagSeconds;
    if (url == null || url.isBlank()) {
      this.replica = null;
      this.replicaJdbc = null;
      return;
    }
    var config = new HikariConfig();
    config.setPoolName("serms-read-replica");
    config.setJdbcUrl(url);
    config.setUsername(username);
    config.setPassword(password);
    config.setReadOnly(true);
    config.setMaximumPoolSize(poolSize);
    config.setConnectionTimeout(2000);
    config.setConnectionInitSql("SET search_path TO serms, public");
    // Start even if the replica is still cloning; the probe enables it once it answers.
    config.setInitializationFailTimeout(-1);
    this.replica = new HikariDataSource(config);
    this.replicaJdbc = new NamedParameterJdbcTemplate(replica);
    meters.ifAvailable(
        registry -> {
          Gauge.builder("serms.read.replica.in.use", this, r -> r.usable ? 1 : 0)
              .description("1 while report queries are served by the streaming replica")
              .register(registry);
          Gauge.builder("serms.read.replica.lag", this, r -> r.lagSeconds)
              .baseUnit("seconds")
              .description("Replay lag of the streaming replica as seen by this app replica")
              .register(registry);
        });
    probe();
    log.info("Report queries use the read replica {} when it is healthy", url.replaceAll("//[^@/]*@", "//"));
  }

  /** Template for read-only report queries: the healthy replica, otherwise the primary. */
  public NamedParameterJdbcTemplate jdbc() {
    return usable ? replicaJdbc : primary;
  }

  public boolean configured() {
    return replica != null;
  }

  public boolean usable() {
    return usable;
  }

  @Scheduled(
      fixedDelayString = "${serms.datasource.replica.probe-ms:15000}",
      initialDelayString = "${serms.datasource.replica.probe-ms:15000}")
  public void probe() {
    if (replica == null) return;
    boolean before = usable;
    try {
      var row =
          replicaJdbc.getJdbcTemplate()
              .queryForMap(LAG_SQL);
      boolean standby = Boolean.TRUE.equals(row.get("pg_is_in_recovery"));
      lagSeconds = ((Number) row.values().toArray()[1]).doubleValue();
      usable = standby && lagSeconds <= maxLagSeconds;
    } catch (RuntimeException e) {
      lagSeconds = Double.NaN;
      usable = false;
    }
    if (before != usable) {
      if (usable) log.info("Read replica healthy (lag {} s): reports use the replica", lagSeconds);
      else log.warn("Read replica unavailable or lagging (lag {} s): reports use the primary", lagSeconds);
    }
  }

  @Override
  public void destroy() {
    if (replica != null) replica.close();
  }
}
