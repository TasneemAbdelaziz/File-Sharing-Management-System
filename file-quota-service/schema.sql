-- Database Schema: quotas
-- Service: File Quota Service

CREATE TABLE IF NOT EXISTS quotas (
    user_id VARCHAR(255) PRIMARY KEY,
    max_storage BIGINT NOT NULL,
    used_storage BIGINT NOT NULL DEFAULT 0
);
