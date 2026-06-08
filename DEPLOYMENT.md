# Flirtigo — Deployment Guide

## Prerequisites
- Docker + Docker Compose
- Domain name (flirtigo.in)
- SSL certificate (Let's Encrypt recommended)
- AWS/GCP account for cloud hosting

---

## 1. Local Development Setup

```bash
# Clone and setup
cp .env.example .env
# Fill in all required values in .env

# Install dependencies
cd frontend && npm install && cd ..
cd backend && npm install && cd ..

# Start everything
docker-compose up -d

# Backend at http://localhost:3001
# Frontend at http://localhost:3000
# Postgres at localhost:5432
# Redis at localhost:6379
```

## 2. Required External Services

### Twilio (OTP)
1. Create account at twilio.com
2. Get Account SID, Auth Token, and a phone number
3. Set TWILIO_* variables in .env

### Google OAuth
1. Go to console.cloud.google.com
2. Create OAuth 2.0 credentials
3. Add authorized redirect URIs:
   - http://localhost:3001/auth/google/callback (dev)
   - https://api.flirtigo.in/auth/google/callback (prod)
4. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET

### Razorpay
1. Create account at razorpay.com
2. Get API keys from Dashboard → Settings → API Keys
3. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET
4. Configure webhook URL: https://api.flirtigo.in/api/subscriptions/webhook
5. Set RAZORPAY_WEBHOOK_SECRET

### IP Geolocation
1. Create account at ipgeolocation.io (free tier: 30k req/month)
2. Get API key and set IPGEOLOCATION_API_KEY

### TURN Server (WebRTC)
Option A: Coturn (self-hosted)
```bash
sudo apt install coturn
# Configure /etc/turnserver.conf
# Point domain turn.flirtigo.in at server
```

Option B: Twilio TURN (managed)
- Use Twilio's TURN service (Network Traversal Service)

Set TURN_SERVER_URL, TURN_SERVER_USERNAME, TURN_SERVER_CREDENTIAL

---

## 3. Production Deployment (AWS)

### Infrastructure Setup

```
Internet → Route 53 (flirtigo.in)
           → ALB (Load Balancer)
              → ECS Cluster
                 ├── frontend (Next.js) - multiple instances
                 ├── backend (NestJS) - multiple instances
              → ElastiCache (Redis cluster)
              → RDS PostgreSQL (Multi-AZ)
              → EC2 TURN Server (coturn)
```

### ECS Task Definitions

Frontend:
- CPU: 512, Memory: 1024
- Port: 3000
- Min: 2 instances, Max: 10 instances

Backend:
- CPU: 1024, Memory: 2048
- Port: 3001
- Min: 3 instances, Max: 20 instances

### Auto-Scaling Policy
- Scale out: CPU > 70% for 2 minutes
- Scale in: CPU < 30% for 5 minutes

### Redis (ElastiCache)
- Engine: Redis 7
- Node type: cache.r6g.large
- Cluster mode enabled (3 shards × 2 replicas)
- Used for: matchmaking queues, Socket.io adapter, OTP storage, session cache

### PostgreSQL (RDS)
- Engine: PostgreSQL 15
- Instance: db.r6g.xlarge
- Multi-AZ: Yes
- Read replicas: 2 (for analytics queries)
- Automated backups: 7 days

---

## 4. Docker Compose Production

```bash
docker-compose -f docker-compose.prod.yml up -d --scale backend=3 --scale frontend=2
```

---

## 5. SSL Setup (Let's Encrypt)

```bash
sudo certbot certonly --standalone -d flirtigo.in -d www.flirtigo.in -d api.flirtigo.in
# Certificates at /etc/letsencrypt/live/flirtigo.in/
sudo cp /etc/letsencrypt/live/flirtigo.in/fullchain.pem nginx/ssl/
sudo cp /etc/letsencrypt/live/flirtigo.in/privkey.pem nginx/ssl/
```

---

## 6. Database Migration

```bash
# Run schema
psql $DATABASE_URL < database/schema.sql

# Create admin user
psql $DATABASE_URL <<'SQL'
UPDATE users SET is_admin = true WHERE email = 'admin@flirtigo.in';
SQL
```

---

## 7. Environment Variables Checklist

Critical (app won't work without these):
- [ ] DATABASE_URL
- [ ] REDIS_URL
- [ ] JWT_SECRET (min 32 chars, random)
- [ ] JWT_REFRESH_SECRET (min 32 chars, random)
- [ ] GOOGLE_CLIENT_ID
- [ ] GOOGLE_CLIENT_SECRET
- [ ] TWILIO_ACCOUNT_SID
- [ ] TWILIO_AUTH_TOKEN
- [ ] TWILIO_PHONE_NUMBER
- [ ] RAZORPAY_KEY_ID
- [ ] RAZORPAY_KEY_SECRET
- [ ] IPGEOLOCATION_API_KEY
- [ ] NEXT_PUBLIC_API_URL
- [ ] NEXT_PUBLIC_SOCKET_URL

Optional (with sensible defaults):
- [ ] TURN_SERVER_URL
- [ ] TURN_SERVER_USERNAME
- [ ] TURN_SERVER_CREDENTIAL
- [ ] RAZORPAY_WEBHOOK_SECRET
- [ ] PREMIUM_MONTHLY_PRICE (default: 199)
- [ ] PREMIUM_YEARLY_PRICE (default: 1499)

---

## 8. Monitoring & Observability

### CloudWatch (AWS)
- Application logs from all containers
- Custom metrics: active matches, queue sizes, error rates
- Alarms: API error rate > 5%, CPU > 80%

### Health Checks
- Backend: GET /health → {"status":"ok"}
- Frontend: GET / → 200 OK
- Database: pg_isready
- Redis: PING

### Key Metrics to Monitor
- Active WebSocket connections
- Matchmaking queue depth
- Match success rate
- WebRTC connection success rate
- P95/P99 API latency
- OTP delivery success rate

---

## 9. Scaling for 10k Concurrent Users

### Socket.io Horizontal Scaling
Socket.io uses Redis adapter (@socket.io/redis-adapter).
All backend instances share the same pub/sub channel.
Sticky sessions are NOT required.

### WebRTC Signaling
Each signaling room is handled by one backend instance (room-based).
The Redis adapter routes messages between instances transparently.

### Matchmaking Queue
Redis sorted sets used as distributed priority queues.
Atomic operations (ZADD, ZREM) ensure no double-matching.
BullMQ can handle queue overflow if needed.

### Estimated Resource Usage at 10k concurrent:
- Backend: 5 × c5.xlarge (4vCPU, 8GB) = ~₹15k/month
- Redis: cache.r6g.large cluster = ~₹8k/month
- RDS: db.r6g.xlarge Multi-AZ = ~₹12k/month
- Frontend: 3 × t3.medium = ~₹5k/month
- TURN server: 2 × c5.large = ~₹4k/month
- Data transfer: ~₹10k/month
- **Total: ~₹54k/month (~$650)**

---

## 10. Security Checklist

- [ ] All secrets in AWS Secrets Manager / environment variables
- [ ] Database not publicly accessible (VPC only)
- [ ] Redis password protected
- [ ] Rate limiting on all public endpoints
- [ ] HTTPS enforced everywhere
- [ ] Security groups: only necessary ports open
- [ ] WAF rules for DDoS protection
- [ ] Regular security audits
- [ ] GDPR compliance: auto-delete chat history on session end
- [ ] User data deletion request flow implemented
