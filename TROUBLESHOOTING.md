# Backend Troubleshooting Guide

## Quick Diagnostic Steps

### 1. Check Azure App Service Logs

**Method 1: Log Stream (Real-time)**
1. Azure Portal → Your App Service → **Log stream**
2. Watch for error messages when the app starts
3. Look for:
   - ❌ Error messages
   - ⚠️ Warning messages
   - ✅ Success messages

**Method 2: Application Logs (Historical)**
1. Azure Portal → Your App Service → **Monitoring** → **Logs**
2. Enable "Application Logging (Filesystem)"
3. Set level to "Verbose"
4. Click "Save" and wait 5 minutes
5. Go to **Advanced Tools** → **Go** → **Log Files** → **LogFiles** → **Application**

### 2. Test Health Endpoint

After deployment, test:
```
https://blog-backend-c6fvc7d5c2dfbkg7.canadacentral-01.azurewebsites.net/health
```

**Expected Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-...",
  "uptime": 123.45,
  "environment": "production",
  "database": "connected" or "disconnected",
  "mongodbState": "connected" or "disconnected"
}
```

**If you get:**
- **502/503**: Server is crashing or not starting
- **404**: Routes not configured (check server.js)
- **500**: Application error (check logs)

### 3. Common Error Messages & Solutions

#### Error: "Missing required environment variable: JWT_SECRET"
**Solution:**
1. Azure Portal → App Service → Configuration → Application settings
2. Add: `JWT_SECRET` = [your-secret-key]
3. Click **Save**
4. **Restart** App Service

#### Error: "MONGO_URI not defined"
**Solution:**
1. Azure Portal → App Service → Configuration → Application settings
2. Add: `MONGO_URI` = [your-cosmos-db-connection-string]
   OR `MONGODB_URI` = [your-cosmos-db-connection-string]
3. Click **Save**
4. **Restart** App Service

#### Error: "MongoDB connection error"
**Possible Causes:**
1. **Wrong connection string**: Verify Cosmos DB connection string
2. **Firewall blocking**: Check Cosmos DB firewall settings
3. **Network issues**: Ensure Azure services can access Cosmos DB

**Solution:**
1. Get connection string from: Azure Portal → Cosmos DB → Connection Strings
2. Format should be: `mongodb://...` or `mongodb+srv://...`
3. Check Cosmos DB → Networking → Firewall
   - Allow access from Azure services: **ON**
   - Or add App Service outbound IPs

#### Error: "Cannot find module 'X'"
**Solution:**
1. Ensure `package.json` includes the module
2. Azure should run `npm install` automatically
3. If not, check deployment logs
4. Manually trigger: Azure Portal → App Service → SSH → Run `npm install`

#### Error: "Port already in use" or "EADDRINUSE"
**Solution:**
- Azure App Service sets PORT automatically
- Don't hardcode port numbers
- Use `process.env.PORT || 5000`

#### Error: Syntax errors or "Unexpected token"
**Solution:**
1. Test code locally first: `npm start`
2. Check for ES6/ESM syntax issues
3. Ensure `package.json` has `"type": "module"` for ES modules

### 4. Verify Environment Variables

Run this in Azure Portal → App Service → SSH or Console:

```bash
echo $NODE_ENV
echo $JWT_SECRET
echo $MONGO_URI
echo $FRONTEND_URL
```

All should return values (except maybe empty for some).

### 5. Test MongoDB Connection

If MongoDB connection is failing, test the connection string:

1. Get connection string from Cosmos DB
2. Test locally with MongoDB Compass or `mongosh`
3. Verify format is correct
4. Check if connection string includes database name

### 6. Check Node.js Version

Azure Portal → App Service → Configuration → General settings:
- **Stack**: Node.js
- **Version**: Should match `package.json` engines (>=22.0.0)

If version mismatch:
1. Update Node version in Azure
2. Or update `package.json` engines to match Azure version

### 7. Deployment Issues

#### If using GitHub Actions:
1. Check Actions tab in GitHub
2. Look for failed workflow runs
3. Check build/deploy logs

#### If using VS Code:
1. Check Output panel for deployment logs
2. Verify all files were uploaded
3. Check for upload errors

#### If using ZIP Deploy:
1. Ensure `node_modules` is included OR
2. Azure will run `npm install` automatically
3. Check that `package.json` is in root

### 8. Manual Restart

Sometimes a simple restart fixes issues:

1. Azure Portal → App Service → **Overview**
2. Click **Restart**
3. Wait 1-2 minutes
4. Test health endpoint again

### 9. Check Resource Limits

If app keeps crashing:
1. Azure Portal → App Service → **Metrics**
2. Check:
   - CPU usage
   - Memory usage
   - Request count
3. If hitting limits, scale up the App Service plan

### 10. Enable Detailed Error Pages

For development (disable in production):

1. Azure Portal → App Service → Configuration → General settings
2. Enable **Always On**: ON
3. Enable **Detailed error messages**: ON (for debugging)
4. Click **Save** and **Restart**

## Still Not Working?

1. **Check all logs** (Log stream, Application logs, Deployment logs)
2. **Verify all environment variables** are set correctly
3. **Test health endpoint** to see what's failing
4. **Check Cosmos DB** connection and firewall settings
5. **Verify Node.js version** matches requirements
6. **Restart App Service** after any configuration changes

## Getting Help

When asking for help, provide:
1. Error message from Log stream
2. Response from `/health` endpoint
3. Environment variables (without sensitive values)
4. Node.js version
5. Deployment method used

