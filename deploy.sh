#!/bin/bash
# ==============================================================================
# LifeOS - Production Deployment Script for VPS
# ==============================================================================
set -e

echo "=========================================================="
echo "          LifeOS Production Deployment on VPS             "
echo "=========================================================="

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "⚠️  Docker chưa được cài đặt. Đang tiến hành cài đặt Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh
    echo "✅ Đã cài đặt Docker thành công."
fi

# Check Docker Compose (plugin or standalone)
if ! docker compose version &> /dev/null && ! command -v docker-compose &> /dev/null; then
    echo "⚠️  Docker Compose chưa được cài đặt. Đang cài đặt..."
    apt-get update && apt-get install -y docker-compose-plugin
fi

# Generate .env if missing
if [ ! -f .env ]; then
    echo "📝 Đang tạo tệp cấu hình .env cho môi trường production..."
    JWT_RANDOM=$(openssl rand -hex 32 2>/dev/null || date +%s | sha256sum | base64 | head -c 32)
    DB_PASS_RANDOM=$(openssl rand -hex 16 2>/dev/null || date +%s | sha256sum | base64 | head -c 16)
    ADMIN_PASS_RANDOM=$(openssl rand -base64 12 | tr -dc 'A-Za-z0-9!@#%' | head -c 12)
    
    cat <<EOF > .env
NODE_ENV=production
PORT=3000

# Database Configuration (PostgreSQL 16)
POSTGRES_USER=lifeos_user
POSTGRES_PASSWORD=${DB_PASS_RANDOM}
POSTGRES_DB=lifeos_db
DATABASE_URL=postgresql://lifeos_user:${DB_PASS_RANDOM}@postgres:5432/lifeos_db?schema=public

# Security & Authentication
JWT_SECRET=${JWT_RANDOM}
ALLOW_PUBLIC_REGISTRATION=true

# Initial SuperAdmin Credentials (used only once on first initialization)
INITIAL_ADMIN_EMAIL=admin@lifeos.com
INITIAL_ADMIN_PASSWORD=${ADMIN_PASS_RANDOM}

# SMTP Configuration (Optional)
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM="LifeOS System <no-reply@yourdomain.com>"
EOF
    echo "✅ Đã tạo tệp .env với mật khẩu bảo mật ngẫu nhiên."
    echo "🔑 Mật khẩu SuperAdmin khởi tạo: ${ADMIN_PASS_RANDOM}"
fi

# Make scripts executable
chmod +x docker-entrypoint.sh scripts/*.sh 2>/dev/null || true

# Setup automated daily backup cron job
if [ -d "/etc/cron.daily" ]; then
    cat << 'EOF' > /etc/cron.daily/lifeos_backup
#!/bin/bash
cd $(dirname $(dirname $(readlink -f $0)))
docker exec lifeos_postgres pg_dump -U lifeos_user -d lifeos_db | gzip > /backups/lifeos_db_$(date +%Y%m%d_%H%M%S).sql.gz 2>/dev/null || true
find /backups -name "lifeos_db_*.sql.gz" -type f -mtime +14 -delete 2>/dev/null || true
EOF
    chmod +x /etc/cron.daily/lifeos_backup 2>/dev/null || true
fi

# Build and start services
echo "🚀 Đang khởi động các dịch vụ (PostgreSQL, LifeOS API, Nginx)..."
docker compose down 2>/dev/null || true
docker compose up -d --build

echo "⏳ Đang chờ hệ thống khởi động và triển khai migrations..."
sleep 10

# Health check
echo "🔍 Kiểm tra trạng thái hệ thống..."
if command -v curl &> /dev/null; then
    HEALTH_STATUS=$(curl -s http://localhost/health || curl -s http://localhost:3000/health || echo "checking...")
    echo "Kết quả kiểm tra: $HEALTH_STATUS"
fi

echo "=========================================================="
echo "🎉 HỆ THỐNG LIFE OS ĐÃ VẬN HÀNH THÀNH CÔNG TRÊN VPS!"
echo "=========================================================="
echo "🌐 Truy cập Web qua địa chỉ IP của VPS (Port 80 / 443)"
echo "👤 Thông tin đăng nhập SuperAdmin ban đầu được ghi trong file .env"
echo "📌 Lưu ý: Vui lòng đổi mật khẩu sau lần đăng nhập đầu tiên tại mục Tài khoản."
echo "=========================================================="
