-- Horizontal scaling (AD-02): ShedLock lets exactly one app replica run each @Scheduled job
-- (notification delivery, loan and collection reminder scans) at a time.
CREATE TABLE serms.shedlock (
    name varchar(64) NOT NULL,
    lock_until timestamptz NOT NULL,
    locked_at timestamptz NOT NULL,
    locked_by varchar(255) NOT NULL,
    CONSTRAINT shedlock_pk PRIMARY KEY (name)
);
