package sg.edu.nus.serms.shared.config;

import javax.sql.DataSource;
import net.javacrumbs.shedlock.core.LockProvider;
import net.javacrumbs.shedlock.provider.jdbctemplate.JdbcTemplateLockProvider;
import net.javacrumbs.shedlock.spring.annotation.EnableSchedulerLock;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.JdbcTemplate;

/**
 * Cluster-wide locks for {@code @Scheduled} jobs (report AD-02). With several app replicas behind
 * the load balancer every replica schedules the same jobs; each job method also carries
 * {@code @SchedulerLock}, so only the replica that inserts or updates the lock row runs it.
 * Lock times use the database clock, so replica clock drift cannot overlap two runs.
 */
@Configuration(proxyBeanMethods = false)
@EnableSchedulerLock(defaultLockAtMostFor = "PT5M")
public class SchedulerLockConfig {

  @Bean
  LockProvider lockProvider(
      DataSource dataSource, @Value("${serms.scheduler.lock-table:serms.shedlock}") String table) {
    return new JdbcTemplateLockProvider(
        JdbcTemplateLockProvider.Configuration.builder()
            .withJdbcTemplate(new JdbcTemplate(dataSource))
            .withTableName(table)
            .usingDbTime()
            .build());
  }
}
