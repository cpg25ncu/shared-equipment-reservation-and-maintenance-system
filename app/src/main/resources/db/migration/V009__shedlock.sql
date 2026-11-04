-- Horizontal scaling (AD-02): ShedLock lets exactly one app replica run each @Scheduled job
-- (notification delivery, loan and collection reminder scans) at a time.
BEGIN;
CREATE TABLE serms.shedlock (
    name varchar(64) NOT NULL,
    lock_until timestamptz NOT NULL,
    locked_at timestamptz NOT NULL,
    locked_by varchar(255) NOT NULL,
    CONSTRAINT shedlock_pk PRIMARY KEY (name)
);
INSERT INTO serms.schema_version(version, description)
VALUES (9, 'ShedLock table for cluster-wide scheduled job locks');
COMMIT;
