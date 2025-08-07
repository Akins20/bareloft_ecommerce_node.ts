# 🚀 Deployment Guide - Nigerian E-commerce Admin System

## **📋 Overview**
This guide provides step-by-step instructions for deploying the complete Nigerian e-commerce admin system to production.

---

# **✅ Pre-Deployment Checklist**

## **📊 System Requirements**
- [x] **150+ API endpoints** implemented and tested
- [x] **Nigerian market optimization** throughout all systems  
- [x] **JWT authentication** with role-based access control
- [x] **Database schema** optimized and migration-ready
- [x] **Comprehensive documentation** for frontend integration
- [x] **Security measures** implemented (rate limiting, validation, audit logging)

## **🔧 Environment Requirements**
- **Node.js**: v18+ 
- **PostgreSQL**: v14+
- **Redis**: v6+
- **Storage**: AWS S3 or local file system
- **SSL Certificate**: Required for HTTPS

---

# **🗄️ Database Deployment**

## **1. Database Migration**
```bash
# Run Prisma migrations
npm run db:migrate:prod

# Generate Prisma client
npm run db:generate

# Seed initial data (optional)
npm run db:seed
```

## **2. Database Indexing**
```sql
-- Performance indexes for Nigerian e-commerce
CREATE INDEX idx_orders_customer_phone ON "Order"(customer_phone);
CREATE INDEX idx_orders_nigerian_state ON "Order"(shipping_state);
CREATE INDEX idx_products_stock_low ON "Product"(stock) WHERE stock <= low_stock_threshold;
CREATE INDEX idx_returns_nigerian_state ON "ReturnRequest"(pickup_state);
CREATE INDEX idx_support_tickets_priority ON "SupportTicket"(priority, status);
```

---

# **🔐 Environment Configuration**

## **Production Environment Variables**
```bash
# .env.production

# Database
DATABASE_URL="postgresql://user:password@localhost:5432/bareloft_prod"

# Redis
REDIS_URL="redis://localhost:6379"

# JWT
JWT_SECRET="your-super-secure-jwt-secret-key"
JWT_REFRESH_SECRET="your-refresh-token-secret"
JWT_EXPIRE="15m"
JWT_REFRESH_EXPIRE="7d"

# Nigerian Payment Integration
PAYSTACK_PUBLIC_KEY="pk_live_your_paystack_public_key"
PAYSTACK_SECRET_KEY="sk_live_your_paystack_secret_key"
PAYSTACK_WEBHOOK_SECRET="your_webhook_secret"

# Nigerian SMS Integration
SMS_PROVIDER="termii" # or "bulk_sms_nigeria"
SMS_API_KEY="your_sms_api_key"
SMS_SENDER_ID="Bareloft"

# Email Configuration
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="noreply@bareloft.com"
SMTP_PASS="your_email_password"

# File Upload
CLOUDINARY_NAME="your_cloudinary_name"
CLOUDINARY_API_KEY="your_api_key"  
CLOUDINARY_API_SECRET="your_api_secret"

# Nigerian Shipping Integration
JUMIA_LOGISTICS_API_KEY="your_jumia_api_key"
JUMIA_LOGISTICS_SECRET="your_jumia_secret"

# Application Settings
NODE_ENV="production"
PORT=3000
API_URL="https://api.bareloft.com"
ADMIN_URL="https://admin.bareloft.com"

# Nigerian Market Settings
DEFAULT_CURRENCY="NGN"
DEFAULT_TIMEZONE="Africa/Lagos"
BUSINESS_HOURS_START="09:00"
BUSINESS_HOURS_END="18:00"
VAT_RATE="0.075" # 7.5% Nigerian VAT

# Security
RATE_LIMIT_MAX="1000" # requests per 15 minutes
ADMIN_RATE_LIMIT_MAX="2000" # higher limit for admins
SESSION_SECRET="your-session-secret"

# Monitoring
LOG_LEVEL="info"
ENABLE_AUDIT_LOG="true"
ENABLE_PERFORMANCE_MONITORING="true"
```

---

# **🏗️ Server Configuration**

## **PM2 Configuration**
Create `ecosystem.config.js`:
```javascript
module.exports = {
  apps: [
    {
      name: 'bareloft-api',
      script: 'dist/server.js',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      error_file: 'logs/err.log',
      out_file: 'logs/out.log',
      log_file: 'logs/combined.log',
      time: true,
      max_memory_restart: '1G',
      node_args: '--max-old-space-size=1024'
    }
  ]
};
```

## **Nginx Configuration**
```nginx
# /etc/nginx/sites-available/bareloft-api
server {
    listen 80;
    server_name api.bareloft.com;
    
    # Redirect HTTP to HTTPS
    location / {
        return 301 https://$server_name$request_uri;
    }
}

server {
    listen 443 ssl http2;
    server_name api.bareloft.com;
    
    # SSL Configuration
    ssl_certificate /path/to/certificate.pem;
    ssl_certificate_key /path/to/private_key.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    
    # Security Headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    
    # Rate Limiting (Nigerian-specific)
    limit_req_zone $binary_remote_addr zone=api:10m rate=100r/m;
    limit_req_zone $binary_remote_addr zone=admin:10m rate=200r/m;
    
    # API Endpoints
    location /api/ {
        limit_req zone=api burst=20 nodelay;
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    
    # Admin Endpoints (Higher Rate Limit)
    location /api/admin/ {
        limit_req zone=admin burst=50 nodelay;
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    
    # WebSocket Support
    location /ws {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
    }
}
```

