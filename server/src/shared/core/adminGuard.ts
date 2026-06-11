import { Result } from './Result';
import { isAdminRole } from '../middleware/auth';
import { UserModel } from '../../modules/users/DBSchemas/UserSchema';

/**
 * Shared BFLA guard for admin-only service methods: loads the requesting
 * user and verifies they hold an admin role.
 * `forbiddenMessage` is configurable because existing endpoints (and their
 * tests) expose different wording.
 */
export async function ensureAdmin(
  userId: string,
  forbiddenMessage = 'Forbidden: admin access required.'
): Promise<Result<void>> {
  const user = await UserModel.findById(userId, 'role');
  if (!user || !isAdminRole(user.role)) return Result.fail(forbiddenMessage);
  return Result.ok();
}
