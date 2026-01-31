import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { app } from './app';

dotenv.config();

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/werewolf_db';

const start = async () => {
  try {
    // 1. Connect to Database [cite: 2]
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // 2. Start Server
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('❌ Error starting server:', error);
    process.exit(1);
  }
};

start();