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
const requiredEnvVars = ['JWT_SECRET', 'NODE_ENV'];

if (process.env.NODE_ENV === 'production') {
  requiredEnvVars.push('FRONTEND_URL');
}

requiredEnvVars.forEach(envVar => {
  if (!process.env[envVar]) {
    console.error(`❌ Missing required environment variable: ${envVar}`);
    process.exit(1);
  }
});

// ===== Connect to MongoDB =====
const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;

if (!mongoUri) {
  console.error('❌ MONGO_URI not defined in environment variables');
  process.exit(1);
}

mongoose.connect(mongoUri)
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  });


// ===== Initialize App =====
const app = express();

// ===== CORS Configuration =====
// Allow multiple origins for flexibility
const allowedOrigins = process.env.NODE_ENV === 'production'
  ? [
      process.env.FRONTEND_URL,
      'https://ambitious-glacier-058b0710f.3.azurestaticapps.net',
      // Add any other production frontend URLs here
    ].filter(Boolean) // Remove undefined values
  : ['http://localhost:3000', 'http://localhost:3001'];

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

// ===== Routes =====
app.use('/api/admin', authenticateToken, adminRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/posts', publicRoutes);

// ===== Start Server =====
const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT} in ${process.env.NODE_ENV} mode`);
  console.log(`🌐 Frontend URL: ${process.env.FRONTEND_URL || 'not configured'}`);
});
