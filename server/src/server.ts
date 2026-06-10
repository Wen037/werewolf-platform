import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { app } from './app';
import { ReminderService } from './shared/infra/ReminderService';

dotenv.config();

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/werewolf_db';

const REQUIRED_ENV = ['JWT_SECRET', 'MONGO_URI'];
const WARN_ENV = ['RESEND_API_KEY', 'FROM_EMAIL', 'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'FRONTEND_URL'];

const start = async () => {
  // Fail fast on truly required secrets; warn on optional-but-important ones
  for (const key of REQUIRED_ENV) {
    if (!process.env[key]) { console.error(`❌ Missing required env var: ${key}`); process.exit(1); }
  }
  for (const key of WARN_ENV) {
    if (!process.env[key]) { console.warn(`⚠  Missing env var: ${key} — related features will be disabled`); }
  }

  try {
    // 1. Connect to Database [cite: 2]
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // 2. Start background services
    new ReminderService().start();

    // 3. Start Server
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('❌ Error starting server:', error);
    process.exit(1);
  }
};

start();