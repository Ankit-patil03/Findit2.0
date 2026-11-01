# FindIt Deployment Guide

How FindIt goes live on AWS: two Docker containers on one EC2 server, PostgreSQL on RDS, photos on S3, and HTTPS from CloudFront (no domain needed).

The first deployment is done **by hand**. CI/CD and other automation come later (see [Later: optimization](#later-optimization)).

Visual version of the architecture: https://claude.ai/artifact/98hFGqn94rCdaG6PaKSqzW

---

## 1. Architecture

```
                 Students / Admins (browser, phone)
                               │ HTTPS  (https://dxxxx.cloudfront.net)
                               ▼
                 ┌──────────────────────────────┐
                 │ CloudFront (free HTTPS cert) │
                 └──────────────┬───────────────┘
                                │ HTTP, port 80
┌──────────────── VPC ──────────┼────────────────────────────────────────┐
│ Public subnet                 ▼                                        │
│ ┌──────────────── EC2 t3.micro · Docker Compose ───────────────────┐   │
│ │  ┌─────────────────────────┐        ┌─────────────────────────┐  │   │      ┌──────────────┐
│ │  │ Container 1: frontend   │ /api/* │ Container 2: backend    │──┼───┼─────►│ S3 bucket    │
│ │  │ nginx                   │───────►│ Node + Express          │  │   │      │ item photos  │
│ │  │ • serves React build    │        │ • port 5000 (internal)  │  │   │      └──────────────┘
│ │  │ • port 80 (public)      │        └────────────┬────────────┘  │   │       via IAM role
│ │  └─────────────────────────┘                     │               │   │
│ └──────────────────────────────────────────────────┼───────────────┘   │      ┌──────────────┐
│                                                    │ SQL :5432         │      │ ECR          │
│ Private subnet                                     ▼                   │      │ Docker images│
│                                     ┌─────────────────────────┐        │      └──────┬───────┘
│                                     │ RDS PostgreSQL          │        │             │
│                                     │ no public access        │        │   EC2 pulls images
│                                     └─────────────────────────┘        │
└────────────────────────────────────────────────────────────────────────┘
```

### What each part does

| Part | Job | Replaces (local) |
|---|---|---|
| **CloudFront** | Public HTTPS address, forwards everything to EC2 | `localhost` |
| **EC2** | Runs Docker Compose with the two containers | your laptop |
| **Container 1: frontend** | nginx serves the React build and passes `/api/*` and `/uploads/*` to the backend | `npm run dev` |
| **Container 2: backend** | Express API, never exposed to the internet directly | `npm run dev` in `backend/` |
| **RDS PostgreSQL** | Managed database with automatic backups | local Postgres |
| **S3** | Stores uploaded item photos | `backend/uploads/` |
| **ECR** | Stores the two Docker images | none |
| **IAM role** | Lets EC2 use S3 and ECR without access keys in the code | none |

### Who can reach what

| Part | Reachable from | Port |
|---|---|---|
| CloudFront | Anyone | 443 |
| EC2, frontend container | CloudFront only (AWS prefix list) | 80 |
| EC2, SSH | Your IP only | 22 |
| Backend container | Frontend container only (Docker network) | 5000 |
| RDS | EC2 security group only | 5432 |
| S3 bucket | EC2 IAM role only | n/a |

Secrets (`DB` password, `JWT_SECRET`) live only in a `.env` file on the EC2 server. They never go into git or into a Docker image.

---

## 2. HTTPS without a domain: use CloudFront

**Decision: put CloudFront in front of EC2.** CloudFront gives every distribution a free address like `https://d1a2b3c4.cloudfront.net` with a valid certificate already installed. You don't buy a domain, you don't install certbot, and you don't renew certificates.

Why HTTPS matters for FindIt:
- Browsers only allow **camera access** (PWA photo capture) on HTTPS pages.
- Login passwords and JWT tokens must not travel over plain HTTP.

Options considered:

| Option | Cost | Verdict |
|---|---|---|
| **CloudFront in front of EC2** | Free tier covers a college project | ✅ **Use this.** Real HTTPS, stable address, AWS service for the report |
| Let's Encrypt on a free "IP domain" (sslip.io / nip.io) | Free | ⚠️ Works, but shared rate limits and an IP in the URL. Backup only |
| Cloudflare Quick Tunnel | Free | ❌ Random URL that changes on every restart |
| Self-signed certificate | Free | ❌ Browser shows a security warning; camera still unreliable |
| Buy a domain + Let's Encrypt | ₹100–800/year | Not wanted |

**Two things this needs:**
1. An **Elastic IP** on the EC2 server, so its public address (and DNS name) doesn't change when the server restarts. CloudFront points at that DNS name.
2. nginx must allow photo uploads bigger than its 1 MB default (`client_max_body_size 6m;`), because the backend accepts images up to 5 MB.

---

## 3. Before you start

- [x] AWS account, logged in as an **IAM user with admin rights** (not the root account)
- [x] Region: **ap-south-1 (Mumbai)** for everything
- [x] AWS CLI installed on your laptop, then `aws login` as `admin-03` (temporary credentials, no access keys; run it again when it says expired)
- [x] Docker Desktop installed (Phase 1)
- [x] Node 24 locally (you have `v24.21.0`); the Docker images will use Node 24 too

### Environment variables the app needs

| Variable | Used by | Production value |
|---|---|---|
| `DATABASE_URL` | backend (`db.js`, after Step 2) | `postgresql://findit_admin:<password>@<rds-endpoint>:5432/findit` |
| `JWT_SECRET` | backend (`routes/auth.js`, `middleware/auth.js`) | long random string (see Step 14) |
| `APP_TIMEZONE` | backend (`routes/items.js`) | `Asia/Kolkata` |
| `S3_BUCKET` | backend (`upload.js`, after Step 3) | e.g. `findit-photos-<yourname>` |
| `AWS_REGION` | backend (S3 client) | `ap-south-1` |
| `PORT` | backend | `5000` |
| `VITE_API_URL` | frontend, at **build time** | empty, because the API is on the same address |

---

## Phase 0: Prepare the code (laptop)

### Step 1. Commit untracked files and fix `.gitignore`
Most of the app (`routes/auth.js`, `routes/items.js`, `App.jsx`, the pages, `api.js`) is not committed yet. Docker builds and deployments start from git.
- [x] Root `.gitignore` covers: `node_modules/`, `.env`, `**/.env`, `backend/uploads/`, `frontend/dist/`
- [x] Review the file list, then commit
- [x] Check that no `.env` file was committed: `git ls-files | grep .env` prints nothing

### Step 2. Make `db.js` work with RDS
- [x] Use `DATABASE_URL` when it is set, and keep the current `DB_*` variables for local development
- [x] Turn on SSL when connecting to RDS (RDS PostgreSQL requires SSL by default)
- [x] Test locally: the app still works against your local database

### Step 3. Store photos in S3 instead of on disk
- [x] Add `@aws-sdk/client-s3` to the backend
- [x] Change `middleware/upload.js` to send the image to S3 (only this file changes for storage, as its comment says)
- [x] Keep photo paths as `/uploads/<file>` in the database. The backend reads `/uploads/*` from S3, so the bucket stays private and the frontend's `imageUrl()` keeps working
- [x] Credentials come from the EC2 IAM role in production, so no keys go in the code

---

## Phase 1: Docker (laptop)

### Step 4. Install Docker Desktop
- [x] Enable WSL2 (Windows 10 Home needs it): run `wsl --install` in an admin PowerShell, then restart
- [x] Install Docker Desktop and check: `docker --version` and `docker compose version`

### Step 5. Backend image
Files: `backend/Dockerfile`, `backend/.dockerignore`
- [ ] Base image `node:24-slim`
- [ ] `npm ci --omit=dev`, then `node server.js`
- [ ] `.dockerignore` excludes `node_modules`, `.env`, `uploads`. **Never copy the Windows `node_modules`**, because `bcrypt` compiled on Windows crashes on Linux
- [ ] No secrets in the Dockerfile

### Step 6. Frontend image
Files: `frontend/Dockerfile`, `frontend/nginx.conf`, `frontend/.dockerignore`
- [ ] **Build stage** (`node:24-slim`): `npm ci`, `npm run build` → `dist/`
- [ ] **Run stage** (`nginx:alpine`): copy only `dist/` and `nginx.conf`
- [ ] `nginx.conf`:
  - `/api/` and `/uploads/` → `http://backend:5000`
  - every other path → `index.html` (so React Router pages work after a refresh)
  - `client_max_body_size 6m;`
- [ ] Build with `VITE_API_URL` empty, so the browser calls `/api/...` on the same address

### Step 7. Run everything locally with Compose
File: `docker-compose.yml` (repo root)
- [ ] Services: `frontend` (port `80:80`), `backend` (no published port), `db` (`postgres` image + a named volume, for local testing only)
- [ ] `docker compose up --build`
- [ ] Open http://localhost: sign up, log in, report an item with a photo, check the admin pages

---

## Phase 2: AWS setup (AWS console)

### Step 8. Billing alarm (do this first)
- [ ] Billing → Budgets → create a **zero-spend budget** with email alerts
- [ ] Check what your account's free tier or credits cover for EC2, RDS, public IPv4 addresses and CloudFront

### Step 9. S3 bucket and IAM role
- [ ] S3 → create bucket `findit-photos-<yourname>` in ap-south-1, **Block all public access: ON**
- [ ] IAM → Roles → create role for **EC2** named `findit-ec2-role` with:
  - an inline policy allowing `s3:PutObject`, `s3:GetObject`, `s3:DeleteObject` on `arn:aws:s3:::findit-photos-<yourname>/*`
  - the managed policy `AmazonEC2ContainerRegistryReadOnly` (to pull images)

### Step 10. Security groups
EC2 → Security Groups:
- [ ] `findit-ec2-sg`
  - Inbound HTTP 80 from the prefix list **`com.amazonaws.global.cloudfront.origin-facing`** (only CloudFront can reach the server)
  - Inbound SSH 22 from **My IP**
- [ ] `findit-rds-sg`
  - Inbound PostgreSQL 5432 from **`findit-ec2-sg`** (the security group, not an IP)

> While testing before CloudFront exists (Step 16), you can temporarily allow port 80 from My IP. Remove it afterwards.

### Step 11. RDS PostgreSQL
- [ ] RDS → Create database → PostgreSQL, **Free tier** template
- [ ] Instance `db.t4g.micro` (or `db.t3.micro`), 20 GB storage
- [ ] DB identifier `findit-db`, master user `findit_admin`, strong password (save it in a password manager)
- [ ] **Public access: No**, security group `findit-rds-sg`
- [ ] Additional configuration → Initial database name: `findit`
- [ ] Note the **endpoint** once it is ready (`findit-db.xxxx.ap-south-1.rds.amazonaws.com`)

### Step 12. EC2 server
- [ ] EC2 → Launch instance: **Ubuntu Server 24.04 LTS**, `t3.micro`, 20 GB disk
- [ ] Key pair: create `findit-key` (download the `.pem`, keep it safe)
- [ ] Security group `findit-ec2-sg`, IAM instance profile `findit-ec2-role`
- [ ] Elastic IPs → allocate one → associate it with this instance
- [ ] Connect: `ssh -i findit-key.pem ubuntu@<elastic-ip>`
- [ ] Install Docker (includes Compose) and the AWS CLI:
  ```bash
  curl -fsSL https://get.docker.com | sudo sh
  sudo usermod -aG docker ubuntu      # log out and back in after this
  sudo snap install aws-cli --classic
  sudo apt install -y postgresql-client
  ```

### Step 13. Create the database tables
- [ ] Copy the SQL files from your laptop:
  ```bash
  scp -i findit-key.pem backend/db/schema.sql backend/db/migrations/001_add_proof_details.sql ubuntu@<elastic-ip>:~
  ```
- [ ] On EC2, run them against RDS:
  ```bash
  psql "postgresql://findit_admin:<password>@<rds-endpoint>:5432/findit?sslmode=require" -f schema.sql
  psql "postgresql://findit_admin:<password>@<rds-endpoint>:5432/findit?sslmode=require" -f 001_add_proof_details.sql
  ```
- [ ] Create the admin account (the same way you did locally), with a **strong password**

---

## Phase 3: Deploy

### Step 14. Push the images to ECR (laptop)
- [ ] ECR → create two private repositories: `findit-frontend`, `findit-backend`
- [ ] Log in, build, tag and push (replace `<acct>` with your 12-digit AWS account ID):
  ```bash
  aws ecr get-login-password --region ap-south-1 | docker login --username AWS --password-stdin <acct>.dkr.ecr.ap-south-1.amazonaws.com

  docker build -t <acct>.dkr.ecr.ap-south-1.amazonaws.com/findit-backend:v1 ./backend
  docker build -t <acct>.dkr.ecr.ap-south-1.amazonaws.com/findit-frontend:v1 ./frontend

  docker push <acct>.dkr.ecr.ap-south-1.amazonaws.com/findit-backend:v1
  docker push <acct>.dkr.ecr.ap-south-1.amazonaws.com/findit-frontend:v1
  ```
- [ ] Generate a strong `JWT_SECRET` (save it for the next step):
  ```bash
  node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
  ```

### Step 15. Run the containers on EC2
- [ ] Copy `docker-compose.prod.yml` to the server (`scp`, like Step 13). It uses the ECR images, has `restart: unless-stopped`, publishes only `80:80` on the frontend, and reads the backend settings from `.env`
- [ ] On EC2, create `~/.env` (never commit this file):
  ```
  DATABASE_URL=postgresql://findit_admin:<password>@<rds-endpoint>:5432/findit
  JWT_SECRET=<generated secret>
  APP_TIMEZONE=Asia/Kolkata
  S3_BUCKET=findit-photos-<yourname>
  AWS_REGION=ap-south-1
  PORT=5000
  ```
- [ ] Start:
  ```bash
  aws ecr get-login-password --region ap-south-1 | docker login --username AWS --password-stdin <acct>.dkr.ecr.ap-south-1.amazonaws.com
  docker compose -f docker-compose.prod.yml pull
  docker compose -f docker-compose.prod.yml up -d
  docker compose -f docker-compose.prod.yml logs -f backend
  ```
- [ ] Quick check from the server: `curl http://localhost/api/ping` returns `{"message":"Backend is alive"}`

### Step 16. CloudFront for HTTPS
CloudFront → Create distribution:
- [ ] **Origin domain**: the EC2 public DNS name (`ec2-<elastic-ip-with-dashes>.ap-south-1.compute.amazonaws.com`). CloudFront needs a name, not a bare IP
- [ ] **Origin protocol**: HTTP only, port 80
- [ ] **Default behavior** (covers `/api/*`, `/uploads/*` and the pages):
  - Viewer protocol policy: **Redirect HTTP to HTTPS**
  - Allowed methods: **GET, HEAD, OPTIONS, PUT, POST, PATCH, DELETE**
  - Cache policy: **CachingDisabled**
  - Origin request policy: **AllViewerExceptHostHeader** (passes the `Authorization` header and query strings through)
- [ ] **Extra behavior** for `/assets/*` (Vite's hashed JS/CSS files): cache policy **CachingOptimized**
- [ ] WAF: do not enable (it costs extra)
- [ ] Wait until the status is "Deployed", then open `https://dxxxx.cloudfront.net`

### Step 17. Test live and clean up
- [ ] Sign up, log in, report lost and found items with photos, approve a match as admin, check notifications
- [ ] Refresh on a deep page (for example `/browse`); it must not show a 404
- [ ] Camera capture works on a phone over HTTPS
- [ ] Remove the temporary "port 80 from My IP" rule if you added one
- [ ] Delete all test accounts (the ones using `password123`)
- [ ] Admin account uses a strong password

---

## Updating to a new version (manual)

1. On your laptop: build both images with a new tag (`:v2`) and push them (Step 14).
2. On EC2: change the tags in `docker-compose.prod.yml` to `:v2`, then run `pull` and `up -d` (Step 15).
3. Database changes: run the new migration file with `psql` (Step 13) **before** starting the new backend.
4. If something breaks, set the tags back to `:v1` and run `up -d` again.

---

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| CloudFront shows 502/504 | Container not running, or `findit-ec2-sg` doesn't allow the CloudFront prefix list on port 80 |
| Backend logs show "connection timed out" to RDS | `findit-rds-sg` doesn't allow 5432 from `findit-ec2-sg` |
| Backend logs mention SSL or "no pg_hba.conf entry" | SSL not enabled in `db.js` (Step 2) |
| Photo upload fails with 413 | `client_max_body_size` missing in `nginx.conf` |
| Photo upload fails with "Access Denied" | IAM role missing S3 permissions, or wrong bucket name in `.env` |
| `/browse` refresh gives 404 | `nginx.conf` missing the `index.html` fallback |
| Every request returns 401 after login | `Authorization` header not forwarded: check the origin request policy |
| Backend crashes with "invalid ELF header" | Windows `node_modules` copied into the image: check `.dockerignore` |

---

## Later: optimization

Not part of the first deployment. Start these once the manual deployment works:

- [ ] **GitHub Actions CI/CD**: on push, build images → push to ECR → deploy to EC2
- [ ] **CloudWatch**: container logs and CPU/disk alarms
- [ ] **SNS**: email alerts for flagged and approved matches
- [ ] **Login rate limit** with `express-rate-limit` (needs `app.set('trust proxy', ...)` behind CloudFront)
- [ ] **Terraform** for the AWS setup
- [ ] Update the project report's AWS section
