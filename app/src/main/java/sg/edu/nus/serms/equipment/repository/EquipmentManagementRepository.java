package sg.edu.nus.serms.equipment.repository;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Duration;
import java.util.List;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import sg.edu.nus.serms.shared.domain.RecordNotFoundException;

/** Equipment management SQL; the service owns authorization, validation and transactions. */
@Repository
public class EquipmentManagementRepository {
  public record EquipmentRow(UUID equipmentId, String assetTag, String serialNumber,
      String name, String description, String category, String location, String condition,
      String status, boolean requiresApproval, String maxBorrowDuration, long version) {}

  private static final String COLUMNS = "equipment_id,asset_tag,serial_number,name,description,category,location,condition,status,requires_approval,EXTRACT(EPOCH FROM max_borrow_duration)::bigint AS max_seconds,version";
  private final JdbcTemplate jdbc;

  public EquipmentManagementRepository(JdbcTemplate jdbc) { this.jdbc = jdbc; }

  public List<EquipmentRow> list(int page, int size) {
    return jdbc.query("SELECT " + COLUMNS + " FROM serms.equipment ORDER BY lower(name),asset_tag LIMIT ? OFFSET ?",
        (rs, row) -> map(rs), size, (long) page * size);
  }

  public void register(UUID id, String assetTag, String serialNumber, String name, String description,
      String category, String location, String condition, boolean requiresApproval, Long maxSeconds) {
      jdbc.update("""
          INSERT INTO serms.equipment(equipment_id,asset_tag,serial_number,name,description,category,
              location,condition,requires_approval,max_borrow_duration)
          VALUES (?,?,?,?,?,?,?,?,?,CAST(? AS bigint) * interval '1 second')
          """, id, assetTag, serialNumber, name,
          description, category, location,
          condition, requiresApproval, maxSeconds);
  }

  public int update(UUID id, String assetTag, String serialNumber, String name, String description,
      String category, String location, String condition, boolean requiresApproval, Long maxSeconds,
      long expectedVersion) {
      return jdbc.update("""
          UPDATE serms.equipment SET asset_tag=?,serial_number=?,name=?,description=?,category=?,
              location=?,condition=?,requires_approval=?,max_borrow_duration=CAST(? AS bigint) * interval '1 second'
          WHERE equipment_id=? AND version=?
          """, assetTag, serialNumber, name,
          description, category, location,
          condition, requiresApproval, maxSeconds, id,
          expectedVersion);
  }

  public boolean activeLoan(UUID id) {
    return Boolean.TRUE.equals(jdbc.queryForObject("""
        SELECT EXISTS(SELECT 1 FROM serms.loan l JOIN serms.reservation r USING(reservation_id)
          WHERE r.equipment_id=? AND l.status='ACTIVE')
        """, Boolean.class, id));
  }

  public int retire(UUID id, long expectedVersion) {
    return jdbc.update("UPDATE serms.equipment SET status='RETIRED' WHERE equipment_id=? AND version=?",
        id, expectedVersion);
  }

  public List<String> categories() {
    return jdbc.queryForList("SELECT name FROM serms.equipment_category ORDER BY lower(name),name", String.class);
  }

  public void createCategory(String name) {
    jdbc.update("INSERT INTO serms.equipment_category(name) VALUES (?)", name);
  }

  public int renameCategory(String oldName, String newName) {
    return jdbc.update("UPDATE serms.equipment_category SET name=? WHERE name=?", newName, oldName);
  }

  public EquipmentRow locked(UUID id) {
    return jdbc.query("SELECT " + COLUMNS + " FROM serms.equipment WHERE equipment_id=? FOR UPDATE",
        (rs, row) -> map(rs), id).stream().findFirst().orElseThrow(RecordNotFoundException::new);
  }

  public EquipmentRow get(UUID id) {
    return jdbc.query("SELECT " + COLUMNS + " FROM serms.equipment WHERE equipment_id=?",
        (rs, row) -> map(rs), id).stream().findFirst().orElseThrow(RecordNotFoundException::new);
  }

  private static EquipmentRow map(ResultSet rs) throws SQLException {
    long seconds = rs.getLong("max_seconds");
    String duration = rs.wasNull() ? null : Duration.ofSeconds(seconds).toString();
    return new EquipmentRow(rs.getObject("equipment_id", UUID.class), rs.getString("asset_tag"),
        rs.getString("serial_number"), rs.getString("name"), rs.getString("description"),
        rs.getString("category"), rs.getString("location"), rs.getString("condition"),
        rs.getString("status"), rs.getBoolean("requires_approval"), duration, rs.getLong("version"));
  }

  public boolean activeManagementAccount(UUID id) {
    Boolean allowed = jdbc.queryForObject("""
        SELECT EXISTS(SELECT 1 FROM serms.app_user u JOIN serms.user_role ur USING(user_id)
          JOIN serms.role r USING(role_id) WHERE u.user_id=? AND u.account_status='ACTIVE'
          AND r.code IN ('CUSTODIAN','ADMIN'))
        """, Boolean.class, id);
    return Boolean.TRUE.equals(allowed);
  }

  public boolean categoryExists(String name) {
    return Boolean.TRUE.equals(jdbc.queryForObject(
        "SELECT EXISTS(SELECT 1 FROM serms.equipment_category WHERE name=?)", Boolean.class, name));
  }

  public void audit(UUID actor, String action, String entityType, UUID id, String summary) {
    jdbc.update("""
        INSERT INTO serms.audit_log(audit_id,actor_id,action,entity_type,entity_id,outcome,request_id,change_summary)
        VALUES (?,?,?,?,?,'SUCCESS',?,?)
        """, UUID.randomUUID(), actor, action,
        entityType,
        id, "equipment:" + UUID.randomUUID(), summary);
  }
}
