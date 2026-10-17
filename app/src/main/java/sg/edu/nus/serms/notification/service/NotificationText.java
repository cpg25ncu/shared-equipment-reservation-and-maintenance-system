package sg.edu.nus.serms.notification.service;

import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Locale;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/** Resolves display names from persisted business data; events remain identity-only contracts. */
@Component
public class NotificationText {
  // English month names whatever the server's default locale: without it a JVM running in a
  // Chinese locale wrote "17 10月 2026". Built per instance, so a test can prove the locale is fixed.
  private final DateTimeFormatter time = DateTimeFormatter.ofPattern("d MMM yyyy, HH:mm 'SGT'", Locale.ENGLISH)
      .withZone(ZoneId.of("Asia/Singapore"));
  private final JdbcTemplate jdbc;

  public NotificationText(JdbcTemplate jdbc) { this.jdbc = jdbc; }

  public String time(Instant instant) { return time.format(instant); }

  public String equipment(UUID equipmentId) {
    return jdbc.queryForObject("SELECT name FROM serms.equipment WHERE equipment_id=?", String.class, equipmentId);
  }

  public String reservationEquipment(UUID reservationId) {
    return jdbc.queryForObject("""
        SELECT e.name FROM serms.reservation r JOIN serms.equipment e USING (equipment_id)
        WHERE r.reservation_id=?
        """, String.class, reservationId);
  }
}
