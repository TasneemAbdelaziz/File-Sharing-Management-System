-- Database Schema: presigned_urls
-- Service: Presigned URL Service

CREATE TABLE IF NOT EXISTS presigned_urls (
    id VARCHAR(255) PRIMARY KEY,
    file_id VARCHAR(255) NOT NULL,
    url TEXT NOT NULL,
    expires_at TIMESTAMP NOT NULL
);
