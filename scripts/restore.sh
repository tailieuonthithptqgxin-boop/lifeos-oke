#!/bin/bash
# LifeOS Automated Database Restore Script
set -e

BACKUP_FILE="$1"

if [ -z "$BACKUP_FILE" ]; then
  echo "Usage: $0 <path-to-backup-file.sql.gz>"
  exit 1
fi

if [ ! -f "$BACKUP_FILE" ]; then
  echo "Error: Backup file '$BACKUP_FILE' does not exist."
  exit 1
fi

DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_USER="${POSTGRES_USER:-lifeos_user}"
DB_NAME="${POSTGRES_DB:-lifeos_db}"
PGPASSWORD="${POSTGRES_PASSWORD:-secure_password_123}"

export PGPASSWORD

echo "==> [$(date)] Starting LifeOS Database Restore from $BACKUP_FILE..."

PSQL_CMD="psql"
if [ -f "/app/applet/pg_bin/usr/lib/postgresql/15/bin/psql" ]; then
  PSQL_CMD="/app/applet/pg_bin/usr/lib/postgresql/15/bin/psql"
fi

# Decompress and feed to psql
gunzip -c "$BACKUP_FILE" | $PSQL_CMD -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME"

echo "✅ [$(date)] Database restore completed successfully."
