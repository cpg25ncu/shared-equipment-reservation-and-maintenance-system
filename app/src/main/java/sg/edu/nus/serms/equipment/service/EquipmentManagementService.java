package sg.edu.nus.serms.equipment.service;

import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.UUID;
import org.springframework.dao.DataIntegrityViolationException;
import sg.edu.nus.serms.equipment.repository.EquipmentManagementRepository;
import sg.edu.nus.serms.equipment.repository.EquipmentManagementRepository.EquipmentRow;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import sg.edu.nus.serms.equipment.api.EquipmentManagementController.EquipmentInput;
import sg.edu.nus.serms.shared.domain.RecordNotFoundException;
import sg.edu.nus.serms.shared.security.SermsUserPrincipal;

@Service
@Transactional
public class EquipmentManagementService {
  public record ManagedEquipment(UUID equipmentId, String assetTag, String serialNumber,
      String name, String description, String category, String location, String condition,
      String status, boolean requiresApproval, String maxBorrowDuration, long version) {}

  private final EquipmentManagementRepository repository;
  public EquipmentManagementService(EquipmentManagementRepository repository) { this.repository = repository; }

  @Transactional(readOnly = true)
  @PreAuthorize("hasAnyRole('CUSTODIAN','ADMIN')")
  public List<ManagedEquipment> list(int page, int size) {
    actor();
    if (page < 0 || page > 100000 || size < 1 || size > 100)
      throw new EquipmentManagementException(400, "page", "Choose a valid page and size.");
    return repository.list(page, size).stream().map(EquipmentManagementService::view)
        .collect(java.util.stream.Collectors.toCollection(java.util.ArrayList::new));
  }

  @PreAuthorize("hasAnyRole('CUSTODIAN','ADMIN')")
  public ManagedEquipment register(EquipmentInput input) {
    UUID actor = actor();
    checkCategory(input.category());
    UUID id = UUID.randomUUID();
    try {
      repository.register(id, input.assetTag().strip(), optional(input.serialNumber()), input.name().strip(),
          optional(input.description()), input.category().strip(), input.location().strip(),
          input.condition(), input.requiresApproval(), seconds(input.maxBorrowDuration()));
    } catch (DataIntegrityViolationException e) { throw uniqueConflict(e); }
    audit(actor, "EQUIPMENT_REGISTER", id, "assetTag=" + input.assetTag().strip());
    return get(id);
  }

  @PreAuthorize("hasAnyRole('CUSTODIAN','ADMIN')")
  public ManagedEquipment update(UUID id, EquipmentInput input) {
    UUID actor = actor();
    if (input.expectedVersion() == null)
      throw new EquipmentManagementException(400, "expectedVersion", "The current equipment version is required.");
    var before = locked(id);
    if (before.status().equals("RETIRED"))
      throw new EquipmentManagementException(409, null, "Retired equipment cannot be changed.");
    checkCategory(input.category());
    try {
      int count = repository.update(id, input.assetTag().strip(), optional(input.serialNumber()), input.name().strip(),
          optional(input.description()), input.category().strip(), input.location().strip(),
          input.condition(), input.requiresApproval(), seconds(input.maxBorrowDuration()), input.expectedVersion());
      if (count != 1) throw new EquipmentManagementException(409, "expectedVersion", "Equipment changed. Refresh before saving.");
    } catch (DataIntegrityViolationException e) { throw uniqueConflict(e); }
    var updated = get(id);
    audit(actor, "EQUIPMENT_UPDATE", id, updateSummary(before, updated));
    return updated;
  }

  @PreAuthorize("hasAnyRole('CUSTODIAN','ADMIN')")
  public ManagedEquipment retire(UUID id, long expectedVersion) {
    UUID actor = actor();
    var before = locked(id);
    if (before.status().equals("RETIRED"))
      throw new EquipmentManagementException(409, null, "Equipment is already retired.");
    if (before.status().equals("ON_LOAN") || repository.activeLoan(id))
      throw new EquipmentManagementException(409, null, "Return the active loan before retiring this equipment.");
    if (repository.retire(id, expectedVersion) != 1)
      throw new EquipmentManagementException(409, "expectedVersion", "Equipment changed. Refresh before retiring.");
    audit(actor, "EQUIPMENT_RETIRE", id, "status=" + before.status() + " -> RETIRED");
    return get(id);
  }

  @Transactional(readOnly = true)
  @PreAuthorize("hasAnyRole('CUSTODIAN','ADMIN')")
  public List<String> categories() {
    actor();
    return repository.categories();
  }

  @PreAuthorize("hasAnyRole('CUSTODIAN','ADMIN')")
  public List<String> createCategory(String name) {
    UUID actor = actor();
    name = categoryName(name);
    try { repository.createCategory(name); }
    catch (DataIntegrityViolationException e) {
      throw new EquipmentManagementException(409, "name", "This category already exists.");
    }
    audit(actor, "EQUIPMENT_CATEGORY_CREATE", categoryId(name), "name=" + name);
    return categories();
  }

