import { Entity } from '../../../shared/core/Entity';

export type SkillLevel = 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';

export const SKILL_LEVEL_MAP: Record<SkillLevel, number> = {
  Beginner: 1,
  Intermediate: 2,
  Advanced: 3,
  Expert: 4,
};

export const PROFICIENCY_TO_SKILL: Record<number, SkillLevel> = {
  1: 'Beginner',
  2: 'Intermediate',
  3: 'Advanced',
  4: 'Expert',
};

export function calculateRank(
  eventsAttended: number,
  eventsHosted: number,
  noshows: number,
  lateCount: number
): string {
  const score = eventsAttended * 2 + eventsHosted * 3 - noshows * 5 - lateCount * 1;
  if (score < 5) return 'Newcomer';
  if (score < 20) return 'Regular';
  if (score < 50) return 'Veteran';
  if (score < 100) return 'Pro';
  return 'Legend';
}

interface UserProps {
  username: string;
  email: string;
  passwordHash: string;
  avatarUrl?: string;
  bio?: string;
  contactNumber?: string;
  proficiency: number;
  eventsAttended: number;
  eventsHosted: number;
  noshows: number;
  lateCount: number;
  likesReceived: number;
  rank: string;
  followersCount: number;
  followingCount: number;
  is_verified_creator: boolean;
  notifPreferences: {
    email: boolean;
    telegram: boolean;
    whatsapp: boolean;
  };
  telegramChatId?: string;
  whatsappPhone?: string;
}

export class User extends Entity<UserProps> {
  get id() { return this._id; }
  get username() { return this.props.username; }
  get email() { return this.props.email; }
  get proficiency() { return this.props.proficiency; }

  static create(props: UserProps, id?: string): User {
    return new User(props, id);
  }
}
