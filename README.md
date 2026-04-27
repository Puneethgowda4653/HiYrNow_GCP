# HiYrNow

HiYrNow is a modern job portal application designed to connect job seekers with recruiters efficiently. It features a responsive Angular frontend and a robust Node.js backend with real-time capabilities.

## 🚀 Tech Stack

### Frontend
- **Framework**: Angular 17+
- **Styling**: TailwindCSS, Bootstrap, Angular Material
- **Features**: PWA support, Real-time notifications, Resume parsing integration
- **Location**: `app/`

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB (Mongoose)
- **Caching**: Redis
- **Background Jobs**: BullMQ
- **Documentation**: Swagger/OpenAPI
- **Location**: `job-portal-node-server-master/`

## 🛠️ Prerequisites

- **Node.js**: v18+ (Recommended)
- **npm**: v9+
- **MongoDB**: v5+ (Local or Atlas)
- **Redis**: v6+ (Required for session management and queues)

## 🏁 Step-by-Step Setup (Fresh Machine)

### 1. Clone the Repository
```bash
git clone <repository-url>
cd v0-main
```

### 2. Backend Setup
Navigate to the backend directory:
```bash
cd job-portal-node-server-master
```

Install dependencies:
```bash
npm install
```

Configure Environment Variables:
1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
2. Open `.env` and update the values:
   - `MONGODB_URI`: Connection string to your MongoDB instance.
   - `REDIS_HOST` & `REDIS_PORT`: Redis configuration.
   - `SESSION_SECRET`: Set a strong random string.
   - `GOOGLE_CLIENT_ID`, `LINKEDIN_CLIENT_ID`, etc.: API keys for integrations.

Start the Backend:
```bash
# Development Mode (with nodemon)
npm run dev

# Production Mode
npm start
```
*The server typically runs on port 5500.*

### 3. Frontend Setup
Open a new terminal and navigate to the frontend directory:
```bash
cd app
```

Install dependencies:
```bash
npm install
```

Start the Frontend:
```bash
# Development Server
npm start
# OR
ng serve
```
*The application will be available at `http://localhost:4200`.*

## 🔑 Environment Variables Reference

A complete list of required environment variables can be found in `job-portal-node-server-master/.env.example`.

**Critical Variables:**
- `PORT`: Backend port (default: 5500).
- `MONGODB_URI`: Database connection string.
- `SESSION_SECRET`: Secret for signing session cookies.
- `REDIS_HOST`: Redis hostname.
- `EMAIL_PASS`: Password/App Token for email service (Gmail/SMTP).

## 🚀 Deployment Guide

### Production Build (Frontend)
```bash
cd app
npm run build:prod
```
The build artifacts will be verified in `dist/app`. Serve these static files using Nginx or Apache.

### Production Run (Backend)
Ensure `NODE_ENV=production` is set in your environment.
Use a process manager like PM2:
```bash
cd job-portal-node-server-master
pm2 start server.js --name "hiyrnow-backend"
```

## 📝 Documentation
- **API Documentation**: Available at `/api-docs` when backend is running (Swagger).
- **Project Roadmap**: See [ROADMAP.md](ROADMAP.md).
- **Known Issues**: See [KNOWN_ISSUES.md](KNOWN_ISSUES.md).
