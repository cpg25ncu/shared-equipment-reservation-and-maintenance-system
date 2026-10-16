package sg.edu.nus.serms.loan.service;

import java.sql.Timestamp;
import java.time.Clock;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import sg.edu.nus.serms.loan.repository.LoanRepository;
import sg.edu.nus.serms.loan.domain.*;
import sg.edu.nus.serms.maintenance.domain.FaultCategory;
import sg.edu.nus.serms.maintenance.domain.MaintenancePriority;
import sg.edu.nus.serms.maintenance.service.MaintenanceService;
import sg.edu.nus.serms.shared.domain.RecordNotFoundException;
import sg.edu.nus.serms.shared.security.SermsUserPrincipal;

@Service
@Transactional
public class LoanService {
  /** Fault fields for a damaged return (#21); proposed by the UC04 owner, pending UC03 confirmation. */
  static final FaultCategory DAMAGED_RETURN_CATEGORY = FaultCategory.PHYSICAL_DAMAGE;
  static final MaintenancePriority DAMAGED_RETURN_PRIORITY = MaintenancePriority.HIGH;
  private final LoanRepository repository;
  private final Clock clock;
  private final MaintenanceService maintenance;
  private final ApplicationEventPublisher events;

  public LoanService(LoanRepository repository, @Qualifier("clock") Clock clock,
      MaintenanceService maintenance, ApplicationEventPublisher events) {
    this.repository = repository; this.clock = clock; this.maintenance = maintenance; this.events = events;
  }

  @PreAuthorize("hasRole('CUSTODIAN')")
  public LoanView checkout(UUID reservationId, UUID borrowerId, long expectedVersion,
      boolean identityConfirmed) {
    if (!identityConfirmed || borrowerId == null || expectedVersion < 0)
      throw new IllegalArgumentException("Confirm the borrower's identity and reservation version");
    UUID equipmentId = repository.equipmentId(reservationId);
    var state = repository.lockEquipment(equipmentId);
    var rows = repository.lockReservation(reservationId);
    if (rows.isEmpty()) throw new RecordNotFoundException();
    var r = rows.get(0);
    UUID actor = requireActor();
    if (!borrowerId.equals(r.get("requester_id")))
      throw new LoanConflictException("The borrower does not match this reservation.");
    requireActiveBorrower(borrowerId);
    if (((Number) r.get("version")).longValue() != expectedVersion)
      throw new LoanConflictException("The reservation changed. Refresh before handing over equipment.");
    Instant now = now();
    Instant start = ((Timestamp) r.get("start_at")).toInstant();
    Instant due = ((Timestamp) r.get("end_at")).toInstant();
    if (!"CONFIRMED".equals(r.get("status")) || now.isBefore(start) || !now.isBefore(due))
      throw new LoanConflictException("Checkout requires a confirmed reservation within its time window.");
    if (!state.permitsCheckout() || repository.activeMaintenance(equipmentId) || repository.activeLoan(equipmentId))
      throw new LoanConflictException("Equipment is unavailable for physical handover.");
    UUID loanId = UUID.randomUUID();
    repository.insertLoan(loanId, reservationId, actor, now, due);
    if (repository.fulfillReservation(reservationId, expectedVersion) != 1) throw new LoanConflictException("Reservation changed.");
    setEquipment(equipmentId, state, EquipmentLoanState.ON_LOAN);
    repository.audit(actor, "LOAN_CHECKOUT", loanId, now, "Confirmed physical handover to " + borrowerId);
    events.publishEvent(new LoanEvent("CHECKED_OUT", loanId, reservationId, equipmentId,
        borrowerId, actor, due, now, false, null, null));
    return load(loanId, now);
  }

