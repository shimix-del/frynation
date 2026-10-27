-- Additive replica metadata only. Do not reset or seed business tables.
CREATE TABLE IF NOT EXISTS NaniReplicaState (
  id VARCHAR(191) NOT NULL PRIMARY KEY,
  body LONGTEXT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
INSERT IGNORE INTO NaniReplicaState (id,body) VALUES ('receiver-lock','{}');
