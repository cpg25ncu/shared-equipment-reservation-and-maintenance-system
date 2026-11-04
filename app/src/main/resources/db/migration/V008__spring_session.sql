-- Horizontal scaling (AD-02, AD-08): HTTP sessions live in PostgreSQL so any app replica can
-- serve any request. Layout follows Spring Session JDBC's schema-postgresql.sql; the application
-- never creates it (spring.session.jdbc.initialize-schema=never). Expired rows are deleted by
-- Spring Session's cleanup job; the DELETE is idempotent, so every replica may run it.
BEGIN;
CREATE TABLE serms.spring_session (
    primary_id char(36) NOT NULL,
    session_id char(36) NOT NULL,
    creation_time bigint NOT NULL,
    last_access_time bigint NOT NULL,
    max_inactive_interval int NOT NULL,
    expiry_time bigint NOT NULL,
    principal_name varchar(100),
    CONSTRAINT spring_session_pk PRIMARY KEY (primary_id)
);
CREATE UNIQUE INDEX spring_session_ix1 ON serms.spring_session (session_id);
CREATE INDEX spring_session_ix2 ON serms.spring_session (expiry_time);
CREATE INDEX spring_session_ix3 ON serms.spring_session (principal_name);

CREATE TABLE serms.spring_session_attributes (
    session_primary_id char(36) NOT NULL,
    attribute_name varchar(200) NOT NULL,
    attribute_bytes bytea NOT NULL,
    CONSTRAINT spring_session_attributes_pk PRIMARY KEY (session_primary_id, attribute_name),
    CONSTRAINT spring_session_attributes_fk FOREIGN KEY (session_primary_id)
        REFERENCES serms.spring_session (primary_id) ON DELETE CASCADE
);
INSERT INTO serms.schema_version(version, description)
VALUES (8, 'Spring Session JDBC tables for horizontally scaled app replicas');
COMMIT;
