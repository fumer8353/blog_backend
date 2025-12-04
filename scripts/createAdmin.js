import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import User from '../models/user.js';

dotenv.config();

mongoose.connect('mongodb://localhost:27017/blogapp_db', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('MongoDB connected'))
.catch(err => console.error('MongoDB connection error:', err));

const createAdminUser = async () => {
  try {
    // Admin user details
    const adminUser = {
      id: `user:${uuidv4()}`,
      name: 'Admin User',
      email: 'fumer8353@gmail.com',
      role: 'admin',
      createdAt: new Date().toISOString()
    };
    // Hash the password
    const password = 'admin123'; // You can change this
    const salt = await bcrypt.genSalt(10);
    adminUser.password = await bcrypt.hash(password, salt);
    const existingAdmin = await User.findByEmail(adminUser.email);
    if (existingAdmin) {
      console.log('Admin user already exists');
      return;
    }
    await User.create(adminUser);
    console.log('Admin user created successfully');
    console.log('Email:', adminUser.email);
    console.log('Password:', password);
    console.log('Please change the password after first login');
  } catch (error) {
    console.error('Error creating admin user:', error);
    process.exit(1);
  }
};

// Run the script
createAdminUser(); 