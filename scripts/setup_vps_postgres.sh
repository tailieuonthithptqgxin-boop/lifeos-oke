#!/usr/bin/env bash
# ==============================================================================
# LifeOS Production - Automated PostgreSQL & High-Concurrency Setup for VPS
# Thiết lập PostgreSQL nội bộ chịu tải 500+ người dùng đồng thời (Zero Quota Limit)
# ==============================================================================

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}====================================================================${NC}"
echo -e "${BLUE}   LifeOS - Cấu hình PostgreSQL Nội bộ VPS (Tải 500+ Người Dùng)   ${NC}"
echo -e "${BLUE}====================================================================${NC}"

# 1. Kiểm tra quyền root / sudo
if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}❌ Vui lòng chạy script này với quyền root: sudo bash scripts/setup_vps_postgres.sh${NC}"
  exit 1
fi

# 2. Cấu hình thông tin Database
DB_NAME="${DB_NAME:-lifeos_db}"
DB_USER="${DB_USER:-lifeos_user}"
# Sinh mật khẩu ngẫu nhiên an toàn nếu chưa được thiết lập
if [ -z "${DB_PASSWORD:-}" ]; then
  DB_PASSWORD=$(openssl rand -base64 24 | tr -dc 'a-zA-Z0-9' | head -c 24)
fi

echo -e "${YELLOW}⏳ [1/6] Đang cập nhật hệ thống và cài đặt PostgreSQL...${NC}"
apt-get update -y -qq
DEBIAN_FRONTEND=noninteractive apt-get install -y -qq postgresql postgresql-contrib openssl curl ufw

systemctl enable postgresql
systemctl start postgresql

# 3. Tối ưu cấu hình PostgreSQL cho 500 người dùng đồng thời
echo -e "${YELLOW}⏳ [2/6] Tối ưu hóa bộ nhớ và kết nối (Tải 500+ người dùng)...${NC}"
PG_VERSION=$(psql -U postgres -t -c "SHOW server_version;" | awk -F. '{print $1}' | tr -d '[:space:]')
PG_CONF="/etc/postgresql/${PG_VERSION}/main/postgresql.conf"
PG_HBA="/etc/postgresql/${PG_VERSION}/main/pg_hba.conf"

if [ -f "$PG_CONF" ]; then
  # Tính toán cấu hình theo RAM máy chủ
  TOTAL_RAM_KB=$(grep MemTotal /proc/meminfo | awk '{print $2}')
  TOTAL_RAM_MB=$((TOTAL_RAM_KB / 1024))
  SHARED_BUFFERS=$((TOTAL_RAM_MB / 4))
  EFFECTIVE_CACHE=$((TOTAL_RAM_MB * 3 / 4))

  # Giới hạn tối thiểu
  if [ "$SHARED_BUFFERS" -lt 512 ]; then SHARED_BUFFERS=512; fi
  if [ "$EFFECTIVE_CACHE" -lt 1536 ]; then EFFECTIVE_CACHE=1536; fi

  # Backup file cấu hình gốc
  cp "$PG_CONF" "${PG_CONF}.bak"

  # Cấu hình tối ưu kết nối và bộ nhớ
  cat <<EOF >> "$PG_CONF"

# --- LifeOS 500 Concurrent Users Optimization ---
max_connections = 300
shared_buffers = ${SHARED_BUFFERS}MB
effective_cache_size = ${EFFECTIVE_CACHE}MB
work_mem = 16MB
maintenance_work_mem = 128MB
checkpoint_completion_target = 0.9
wal_buffers = 16MB
default_statistics_target = 100
random_page_cost = 1.1
effective_io_concurrency = 200
# -----------------------------------------------
EOF
fi

# Cho phép kết nối local qua md5 / scram-sha-256
if [ -f "$PG_HBA" ]; then
  if ! grep -q "lifeos_user" "$PG_HBA"; then
    echo "local   $DB_NAME        $DB_USER                                md5" >> "$PG_HBA"
    echo "host    $DB_NAME        $DB_USER        127.0.0.1/32            md5" >> "$PG_HBA"
    echo "host    $DB_NAME        $DB_USER        ::1/128                 md5" >> "$PG_HBA"
  fi
fi

# 4. Khởi tạo Database và User
echo -e "${YELLOW}⏳ [3/6] Khởi tạo Database '${DB_NAME}' và User '${DB_USER}'...${NC}"
sudo -u postgres psql -c "DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = '${DB_USER}') THEN
    CREATE ROLE ${DB_USER} WITH LOGIN PASSWORD '${DB_PASSWORD}';
  ELSE
    ALTER ROLE ${DB_USER} WITH PASSWORD '${DB_PASSWORD}';
  END IF;
