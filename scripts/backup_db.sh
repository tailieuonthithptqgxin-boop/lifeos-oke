#!/bin/bash

# LifeOS PostgreSQL Database Backup Script
# Usage: ./scripts/backup_db.sh

set -e

BACKUP_DIR="./backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/lifeos_db_backup_${TIMESTAMP}.sql.gz"

CONTAINER_NAME="lifeos_postgres"
DB_USER="${POSTGRES_USER:-lifeos_user}"
DB_NAME="${POSTGRES_DB:-lifeos_db}"

mkdir -p "${BACKUP_DIR}"

echo "=================================================="
echo "📦 Starting LifeOS PostgreSQL Database Backup..."
echo "Timestamp : ${TIMESTAMP}"
echo "Container : ${CONTAINER_NAME}"
echo "Database  : ${DB_NAME}"
echo "File      : ${BACKUP_FILE}"
echo "=================================================="

if [ "$(docker ps -q -f name=${CONTAINER_NAME})" ]; then
    docker exec -t "${CONTAINER_NAME}" pg_dump -U "${DB_USER}" "${DB_NAME}" | gzip > "${BACKUP_FILE}"
    echo "✅ Database backup created successfully!"
    echo "Backup size: $(du -sh ${BACKUP_FILE} | cut -f1)"
else
    echo "⚠️ Warning: Docker container '${CONTAINER_NAME}' is not running."
    echo "Executing pg_dump locally if DATABASE_URL is set..."
    if [ -n "$DATABASE_URL" ]; then
        pg_dump "$DATABASE_URL" | gzip > "${BACKUP_FILE}"
        echo "✅ Local database backup completed successfully."
    else
        echo "❌ Error: Cannot perform database backup. Container is stopped and DATABASE_URL is empty."
        exit 1
    fi
fi

# Retention policy: Keep backups for the last 30 days
find "${BACKUP_DIR}" -type f -name "lifeos_db_backup_*.sql.gz" -mtime +30 -exec rm -f {} \;
echo "🧹 Old backups older than 30 days cleaned up."
echo "=================================================="
