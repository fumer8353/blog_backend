import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import User from '../models/user.js';

dotenv.config();

// --- Helpers ---
const parseArgs = () => {
  const args = {};
  process.argv.slice(2).forEach(arg => {
    // Use split('=', 2) to only split on the first '=' character
    // This allows values to contain '=' characters (e.g., passwords with '=')
    const parts = arg.replace(/^--/, '').split('=', 2);
    if (parts.length === 2) {
      args[parts[0]] = parts[1];
    } else if (parts.length === 1) {
      // Handle flag without value (e.g., --help)
      args[parts[0]] = true;
    }
  });
  return args;
};

const args = parseArgs();

const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/blogapp_db';
const email = args.email || process.env.ADMIN_EMAIL;
const password = args.password || process.env.ADMIN_PASSWORD;
const name = args.name || process.env.ADMIN_NAME || 'Admin User';
const role = args.role || 'admin';

if (!email || !password) {
  console.error('❌ Missing email or password. Provide via --email=... --password=... or env ADMIN_EMAIL / ADMIN_PASSWORD');
  process.exit(1);
}

const connect = async () => {
  try {
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 10000,
    });
    console.log('✅ MongoDB connected');
  } catch (err) {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  }
};

const createAdminUser = async () => {
  try {
    const existingAdmin = await User.findByEmail(email);
    if (existingAdmin) {
      console.log('ℹ️ Admin user already exists with email:', email);
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(password, salt);

    const created = await User.create({
      name,
      email,
      password: hashed,
      role,
    });

    console.log('✅ Admin user created successfully');
    console.log('Email:', email);
    console.log('Password:', password);
    console.log('Note: Change this password after first login.');
  } catch (error) {
    console.error('❌ Error creating admin user:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
  }
};

const run = async () => {
  await connect();
  await createAdminUser();
};

run();