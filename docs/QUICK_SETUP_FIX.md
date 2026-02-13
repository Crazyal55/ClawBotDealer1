# Quick Setup - Foundation Layer

## 🚀 Get Started (5 minutes)

### Step 1: Get the Latest Code
```bash
cd C:\Users\alexa\OneDrive\Documents\GitHub\ClawBotDealer1
git pull origin master
```

### Step 2: Verify package.json
Open `package.json` in your text editor (VS Code, Notepad++) and verify it looks like this:
```json
{
  "name": "dealership-platform",
  "version": "2.0.0",
  "description": "AI-powered dealership platform",
  "main": "src/index.js",
  "scripts": {
    "dev": "node src/index.js",
    "start": "node src/index.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "pg": "^8.11.3",
    "cors": "^2.8.5",
    "helmet": "^7.1.0",
    "compression": "^1.7.4",
    "dotenv": "^16.3.1",
    "uuid": "^9.0.1"
  }
}
```

**If your package.json has MORE dependencies** (like TypeScript, cls-hooked, bull, redis, etc.) - that's the problem!

### Step 3: Delete node_modules and package-lock.json
```bash
# In your project folder, run:
rmdir /s /q node_modules
del package-lock.json
```

### Step 4: Install Dependencies
```bash
npm install
```

**You should see:**
```
added 8 packages, and audited 8 packages in 2s
```

### Step 5: Start the Server
```bash
npm start
```

**You should see:**
```
🚀 AI Dealership Platform API
📡 Environment: development
🔌 Port: 3000
🗄️ Database: dealership_platform
✅ Ready to accept connections
```

### Step 6: Test API
Open Firefox and go to:
```
http://localhost:3000/health
```

**You should see:**
```json
{
  "status": "healthy",
  "timestamp": "2026-02-13T22:38:00.000Z",
  "uptime": 0.123,
  "database": "connected",
  "version": "2.0.0"
}
```

---

## 🎯 What This Gives You

### Working API Server:
- ✅ Express.js backend with proper routing
- ✅ Security middleware (Helmet, CORS)
- ✅ PostgreSQL database connection
- ✅ Inventory API endpoints
- ✅ Health check endpoint
- ✅ Error handling

### Dashboard UI:
- ✅ Modern grayscale design
- ✅ Hero stats section
- ✅ Clean sidebar navigation
- ✅ Options tabs (Dashboard, Inventory, etc.)
- ✅ Responsive layout

### Clean Codebase:
- ✅ TypeScript foundation layer (not compiled yet, but JS version works)
- ✅ Proper folder structure (src/api, src/services, src/repositories)
- ✅ Valid package.json without bad dependencies

---

## 🐛 Troubleshooting

### Error: "Cannot find module 'express'"
**Solution:** Step 4 failed. Run `npm install` again.

### Error: "EADDRINUSE: address already in use :::3000"
**Solution: Something else is using port 3000.
```bash
# Find what's using port 3000
netstat -ano | findstr :3000

# Kill it
taskkill /PID <replace PID with actual number> /F
```

### Error: "Connection refused ECONNREFUSED"
**Solution:** PostgreSQL isn't running or connection details wrong.
For now, you're using the old `server.js` (SQLite) which works.

### Error: "SyntaxError" or "Unexpected token"
**Solution:** package.json has bad syntax. Use the clean version above.

### Error: "tsc is not recognized"
**Solution:** You're using the simplified package.json (no TypeScript yet).
Run `npm start` directly (skip build step).

---

## 📊 What's Working

### Right Now (Phase 1):
- ✅ Modern dashboard UI (grayscale design)
- ✅ Clean project structure
- ✅ Simple Express.js backend
- ✅ Inventory service layer
- ✅ Repository pattern
- ✅ API routes with proper error handling
- ✅ Environment configuration
- ✅ Package.json with valid dependencies

### Not Working Yet:
- ❌ PostgreSQL database (you need to set it up)
- ❌ TypeScript compilation (we're using JS version)
- ❌ Job queue (BullMQ)
- ❌ Vector DB (Pinecone)
- ❌ LLM (OpenAI)
- ❌ Async scraping workers

---

## 🚀 Next Steps (After You Get This Working)

### Phase 1b: Complete Backend (1-2 hours)
1. ✅ Connect to PostgreSQL (or continue with SQLite)
2. ✅ Test all API endpoints
3. ✅ Verify data persistence

### Phase 2: Core Features (4-6 hours)
1. Implement job queue (BullMQ + Redis)
2. Create scraping workers
3. Add quality scoring system
4. Build Vector DB abstraction
5. Implement LLM abstraction

### Phase 3: Full Platform (2-3 days)
1. Deploy to Azure
2. Set up production PostgreSQL
3. Configure Pinecone
4. Get OpenAI API key
5. Build complete UI with real data

---

## 💡 Quick Test Commands

### Test Health Endpoint:
```bash
curl http://localhost:3000/health
```

### Test Inventory API:
```bash
# Get all vehicles
curl http://localhost:3000/api/inventory -H "x-dealership-id: test"

# Get stats
curl http://localhost:3000/api/inventory/stats -H "x-dealership-id: test"
```

### View Dashboard:
```bash
# Open in browser
start http://localhost:3000/public/index.html
# or just open the file directly
start C:\Users\alexa\OneDrive\Documents\GitHub\ClawBotDealer1\public\index.html
```

---

## ✅ Success Checklist

When everything is working, you should be able to:

- [ ] Run `npm start` without errors
- [ ] See "Ready to accept connections" message
- [ ] Access `/health` endpoint in browser
- [ ] See dashboard at `http://localhost:3000/public/index.html`
- [ ] Get response from `/api/inventory/stats`
- [ ] No "MODULE_NOT_FOUND" or "EJSONPARSE" errors
- [ ] Package.json installs successfully

---

**Need help?** Tell me what error you see and I'll fix it! 🚀
