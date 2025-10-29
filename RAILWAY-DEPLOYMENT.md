# 🚂 Railway Deployment Guide

## Prerequisites
1. Railway account (https://railway.app)
2. GitHub repository connected

## Deployment Steps

### 1. Create New Project on Railway
1. Go to https://railway.app/new
2. Select "Deploy from GitHub repo"
3. Choose `negotiations-postgres` repository
4. Railway will auto-detect Node.js project

### 2. Add PostgreSQL Database
1. Click "New" → "Database" → "Add PostgreSQL"
2. Railway will automatically:
   - Create PostgreSQL instance
   - Set `DATABASE_URL` environment variable
   - Connect database to your app

### 3. Configure Environment Variables
In Railway project settings, add these variables:

```env
# Required
NODE_ENV=production
PORT=3000
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4o

# Security (generate random strings)
ADMIN_TOKEN=your_secure_random_token_here

# Optional - will use DATABASE_URL from Railway PostgreSQL
# DATABASE_URL is automatically set by Railway
```

### 4. Deploy
1. Push to GitHub:
   ```bash
   git push origin main
   ```
2. Railway will automatically:
   - Build the application
   - Run migrations (via initializeDatabase())
   - Start the server
   - Assign a public URL

### 5. Verify Deployment
After deployment completes:
1. Click "Open App" to see your application
2. Test endpoints:
   - `https://your-app.railway.app/health` - Health check
   - `https://your-app.railway.app/` - Main application

### Database Initialization
The application automatically:
- Creates all tables on first run
- Sets up indexes
- Initializes default data
- No manual migration needed!

### Monitoring
Railway provides:
- Real-time logs
- Metrics dashboard
- Automatic restarts on failure
- SSL certificates (automatic)

### Troubleshooting

**Database connection issues:**
```bash
# Check DATABASE_URL is set
echo $DATABASE_URL
```

**OpenAI API issues:**
```bash
# Verify OPENAI_API_KEY is set
# Check logs for "OpenAI client initialized successfully"
```

**Port issues:**
Railway automatically sets PORT environment variable. The app uses:
```javascript
const PORT = process.env.PORT || 3000;
```

### Scaling
Railway allows easy scaling:
1. Go to project settings
2. Adjust resources (CPU/RAM)
3. Enable auto-scaling if needed

---

✅ Your app is production-ready for Railway deployment!

## Environment Variables Reference

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `DATABASE_URL` | ✅ Auto | PostgreSQL connection | `postgres://user:pass@host:5432/db` |
| `OPENAI_API_KEY` | ✅ Manual | OpenAI API key | `sk-proj-...` |
| `NODE_ENV` | ✅ Manual | Environment | `production` |
| `PORT` | ✅ Auto | Server port | `3000` |
| `OPENAI_MODEL` | ⚠️ Optional | AI model | `gpt-4o` (default) |
| `ADMIN_TOKEN` | ⚠️ Optional | Admin auth | Random string |

## Post-Deployment Checklist
- [ ] Database connected and initialized
- [ ] `/health` endpoint returns 200
- [ ] Can login with default credentials
- [ ] Can create clients
- [ ] AI analysis works
- [ ] PWA manifest loads
- [ ] No console errors

🎉 Done! Your TeamPulse app is live on Railway!
