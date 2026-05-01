import mongoose from 'mongoose';
import { UserModel, IUserDocument } from '../../modules/users/DBSchemas/UserSchema';

interface CreateTestUserOptions {
  username?: string;
  email?: string;
  role?: 'player' | 'admin' | 'web_admin';
  creditScore?: number;
}

export async function createTestUser(opts: CreateTestUserOptions = {}): Promise<IUserDocument> {
  const uid = new mongoose.Types.ObjectId().toString().slice(-6);
  return UserModel.create({
    username: opts.username ?? `user_${uid}`,
    email: opts.email ?? `user_${uid}@test.com`,
    passwordHash: '$2b$10$hashedfakepw',
    role: opts.role ?? 'player',
    creditScore: opts.creditScore ?? 100,
  });
}