END
\$\$;"

# Tạo CSDL nếu chưa tồn tại
sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname = '${DB_NAME}'" | grep -q 1 || \
sudo -u postgres psql -c "CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};"

sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};"
sudo -u postgres psql -d "${DB_NAME}" -c "GRANT ALL ON SCHEMA public TO ${DB_USER};"

# Khởi động lại PostgreSQL với cấu hình mới
systemctl restart postgresql
echo -e "${GREEN}✅ PostgreSQL đã sẵn sàng và chạy tối ưu trên cổng 5432.${NC}"

# 5. Cập nhật file .env của dự án
echo -e "${YELLOW}⏳ [4/6] Cập nhật file cấu hình môi trường (.env)...${NC}"
APP_DIR="$(pwd)"
ENV_FILE="${APP_DIR}/.env"

NEW_DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@127.0.0.1:5432/${DB_NAME}?schema=public&connection_limit=25&pool_timeout=15"

if [ -f "$ENV_FILE" ]; then
  # Thay thế DATABASE_URL trong .env hiện tại
  if grep -q "^DATABASE_URL=" "$ENV_FILE"; then
    sed -i "s|^DATABASE_URL=.*|DATABASE_URL=\"${NEW_DATABASE_URL}\"|" "$ENV_FILE"
  else
    echo "DATABASE_URL=\"${NEW_DATABASE_URL}\"" >> "$ENV_FILE"
  fi
else
  # Tạo mới file .env nếu chưa có
  cat <<EOF > "$ENV_FILE"
PORT=3000
NODE_ENV=production
APP_URL=http://localhost:3000
DATABASE_URL="${NEW_DATABASE_URL}"
JWT_SECRET="$(openssl rand -base64 36 | tr -dc 'a-zA-Z0-9' | head -c 48)"
INITIAL_ADMIN_EMAIL="admin@lifeos.com"
INITIAL_ADMIN_PASSWORD="Admin@${DB_PASSWORD:0:8}"
EOF
fi

# Đảm bảo phân quyền file .env
chmod 600 "$ENV_FILE"

# 6. Đồng bộ cấu trúc bảng Prisma vào Database mới
echo -e "${YELLOW}⏳ [5/6] Đồng bộ CSDL Prisma (prisma db push)...${NC}"
export DATABASE_URL="${NEW_DATABASE_URL}"
npx prisma db push --accept-data-loss

# 7. Khởi tạo tài khoản Quản trị viên (Admin)
echo -e "${YELLOW}⏳ [6/6] Khởi tạo tài khoản Quản trị viên mặc định...${NC}"
ADMIN_EMAIL=$(grep "^INITIAL_ADMIN_EMAIL=" "$ENV_FILE" | cut -d '=' -f2- | tr -d '"' || echo "admin@lifeos.com")
ADMIN_PASS=$(grep "^INITIAL_ADMIN_PASSWORD=" "$ENV_FILE" | cut -d '=' -f2- | tr -d '"' || echo "Admin@123456")

ADMIN_EMAIL="${ADMIN_EMAIL}" ADMIN_PASSWORD="${ADMIN_PASS}" npx tsx scripts/create_admin.ts || true

echo -e "\n${GREEN}====================================================================${NC}"
echo -e "${GREEN}🎉 CẤU HÌNH THÀNH CÔNG POSTGRESQL NỘI BỘ VPS!                       ${NC}"
echo -e "${GREEN}====================================================================${NC}"
echo -e "📊 Database Name    : ${DB_NAME}"
echo -e "👤 Database User    : ${DB_USER}"
echo -e "🔑 Database Pass    : ${DB_PASSWORD}"
echo -e "🔗 Database URL     : ${NEW_DATABASE_URL}"
echo -e "--------------------------------------------------------------------"
echo -e "👑 Tài khoản Admin : ${ADMIN_EMAIL}"
echo -e "🔐 Mật khẩu Admin  : ${ADMIN_PASS}"
echo -e "--------------------------------------------------------------------"
echo -e "🚀 Bước tiếp theo: Khởi động với PM2 Cluster (chịu tải 500 người):"
echo -e "   ${YELLOW}pm2 start ecosystem.config.cjs${NC}"
echo -e "   ${YELLOW}pm2 save && pm2 startup${NC}"
echo -e "${GREEN}====================================================================${NC}\n"