  @PreAuthorize("hasRole('CUSTODIAN')")
  public LoanView receive(UUID loanId, long expectedVersion, String condition, String note) {
    if (expectedVersion < 0 || !("GOOD".equals(condition) || "DAMAGED".equals(condition))
        || (note != null && note.length() > 2000)
        || ("DAMAGED".equals(condition) && (note == null || note.isBlank())))
      throw new IllegalArgumentException("Damage requires a description; choose GOOD or DAMAGED");
    UUID reservationId = repository.reservationId(loanId);
    UUID equipmentId = repository.equipmentId(reservationId);
    var state = repository.lockEquipment(equipmentId);
    repository.lockReservationReference(reservationId);
    repository.lockLoan(loanId);
    UUID actor = requireActor();
    Instant now = now();
    var before = load(loanId, now);
    if (!before.status().equals("ACTIVE") || before.version() != expectedVersion)
      throw new LoanConflictException("This loan was returned or changed. Refresh before receiving it.");
    if (now.isBefore(before.checkedOutAt())) throw new LoanConflictException("Return cannot precede checkout.");
    if (repository.returnLoan(actor, now, condition, note == null ? null : note.strip(), loanId, expectedVersion) != 1)
      throw new LoanConflictException("Loan changed.");
    UUID caseId = null;
    // A retired item can still be physically received; an OPEN damage case preserves evidence.
    // MaintenanceService rejects new faults on retired items, so create that case here atomically.
    if ("DAMAGED".equals(condition)) {
      if (state == EquipmentLoanState.RETIRED) {
        caseId = UUID.randomUUID();
        repository.insertRetiredDamageCase(caseId, equipmentId, actor, loanId, note.strip(), now,
            DAMAGED_RETURN_CATEGORY.name(), DAMAGED_RETURN_PRIORITY.name());
        repository.auditCase(actor, caseId, now, note.strip());
      } else {
        caseId = maintenance.reportFault(equipmentId, actor, note.strip(), loanId,
            DAMAGED_RETURN_CATEGORY, DAMAGED_RETURN_PRIORITY).maintenanceCaseId();
      }
    }
    // Reload state: reportFault may already have changed it.
    state = repository.lockEquipment(equipmentId);
    setEquipment(equipmentId, state, state.afterReturn(repository.activeMaintenance(equipmentId), repository.activeLoan(equipmentId)));
    boolean late = now.isAfter(before.dueAt());
    repository.audit(actor, "LOAN_RETURN", loanId, now, "condition=" + condition + "; late=" + late + "; maintenanceCase=" + caseId);
    events.publishEvent(new LoanEvent("RETURNED", loanId, reservationId, equipmentId,
        before.borrowerId(), actor, before.dueAt(), now, late, condition, caseId));
    return load(loanId, now);
  }

  @Transactional(readOnly = true)
  @PreAuthorize("hasAnyRole('BORROWER','CUSTODIAN')")
  public List<LoanView> list(boolean activeOnly, int page, int size, String q) {
    if (page < 0 || page > 100000 || size < 1 || size > 100) throw new IllegalArgumentException("Invalid page");
    UUID actor = requireReader();
    boolean custodian = repository.activeRole(actor, "CUSTODIAN");
    String pattern = searchPattern(q);
    Instant now = now();
    return repository.list(activeOnly, actor, custodian, page, size, pattern, now);
  }

  private LoanView load(UUID id, Instant now) {
    return repository.load(id, now);
  }

  @Transactional(readOnly = true)
  @PreAuthorize("hasRole('CUSTODIAN')")
  public List<CheckoutCandidate> checkoutQueue(int page, int size, String q) {
    if (page < 0 || page > 100000 || size < 1 || size > 100) throw new IllegalArgumentException("Invalid page");
    UUID actor = requireReader();
    if (!repository.activeRole(actor, "CUSTODIAN")) throw new AccessDeniedException("Active custodian required");
    return repository.checkoutQueue(page, size, now(), searchPattern(q));
  }

  private static String searchPattern(String q) {
    if (q == null || q.isBlank()) return null;
    String trimmed = q.strip();
    if (trimmed.length() > 100) throw new IllegalArgumentException("Search must have at most 100 characters");
    return "%" + trimmed.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_") + "%";
  }

  @Transactional(readOnly = true)
  @PreAuthorize("hasAnyRole('BORROWER','CUSTODIAN')")
  public LoanView get(UUID id) {
    UUID actor = requireReader();
    var loan = load(id, now());
    if (!repository.activeRole(actor,"CUSTODIAN") && !loan.borrowerId().equals(actor))
      throw new RecordNotFoundException();
    return loan;
  }

  private void setEquipment(UUID id, EquipmentLoanState before, EquipmentLoanState after) {
    if (before != after) repository.setEquipment(id, after);
  }
  private Instant now() { return clock.instant().truncatedTo(ChronoUnit.MICROS); }
  private UUID principal() {
    var auth = SecurityContextHolder.getContext().getAuthentication();
    if (auth == null || !auth.isAuthenticated() || !(auth.getPrincipal() instanceof SermsUserPrincipal me))
      throw new AccessDeniedException("Authenticated session required");
    return me.getUserId();
  }
  private UUID requireActor() {
    UUID id = principal();
    if (!repository.lockedActiveRole(id, "CUSTODIAN")) throw new AccessDeniedException("Active custodian required");
    return id;
  }
  private UUID requireReader() {
    UUID id = principal();
    if (!repository.activeRole(id,"BORROWER") && !repository.activeRole(id,"CUSTODIAN")) throw new AccessDeniedException("Active account required");
    return id;
  }
  private void requireActiveBorrower(UUID id) {
    if (!repository.lockedActiveRole(id,"BORROWER")) throw new LoanConflictException("The borrower is inactive or has no BORROWER role.");
  }
}
