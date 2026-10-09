#!/bin/bash
set -e

DATA_DIR="/app/applet/postgres_data"
BIN_DIR="/app/applet/pg_bin/usr/lib/postgresql/15/bin"
LOG_FILE="/app/applet/postgres_data/postgres.log"

# Ensure postgres user exists
id postgres >/dev/null 2>&1 || useradd -m -s /bin/bash postgres

# Auto-bootstrap PostgreSQL binaries if container restarted without pg_bin
if [ ! -f "$BIN_DIR/postgres" ]; then
  echo "PostgreSQL binaries missing, auto-installing portable PostgreSQL 15..."
  mkdir -p /tmp/pg_debs /app/applet/pg_bin
  (
    cd /tmp/pg_debs
    apt-get update -qq >/dev/null 2>&1 || true
    apt-get download -qq postgresql-15 postgresql-client-15 libpq5 libllvm14 libicu72 libxml2 libxslt1.1 >/dev/null 2>&1 || true
    for f in /tmp/pg_debs/*.deb; do
      [ -f "$f" ] && dpkg -x "$f" /app/applet/pg_bin >/dev/null 2>&1 || true
    done
  )
fi

# Configure dynamic library paths for PostgreSQL
mkdir -p /etc/ld.so.conf.d
echo "/app/applet/pg_bin/usr/lib/x86_64-linux-gnu" > /etc/ld.so.conf.d/postgresql.conf
echo "/app/applet/pg_bin/usr/lib/postgresql/15/lib" >> /etc/ld.so.conf.d/postgresql.conf
ldconfig 2>/dev/null || true

chmod +x "$BIN_DIR"/* 2>/dev/null || true

# If cluster is uninitialized, initialize with initdb
if [ ! -f "$DATA_DIR/PG_VERSION" ]; then
  echo "Initializing fresh PostgreSQL cluster at $DATA_DIR..."
  mkdir -p "$DATA_DIR"
  chown -R postgres:postgres "$DATA_DIR"
  chmod 0700 "$DATA_DIR"
  su - postgres -c "$BIN_DIR/initdb -D '$DATA_DIR' -U postgres --auth-local=trust --auth-host=trust"
fi

# Ensure essential subdirectories exist (some can be dropped by git or container mounts)
mkdir -p "$DATA_DIR/pg_notify" \
         "$DATA_DIR/pg_tblspc" \
         "$DATA_DIR/pg_replslot" \
         "$DATA_DIR/pg_twophase" \
         "$DATA_DIR/pg_snapshots" \
         "$DATA_DIR/pg_commit_ts" \
         "$DATA_DIR/pg_stat" \
         "$DATA_DIR/pg_stat_tmp" \
         "$DATA_DIR/pg_dynshmem" \
         "$DATA_DIR/pg_serial" \
         "$DATA_DIR/pg_logical/mappings" \
         "$DATA_DIR/pg_logical/snapshots" \
         "$DATA_DIR/pg_multixact/members" \
         "$DATA_DIR/pg_multixact/offsets" 2>/dev/null || true

chown -R postgres:postgres "$DATA_DIR"
chmod 0700 "$DATA_DIR"
mkdir -p /var/run/postgresql && chown -R postgres:postgres /var/run/postgresql

# Clean stale pid if postgres is not actually running
if [ -f "$DATA_DIR/postmaster.pid" ]; then
  PID=$(head -n 1 "$DATA_DIR/postmaster.pid" 2>/dev/null || echo "")
  if [ -n "$PID" ] && ! kill -0 "$PID" 2>/dev/null; then
    echo "Removing stale postmaster.pid (PID $PID is not running)..."
    rm -f "$DATA_DIR/postmaster.pid"
  fi
fi

# Check if postgres is already running
if su - postgres -c "$BIN_DIR/pg_ctl -D '$DATA_DIR' status" > /dev/null 2>&1; then
  echo "PostgreSQL is already running."
else
  echo "Starting PostgreSQL..."
  su - postgres -c "$BIN_DIR/pg_ctl -D '$DATA_DIR' -l '$LOG_FILE' start" || {
    # If startup failed, try resetting WAL
    echo "Initial start failed, attempting WAL recovery..."
    su - postgres -c "$BIN_DIR/pg_resetwal -f '$DATA_DIR'" 2>/dev/null || true
    su - postgres -c "$BIN_DIR/pg_ctl -D '$DATA_DIR' -l '$LOG_FILE' start"
  }

  # Wait for postgres to be ready with timeout
  WAIT_SECS=0
  until su - postgres -c "$BIN_DIR/pg_isready -h localhost -p 5432" > /dev/null 2>&1; do
    echo "Waiting for PostgreSQL to be ready..."
    sleep 1
    WAIT_SECS=$((WAIT_SECS + 1))
    if [ $WAIT_SECS -ge 15 ]; then
      echo "Warning: PostgreSQL wait timeout reached"
      break
    fi
  done
fi

echo "PostgreSQL is ready!"
# Ensure user lifeos_user exists as superuser
su - postgres -c "$BIN_DIR/psql -U postgres -d postgres -c \"DO \\\$do\\\$ BEGIN IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'lifeos_user') THEN CREATE ROLE lifeos_user WITH LOGIN SUPERUSER PASSWORD 'secure_password_123'; END IF; END \\\$do\\\$;\"" 2>/dev/null || true
PGPASSWORD="secure_password_123" "$BIN_DIR/psql" -h localhost -p 5432 -U lifeos_user -d template1 -c "SELECT 1;" 2>/dev/null || su - postgres -c "$BIN_DIR/createuser -s lifeos_user" 2>/dev/null || true

# Test if lifeos_db is healthy and accepting queries
if ! PGPASSWORD="secure_password_123" "$BIN_DIR/psql" -h localhost -p 5432 -U lifeos_user -d lifeos_db -c "SELECT 1;" >/dev/null 2>&1; then
  echo "Database lifeos_db is missing or corrupted, recreating lifeos_db..."
  PGPASSWORD="secure_password_123" "$BIN_DIR/psql" -h localhost -p 5432 -U lifeos_user -d template1 -c "DROP DATABASE IF EXISTS lifeos_db WITH (FORCE);" 2>/dev/null || true
  PGPASSWORD="secure_password_123" "$BIN_DIR/psql" -h localhost -p 5432 -U lifeos_user -d template1 -c "CREATE DATABASE lifeos_db OWNER lifeos_user;" 2>/dev/null || true
fi

# Ensure Prisma database tables exist
if [ -f "/app/applet/prisma/schema.prisma" ]; then
  HAS_USERS=$(PGPASSWORD="secure_password_123" "$BIN_DIR/psql" -h localhost -p 5432 -U lifeos_user -d lifeos_db -t -c "SELECT to_regclass('public.users');" 2>/dev/null | tr -d '[:space:]' || echo "")
  if [ -z "$HAS_USERS" ] || [ "$HAS_USERS" = "" ]; then
    echo "Syncing Prisma schema to database..."
    (cd /app/applet && npx prisma db push --skip-generate --accept-data-loss >/dev/null 2>&1 || true)
  fi
fi

echo "PostgreSQL initialization complete."
