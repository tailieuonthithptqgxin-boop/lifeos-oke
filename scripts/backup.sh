#!/bin/bash
# LifeOS Automated Database Backup Script
set -e

BACKUP_DIR="${BACKUP_DIR:-/backups}"
mkdir -p "$BACKUP_DIR"

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/lifeos_db_$TIMESTAMP.sql.gz"

DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_USER="${POSTGRES_USER:-lifeos_user}"
DB_NAME="${POSTGRES_DB:-lifeos_db}"
PGPASSWORD="${POSTGRES_PASSWORD:-secure_password_123}"

export PGPASSWORD

echo "==> [$(date)] Starting LifeOS PostgreSQL Backup..."

# If running inside docker container or with system pg_dump
PG_DUMP_CMD="pg_dump"
if [ -f "/app/applet/pg_bin/usr/lib/postgresql/15/bin/pg_dump" ]; then
  PG_DUMP_CMD="/app/applet/pg_bin/usr/lib/postgresql/15/bin/pg_dump"
fi

$PG_DUMP_CMD -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" --clean --if-exists --no-owner --no-privileges | gzip > "$BACKUP_FILE"

FILESIZE=$(ls -lh "$BACKUP_FILE" | awk '{print $5}')
echo "✅ [$(date)] Backup completed successfully: $BACKUP_FILE ($FILESIZE)"

# Retention policy: remove backups older than 14 days
find "$BACKUP_DIR" -name "lifeos_db_*.sql.gz" -type f -mtime +14 -delete 2>/dev/null || true
echo "==> Backup retention check complete."