---

# **📦 Build and Deploy**

## **1. Build Application**
```bash
# Install dependencies
npm ci --only=production

# Build TypeScript
npm run build

# Generate Prisma client
npm run db:generate

# Run database migrations
npm run db:migrate:prod
```

## **2. Deploy with PM2**
```bash
# Start application
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 startup
pm2 startup

# Monitor application
pm2 monit
```

## **3. Enable Services**
```bash
# Enable and start Nginx
sudo systemctl enable nginx
sudo systemctl start nginx

# Enable and start PostgreSQL
sudo systemctl enable postgresql
sudo systemctl start postgresql

# Enable and start Redis
sudo systemctl enable redis
sudo systemctl start redis
```

---

# **🔒 Security Configuration**

## **Firewall Setup**
```bash
# Enable UFW
sudo ufw enable

# Allow SSH
sudo ufw allow ssh

# Allow HTTP and HTTPS
sudo ufw allow 'Nginx Full'

# Allow specific ports
sudo ufw allow 3000/tcp  # API server
sudo ufw allow 5432/tcp  # PostgreSQL (if external)
sudo ufw allow 6379/tcp  # Redis (if external)

# Check status
sudo ufw status
```

## **SSL Certificate (Let's Encrypt)**
```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d api.bareloft.com

# Auto-renewal setup
sudo crontab -e
# Add line: 0 12 * * * /usr/bin/certbot renew --quiet
```

---

# **📊 Monitoring Setup**

## **Log Configuration**
```bash
# Create log directory
mkdir -p /var/log/bareloft

# Setup log rotation
sudo nano /etc/logrotate.d/bareloft
```

```
/var/log/bareloft/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 0644 ubuntu ubuntu
    postrotate
        pm2 reloadLogs
    endscript
}
```

## **Health Check Endpoint**
The system includes health check endpoints:
```
GET /api/admin/health  # Detailed health check
GET /health           # Basic health check
```

---

# **🧪 Post-Deployment Testing**

## **API Functionality Test**
```bash
# Test basic connectivity
curl -X GET https://api.bareloft.com/health

# Test admin authentication
curl -X POST https://api.bareloft.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "+2348012345678", "password": "admin123"}'

# Test admin dashboard (with token)
curl -X GET https://api.bareloft.com/api/admin/dashboard/overview \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Test inventory management
curl -X GET https://api.bareloft.com/api/admin/inventory \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Test order management  
curl -X GET https://api.bareloft.com/api/admin/orders \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## **Performance Testing**
```bash
# Load test with Apache Bench
ab -n 1000 -c 10 https://api.bareloft.com/health

# Test admin endpoints (with authentication)
ab -n 100 -c 5 -H "Authorization: Bearer TOKEN" \
  https://api.bareloft.com/api/admin/dashboard/overview
```

---

# **📈 Performance Optimization**

## **Database Optimization**
```sql
-- Analyze query performance
ANALYZE;

-- Update table statistics
VACUUM ANALYZE;

-- Monitor slow queries
SELECT query, mean_time, calls 
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;
```

## **Redis Configuration**
```bash
# /etc/redis/redis.conf
maxmemory 256mb
maxmemory-policy allkeys-lru
save 900 1
save 300 10
save 60 10000
```

---

# **🚨 Troubleshooting**

## **Common Issues**

### **Database Connection Issues**
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Check connections
sudo -u postgres psql -c "SELECT * FROM pg_stat_activity;"

# Restart if needed
sudo systemctl restart postgresql
```

### **Redis Connection Issues**
```bash
# Check Redis status
sudo systemctl status redis

# Test Redis connection
redis-cli ping

# Restart if needed
sudo systemctl restart redis
```

### **API Server Issues**
```bash
# Check PM2 status
pm2 status

# View logs
pm2 logs bareloft-api

# Restart application
pm2 restart bareloft-api

# Check server resources
htop
df -h
```

---

# **🎯 Success Verification**

## **Deployment Checklist**
- [ ] **Database**: Migrated and indexed
- [ ] **API Server**: Running on PM2 cluster mode
- [ ] **Nginx**: SSL configured and rate limiting active
- [ ] **Security**: Firewall enabled, SSL certificate installed
- [ ] **Monitoring**: Logs configured and health checks working
- [ ] **Testing**: All endpoints responding correctly
- [ ] **Performance**: Response times under 500ms for most endpoints

## **Admin System Features Verified**
- [ ] **Phase 1**: Admin dashboard with Nigerian metrics
- [ ] **Phase 2**: Inventory management with alerts and reordering
- [ ] **Phase 3**: Order fulfillment with shipping integration
- [ ] **Phase 4**: Customer service with returns and support

## **Nigerian Market Features Verified**  
- [ ] **Currency**: Naira formatting working (₦1,234.56)
- [ ] **Phone**: Nigerian phone validation (+234 format)
- [ ] **Business Hours**: WAT timezone and Nigerian holidays
- [ ] **Payments**: Paystack integration functional
- [ ] **Shipping**: Nigerian carrier integration active
- [ ] **Banking**: Nigerian bank validation working

---

**🎉 Congratulations! Your Nigerian e-commerce admin system is now successfully deployed and ready for production use!** 🇳🇬🚀

**API Base URL**: `https://api.bareloft.com`  
**Admin Dashboard**: Available through API endpoints  
**Documentation**: Available in repository  
**Support**: All systems operational  

The deployment includes 150+ API endpoints optimized for the Nigerian market with comprehensive admin capabilities, real-time analytics, and professional customer service features.