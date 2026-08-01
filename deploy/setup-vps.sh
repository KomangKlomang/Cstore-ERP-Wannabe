#!/bin/bash
# ══════════════════════════════════════════════════════════════
# MMS VPS Setup Script
# Jalankan di VPS yang baru (Ubuntu 22.04/24.04)
#
# Cara pakai:
#   scp deploy/setup-vps.sh user@your-vps:~/
#   ssh user@your-vps
#   chmod +x setup-vps.sh
#   sudo ./setup-vps.sh
# ══════════════════════════════════════════════════════════════

set -e

echo "╔═══════════════════════════════════════════╗"
echo "║   MMS VPS Setup                           ║"
echo "╚═══════════════════════════════════════════╝"

# ── 1. System update
echo "▶ Updating system..."
apt update && apt upgrade -y

# ── 2. Install Node.js 20
echo "▶ Installing Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# ── 3. Install PostgreSQL 16
echo "▶ Installing PostgreSQL 16..."
apt install -y postgresql postgresql-contrib

# ── 4. Install Nginx
echo "▶ Installing Nginx..."
apt install -y nginx

# ── 5. Install PM2
echo "▶ Installing PM2..."
npm install -g pm2

# ── 6. Create database
echo "▶ Setting up database..."
DB_PASS=$(openssl rand -base64 16)
sudo -u postgres psql -c "CREATE USER mms_user WITH PASSWORD '${DB_PASS}';" 2>/dev/null || true
sudo -u postgres psql -c "CREATE DATABASE mms_db OWNER mms_user;" 2>/dev/null || true
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE mms_db TO mms_user;"

# ── 7. Create upload directory
echo "▶ Creating upload directory..."
mkdir -p /var/data/mms/uploads
chown -R www-data:www-data /var/data/mms

# ── 8. Create app directory
echo "▶ Creating app directory..."
mkdir -p /var/www/mms
chown -R $SUDO_USER:$SUDO_USER /var/www/mms

# ── 9. Generate auth secret
AUTH_SECRET=$(openssl rand -base64 32)

# ── 10. Create .env
echo "▶ Creating .env..."
cat > /var/www/mms/.env << ENVEOF
DATABASE_URL="postgresql://mms_user:${DB_PASS}@localhost:5432/mms_db?schema=public"
AUTH_SECRET="${AUTH_SECRET}"
UPLOAD_DIR="/var/data/mms/uploads"
MAX_FILE_SIZE_MB=5
NEXT_PUBLIC_APP_URL="http://$(hostname -I | awk '{print $1}'):3000"
NODE_ENV="production"
ENVEOF

chmod 600 /var/www/mms/.env

# ── 11. PM2 ecosystem file
cat > /var/www/mms/ecosystem.config.cjs << 'PM2EOF'
module.exports = {
  apps: [{
    name: "mms",
    cwd: "/var/www/mms",
    script: "node_modules/.bin/next",
    args: "start",
    env: {
      NODE_ENV: "production",
      PORT: 3000,
    },
    instances: 1,
    autorestart: true,
    max_memory_restart: "512M",
  }],
};
PM2EOF

echo ""
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║  ✅ Setup selesai!                                       ║"
echo "╠═══════════════════════════════════════════════════════════╣"
echo "║                                                          ║"
echo "║  DB Password: ${DB_PASS}"
echo "║  Auth Secret: (sudah di .env)                            ║"
echo "║  .env file:   /var/www/mms/.env                          ║"
echo "║                                                          ║"
echo "║  Langkah selanjutnya:                                    ║"
echo "║  1. Clone repo:                                          ║"
echo "║     cd /var/www/mms                                      ║"
echo "║     git clone https://github.com/KomangKlomang/          ║"
echo "║       Cstore-ERP-Wannabe.git .                           ║"
echo "║                                                          ║"
echo "║  2. Install & build:                                     ║"
echo "║     npm ci                                               ║"
echo "║     npx prisma generate                                  ║"
echo "║     npx prisma db push                                   ║"
echo "║     node scripts/seed-db.mjs                             ║"
echo "║     npm run build                                        ║"
echo "║                                                          ║"
echo "║  3. Start app:                                           ║"
echo "║     pm2 start ecosystem.config.cjs                       ║"
echo "║     pm2 save && pm2 startup                              ║"
echo "║                                                          ║"
echo "║  4. Setup Nginx:                                         ║"
echo "║     cp deploy/nginx.conf /etc/nginx/sites-available/mms  ║"
echo "║     ln -s /etc/nginx/sites-available/mms                 ║"
echo "║       /etc/nginx/sites-enabled/                          ║"
echo "║     nginx -t && systemctl reload nginx                   ║"
echo "║                                                          ║"
echo "║  5. SSL (opsional):                                      ║"
echo "║     apt install certbot python3-certbot-nginx             ║"
echo "║     certbot --nginx -d erp.yourdomain.com                ║"
echo "║                                                          ║"
echo "╚═══════════════════════════════════════════════════════════╝"
