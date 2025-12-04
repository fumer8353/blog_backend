import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

const userSchema = new mongoose.Schema({
  id: { type: String, unique: true },
  name: String,
  email: { type: String, unique: true },
  password: String,
  role: { type: String, default: 'user' },
  createdAt: String,
  updatedAt: String
});

const UserModel = mongoose.models.User || mongoose.model('User', userSchema);

class User {
  static async create({ name, email, password, role = 'user' }) {
    const id = `user:${uuidv4()}`;
    const user = new UserModel({
      id,
      name,
      email,
      password,
      role,
      createdAt: new Date().toISOString()
    });
    await user.save();
    return user.toObject();
  }

  static async findByEmail(email) {
    return await UserModel.findOne({ email }).lean();
  }

  static async findById(id) {
    return await UserModel.findOne({ id }).lean();
  }

  static async update(id, updates) {
    const updatedUser = await UserModel.findOneAndUpdate(
      { id },
      { ...updates, updatedAt: new Date().toISOString() },
      { new: true }
    ).lean();
    return updatedUser;
  }

  static async delete(id) {
    const user = await UserModel.findOneAndDelete({ id });
    return !!user;
  }
}

export default User; 