  @PreAuthorize("hasAnyRole('CUSTODIAN','ADMIN')")
  public List<String> renameCategory(String oldName, String newName) {
    UUID actor = actor();
    newName = categoryName(newName);
    if (oldName.equals(newName)) return categories();
    try {
      if (repository.renameCategory(oldName, newName) != 1)
        throw new RecordNotFoundException();
    } catch (DataIntegrityViolationException e) {
      throw new EquipmentManagementException(409, "name", "This category already exists.");
    }
    audit(actor, "EQUIPMENT_CATEGORY_RENAME", categoryId(oldName), "name=" + oldName + " -> " + newName);
    return categories();
  }

  // Compare persisted, normalized values and allow only equipment master-data fields.
  private static String updateSummary(ManagedEquipment before, ManagedEquipment after) {
    var changes = new ArrayList<String>();
    changed(changes, "assetTag", before.assetTag(), after.assetTag());
    changed(changes, "serialNumber", before.serialNumber(), after.serialNumber());
    changed(changes, "name", before.name(), after.name());
    changed(changes, "description", before.description(), after.description());
    changed(changes, "category", before.category(), after.category());
    changed(changes, "location", before.location(), after.location());
    changed(changes, "condition", before.condition(), after.condition());
    changed(changes, "requiresApproval", before.requiresApproval(), after.requiresApproval());
    changed(changes, "maxBorrowDuration", before.maxBorrowDuration(), after.maxBorrowDuration());
    return String.join("; ", changes);
  }

  private static void changed(List<String> changes, String field, Object before, Object after) {
    if (!Objects.equals(before, after)) changes.add(field + "=" + before + " -> " + after);
  }

  private ManagedEquipment locked(UUID id) {
    return view(repository.locked(id));
  }

  private ManagedEquipment get(UUID id) {
    return view(repository.get(id));
  }

  private static ManagedEquipment view(EquipmentRow row) {
    return new ManagedEquipment(row.equipmentId(), row.assetTag(), row.serialNumber(), row.name(),
        row.description(), row.category(), row.location(), row.condition(), row.status(),
        row.requiresApproval(), row.maxBorrowDuration(), row.version());
  }

  private UUID actor() {
    var authentication = SecurityContextHolder.getContext().getAuthentication();
    if (authentication == null || !(authentication.getPrincipal() instanceof SermsUserPrincipal principal))
      throw new AccessDeniedException("Authenticated management account required");
    UUID id = principal.getUserId();
    Boolean allowed = repository.activeManagementAccount(id);
    if (!Boolean.TRUE.equals(allowed)) throw new AccessDeniedException("Active management account required");
    return id;
  }

  private void checkCategory(String name) {
    if (!repository.categoryExists(name.strip()))
      throw new EquipmentManagementException(400, "category", "Choose an existing category.");
  }

  // Rename carries the current name in the URL path, where the security firewall rejects encoded
  // '/', '\', '%' and ';', and browsers resolve a "." or ".." segment away. A category with such a
  // name could never be renamed, so refuse it here.
  private static String categoryName(String name) {
    String value = name.strip();
    if (value.equals(".") || value.equals("..") || value.chars().anyMatch(c -> "/\\%;".indexOf(c) >= 0))
      throw new EquipmentManagementException(400, "name", "Category names cannot be . or .. or contain /, \\, % or ;.");
    return value;
  }

  private static String optional(String value) {
    return value == null || value.isBlank() ? null : value.strip();
  }

  private static Long seconds(String value) {
    if (value == null || value.isBlank()) return null;
    try {
      Duration duration = Duration.parse(value);
      if (duration.isNegative() || duration.isZero() || duration.getNano() != 0)
        throw new IllegalArgumentException();
      return duration.getSeconds();
    } catch (RuntimeException e) {
      throw new EquipmentManagementException(400, "maxBorrowDuration", "Enter a positive ISO-8601 duration in whole seconds.");
    }
  }

  private static EquipmentManagementException uniqueConflict(DataIntegrityViolationException e) {
    String detail = e.getMostSpecificCause().getMessage();
    if (detail != null && detail.contains("equipment_serial_number_key"))
      return new EquipmentManagementException(409, "serialNumber", "This serial number is already registered.");
    if (detail != null && detail.contains("equipment_asset_tag_key"))
      return new EquipmentManagementException(409, "assetTag", "This asset tag is already registered.");
    throw e;
  }

  private static UUID categoryId(String name) {
    return UUID.nameUUIDFromBytes(("equipment-category:" + name).getBytes(StandardCharsets.UTF_8));
  }

  private void audit(UUID actor, String action, UUID id, String summary) {
    repository.audit(actor, action, action.startsWith("EQUIPMENT_CATEGORY") ? "EquipmentCategory" : "Equipment",
        id, summary);
  }
}
