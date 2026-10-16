package sg.edu.nus.serms.loan.repository;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import sg.edu.nus.serms.loan.domain.CheckoutCandidate;
import sg.edu.nus.serms.loan.domain.EquipmentLoanState;
import sg.edu.nus.serms.loan.domain.LoanView;
import sg.edu.nus.serms.shared.domain.RecordNotFoundException;

/** UC03 persistence; locks and writes participate in the calling service transaction. */
@Repository
public class LoanRepository {
  private final JdbcTemplate jdbc;

  public LoanRepository(JdbcTemplate jdbc) { this.jdbc = jdbc; }

  private static final String VIEW = """
      SELECT l.*, r.equipment_id, r.requester_id, e.name AS equipment_name, e.asset_tag,
             u.display_name AS borrower_name
      FROM serms.loan l JOIN serms.reservation r USING(reservation_id)
      JOIN serms.equipment e USING(equipment_id)
      JOIN serms.app_user u ON u.user_id=r.requester_id
      """;

  public UUID equipmentId(UUID reservationId) {
    return reference("SELECT equipment_id FROM serms.reservation WHERE reservation_id=?", reservationId);
  }

  public UUID reservationId(UUID loanId) {
    return reference("SELECT reservation_id FROM serms.loan WHERE loan_id=?", loanId);
  }

  public List<Map<String, Object>> lockReservation(UUID reservationId) {
    return jdbc.queryForList("SELECT * FROM serms.reservation WHERE reservation_id=? FOR UPDATE", reservationId);
  }

  public void lockReservationReference(UUID reservationId) {
    jdbc.queryForList("SELECT reservation_id FROM serms.reservation WHERE reservation_id=? FOR UPDATE", reservationId);
  }

  public void lockLoan(UUID loanId) {
    jdbc.queryForList("SELECT loan_id FROM serms.loan WHERE loan_id=? FOR UPDATE", loanId);
  }

  public void insertLoan(UUID loanId, UUID reservationId, UUID actor, Instant now, Instant due) {
    jdbc.update("""
        INSERT INTO serms.loan(loan_id,reservation_id,checkout_by,checked_out_at,due_at,status)
        VALUES (?,?,?,?,?,'ACTIVE')
        """, loanId, reservationId, actor, Timestamp.from(now), Timestamp.from(due));
  }

  public int fulfillReservation(UUID reservationId, long expectedVersion) {
    return jdbc.update("UPDATE serms.reservation SET status='FULFILLED' WHERE reservation_id=? AND version=?",
        reservationId, expectedVersion);
  }

  public int returnLoan(UUID actor, Instant now, String condition, String note, UUID loanId, long expectedVersion) {
    return jdbc.update("""
        UPDATE serms.loan SET status='RETURNED',return_by=?,returned_at=?,return_condition=?,return_note=?
        WHERE loan_id=? AND version=? AND status='ACTIVE'
        """, actor, Timestamp.from(now), condition, note, loanId, expectedVersion);
  }

  public void insertRetiredDamageCase(UUID caseId, UUID equipmentId, UUID actor, UUID loanId,
      String note, Instant now, String category, String priority) {
        jdbc.update("""
            INSERT INTO serms.maintenance_case(maintenance_case_id,equipment_id,reported_by,loan_id,
                fault_description,reported_at,fault_category,priority) VALUES (?,?,?,?,?,?,?,?)
            """, caseId, equipmentId, actor, loanId, note, Timestamp.from(now),
            category, priority);
  }

  public List<LoanView> list(boolean activeOnly, UUID actor, boolean custodian, int page, int size,
      String pattern, Instant now) {
    String where = " WHERE (?=false OR l.status='ACTIVE')";
    if (!custodian) where += " AND r.requester_id=?";
    if (pattern != null) where += " AND (r.reservation_id::text ILIKE ? ESCAPE '\\' OR u.display_name ILIKE ? ESCAPE '\\' OR u.email ILIKE ? ESCAPE '\\' OR e.asset_tag ILIKE ? ESCAPE '\\')";
    String sql = VIEW + where + " ORDER BY l.checked_out_at DESC,l.loan_id LIMIT ? OFFSET ?";
    var args = new java.util.ArrayList<Object>();
    args.add(activeOnly);
    if (!custodian) args.add(actor);
    if (pattern != null) for (int i = 0; i < 4; i++) args.add(pattern);
    args.add(size); args.add(page * size);
    return jdbc.query(sql, (r, n) -> map(r, now), args.toArray());
  }

  public LoanView load(UUID id, Instant now) {
    return jdbc.query(VIEW + " WHERE l.loan_id=?", (r, n) -> map(r, now), id)
        .stream().findFirst().orElseThrow(RecordNotFoundException::new);
  }

