-- Phase 1 schema changes. The server applies these automatically at startup (db/schema.js).
-- Run this by hand in phpMyAdmin only if the startup log shows "Schema update failed".
-- Skip any statement whose column or index already exists (MySQL reports "Duplicate column name").

ALTER TABLE Payments ADD COLUMN recordedBy INT NULL;
ALTER TABLE Payments ADD COLUMN reversedBy INT NULL;
ALTER TABLE Payments ADD COLUMN reversedAt DATETIME NULL;
ALTER TABLE Payments ADD COLUMN idempotencyKey VARCHAR(64) NULL;
ALTER TABLE Payments ADD COLUMN cascadeLog MEDIUMTEXT NULL;
CREATE UNIQUE INDEX payments_idempotency_key ON Payments (idempotencyKey);

ALTER TABLE Loans ADD COLUMN deletedAt DATETIME NULL;
ALTER TABLE Loans ADD COLUMN deletedBy INT NULL;
ALTER TABLE Loans ADD COLUMN deleteReason VARCHAR(255) NULL;
