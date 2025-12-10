// server.js

// Load environment before anything else
import './config/loadEnv.js';

import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import { authenticateToken } from './middleware/auth.js';
import adminRoutes from './routes/admin.js';
import authRoutes from './routes/auth.js';
import publicRoutes from './routes/public.js';

// ===== Validate Required Environment Variables =====
console.log('🔍 Checking environment variables...');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('PORT:', process.env.PORT);

const requiredEnvVars = ['JWT_SECRET'];

// Warn about missing variables but don't exit immediately
requiredEnvVars.forEach(envVar => {
  if (!process.env[envVar]) {
    console.error(`❌ Missing required environment variable: ${envVar}`);
    console.error('⚠️ Server will start but authentication will fail');
  } else {
    console.log(`✅ ${envVar} is set`);
  }
});

if (process.env.NODE_ENV === 'production' && !process.env.FRONTEND_URL) {
  console.warn('⚠️ FRONTEND_URL not set in production - CORS may not work correctly');
} else if (process.env.FRONTEND_URL) {
  console.log(`✅ FRONTEND_URL: ${process.env.FRONTEND_URL}`);
}

// ===== Connect to MongoDB =====
const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;

if (!mongoUri) {
  console.error('❌ MONGO_URI not defined in environment variables');
  console.error('⚠️ Server will start but database operations will fail');
} else {
  console.log('🔗 Attempting MongoDB connection...');
  
  // Set connection options for better reliability
  const mongooseOptions = {
    serverSelectionTimeoutMS: 10000, // 10 seconds
    socketTimeoutMS: 45000,
    maxPoolSize: 10,
  };

  mongoose.connect(mongoUri, mongooseOptions)
    .then(() => {
      console.log('✅ MongoDB connected successfully');
      console.log('📊 Database:', mongoose.connection.name);
    })
    .catch(err => {
      console.error('❌ MongoDB connection error:', err.message);
      console.error('⚠️ Server will continue but database operations will fail');
      console.error('💡 Check your MONGO_URI connection string and network settings');
    });
}


// ===== Initialize App =====
const app = express();

// ===== CORS Configuration =====
// Allow multiple origins for flexibility
// Priority: FRONTEND_URL environment variable (required in production)
// Additional origins can be set via FRONTEND_URLS (comma-separated)
const getAllowedOrigins = () => {
  if (process.env.NODE_ENV === 'production') {
    const origins = [];
    
    // Primary frontend URL from environment variable (required)
    if (process.env.FRONTEND_URL) {
      const url = process.env.FRONTEND_URL.trim();
      // Remove trailing slash if present
      origins.push(url.endsWith('/') ? url.slice(0, -1) : url);
    } else {
      console.warn('⚠️ FRONTEND_URL environment variable is not set in production!');
      console.warn('💡 Set it in Azure App Service → Configuration → Application settings');
    }
    
    // Additional frontend URLs (optional, comma-separated)
    if (process.env.FRONTEND_URLS) {
      const additionalUrls = process.env.FRONTEND_URLS.split(',')
        .map(url => url.trim())
        .filter(url => url.length > 0)
        .map(url => url.endsWith('/') ? url.slice(0, -1) : url);
      origins.push(...additionalUrls);
    }
    
    return origins.filter(Boolean); // Remove any undefined/null values
  }
  
  // Development: allow localhost origins
  return ['http://localhost:3000', 'http://localhost:3001'];
};

const allowedOrigins = getAllowedOrigins();

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV !== 'production') {
      callback(null, true);
    } else {
      console.warn(`⚠️ CORS blocked origin: ${origin}`);
      console.log(`✅ Allowed origins: ${allowedOrigins.join(', ')}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'Access-Control-Allow-Origin',
    'X-Environment'
  ],
  exposedHeaders: ['X-Total-Count'],
  maxAge: 86400,
};

app.use(cors(corsOptions));

// Handle preflight requests explicitly
app.options('*', cors(corsOptions));

console.log('🔧 CORS Configuration:', {
  allowedOrigins,
  environment: process.env.NODE_ENV,
  frontendUrl: process.env.FRONTEND_URL
});

// ===== Request Logging Middleware =====
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log({
      timestamp: new Date().toISOString(),
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: `${duration}ms`,
      userAgent: req.get('user-agent'),
      ip: req.ip,
      origin: req.get('origin'),
      environment: req.get('X-Environment') || 'development',
    });
  });
  next();
});

// ===== Body Parsers =====
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ===== Health Check Endpoint =====
app.get('/health', (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    mongodbState: ['disconnected', 'connected', 'connecting', 'disconnecting'][mongoose.connection.readyState] || 'unknown'
  };
  res.status(health.database === 'connected' ? 200 : 503).json(health);
});

// ===== Routes =====
app.use('/api/admin', authenticateToken, adminRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/posts', publicRoutes);

// ===== Error Handling Middleware =====
app.use((err, req, res, next) => {
  console.error('❌ Unhandled error:', err);
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : err.message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
});

// ===== 404 Handler =====
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ===== Start Server =====
const PORT = process.env.PORT || 5000;

// Graceful shutdown handling
process.on('SIGTERM', () => {
  console.log('⚠️ SIGTERM received, shutting down gracefully...');
  mongoose.connection.close().then(() => {
    console.log('✅ MongoDB connection closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('⚠️ SIGINT received, shutting down gracefully...');
  mongoose.connection.close().then(() => {
    console.log('✅ MongoDB connection closed');
    process.exit(0);
  });
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Promise Rejection:', err);
  // Don't exit in production, let Azure handle restarts
  if (process.env.NODE_ENV !== 'production') {
    process.exit(1);
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
  // Always exit on uncaught exceptions
  process.exit(1);
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 Frontend URL: ${process.env.FRONTEND_URL || 'not configured'}`);
  console.log(`💚 Health check: http://localhost:${PORT}/health`);
});