  public List<CheckoutCandidate> checkoutQueue(int page, int size, Instant now, String pattern) {
    String sql = """
        SELECT r.*,e.name,e.asset_tag,u.display_name FROM serms.reservation r
        JOIN serms.equipment e USING(equipment_id)
        JOIN serms.app_user u ON u.user_id=r.requester_id
        WHERE r.status='CONFIRMED' AND r.end_at>?
        """;
    var args = new java.util.ArrayList<Object>();
    args.add(Timestamp.from(now));
    if (pattern != null) {
      sql += " AND (r.reservation_id::text ILIKE ? ESCAPE '\\' OR u.display_name ILIKE ? ESCAPE '\\' OR u.email ILIKE ? ESCAPE '\\' OR e.asset_tag ILIKE ? ESCAPE '\\')";
      for (int i = 0; i < 4; i++) args.add(pattern);
    }
    sql += " ORDER BY r.start_at,r.reservation_id LIMIT ? OFFSET ?";
    args.add(size); args.add(page * size);
    return jdbc.query(sql, (r,n) -> new CheckoutCandidate(r.getObject("reservation_id",UUID.class),
        r.getObject("equipment_id",UUID.class),r.getString("name"),r.getString("asset_tag"),r.getObject("requester_id",UUID.class),
        r.getString("display_name"),r.getTimestamp("start_at").toInstant(),r.getTimestamp("end_at").toInstant(),
        r.getLong("version")),args.toArray());
  }

  private static LoanView map(java.sql.ResultSet r, Instant now) throws java.sql.SQLException {
    var returned = r.getTimestamp("returned_at");
    Instant due = r.getTimestamp("due_at").toInstant();
    return new LoanView(r.getObject("loan_id",UUID.class), r.getObject("reservation_id",UUID.class),
        r.getObject("equipment_id",UUID.class), r.getString("equipment_name"), r.getString("asset_tag"),
        r.getObject("requester_id",UUID.class), r.getString("borrower_name"),
        r.getObject("checkout_by",UUID.class), r.getObject("return_by",UUID.class),
        r.getTimestamp("checked_out_at").toInstant(), due, returned == null ? null : returned.toInstant(),
        r.getString("status"), r.getString("return_condition"), r.getString("return_note"), r.getLong("version"),
        (returned == null ? now : returned.toInstant()).isAfter(due));
  }

  private UUID reference(String sql, UUID id) {
    return jdbc.query(sql, (r,n) -> r.getObject(1,UUID.class), id).stream().findFirst()
        .orElseThrow(RecordNotFoundException::new);
  }
  public EquipmentLoanState lockEquipment(UUID id) {
    return jdbc.query("SELECT status FROM serms.equipment WHERE equipment_id=? FOR UPDATE",
        (r,n) -> EquipmentLoanState.valueOf(r.getString(1)), id).stream().findFirst()
        .orElseThrow(RecordNotFoundException::new);
  }
  public boolean activeMaintenance(UUID id) {
    return Boolean.TRUE.equals(jdbc.queryForObject("SELECT EXISTS(SELECT 1 FROM serms.maintenance_case WHERE equipment_id=? AND status IN ('OPEN','ASSIGNED','IN_PROGRESS'))", Boolean.class,id));
  }
  public boolean activeLoan(UUID id) {
    return Boolean.TRUE.equals(jdbc.queryForObject("SELECT EXISTS(SELECT 1 FROM serms.loan l JOIN serms.reservation r USING(reservation_id) WHERE r.equipment_id=? AND l.status='ACTIVE')",Boolean.class,id));
  }
  public void setEquipment(UUID id, EquipmentLoanState after) {
    jdbc.update("UPDATE serms.equipment SET status=? WHERE equipment_id=?", after.name(), id);
  }
  public boolean activeRole(UUID id, String role) {
    return Boolean.TRUE.equals(jdbc.queryForObject("""
        SELECT EXISTS(SELECT 1 FROM serms.app_user u JOIN serms.user_role ur USING(user_id)
        JOIN serms.role r USING(role_id) WHERE u.user_id=? AND u.account_status='ACTIVE' AND r.code=?)
        """, Boolean.class,id,role));
  }
  public boolean lockedActiveRole(UUID id, String role) {
    return !jdbc.queryForList("""
        SELECT u.user_id FROM serms.app_user u JOIN serms.user_role ur USING(user_id)
        JOIN serms.role r USING(role_id) WHERE u.user_id=? AND u.account_status='ACTIVE' AND r.code=?
        FOR SHARE OF u,ur
        """,id,role).isEmpty();
  }
  public void audit(UUID actor, String action, UUID id, Instant now, String summary) {
    jdbc.update("""
        INSERT INTO serms.audit_log(audit_id,actor_id,action,entity_type,entity_id,outcome,request_id,change_summary,occurred_at)
        VALUES (?,?,?,'Loan',?,'SUCCESS',?,?,?)
        """, UUID.randomUUID(), actor, action, id, "loan:" + UUID.randomUUID(), summary, Timestamp.from(now));
  }
  public void auditCase(UUID actor, UUID id, Instant now, String note) {
    jdbc.update("""
        INSERT INTO serms.audit_log(audit_id,actor_id,action,entity_type,entity_id,outcome,request_id,change_summary,occurred_at)
        VALUES (?,?,'MAINTENANCE_REPORT_FAULT','MaintenanceCase',?,'SUCCESS',?,?,?)
        """,UUID.randomUUID(),actor,id,"loan-damage:" + UUID.randomUUID(),note,Timestamp.from(now));
  }
}
