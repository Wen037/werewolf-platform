import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { UserModel } from '../../modules/users/DBSchemas/UserSchema';

/**
 * Google OAuth 2.0 Strategy
 *
 * Required env vars:
 *   GOOGLE_CLIENT_ID     — from Google Cloud Console > APIs & Services > Credentials
 *   GOOGLE_CLIENT_SECRET — same location
 *
 * Callback URL must be registered in Google Cloud Console:
 *   Production : https://api.werewolf.sg/api/auth/google/callback   (note: API runs on the "api" subdomain, NOT bare werewolf.sg)
 *   Development: http://localhost:5000/api/auth/google/callback
 *
 * Three cases handled:
 *   1. Existing googleId  → return existing user (returning Google login)
 *   2. Same email, no googleId → link Google to existing email/password account
 *   3. New user entirely  → create account (no OTP needed for OAuth)
 */
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      // Use an absolute URL so Railway's HTTP-internal proxy doesn't cause
      // passport to resolve the callback as http:// instead of https://.
      // In dev the Vite proxy isn't involved here — the server runs directly
      // on localhost:5000, so http://localhost is correct for dev.
      callbackURL: process.env.NODE_ENV === 'production'
        ? 'https://api.werewolf.sg/api/auth/google/callback'
        : 'http://localhost:5000/api/auth/google/callback',
    },
    async (_accessToken, _refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value;
        if (!email) return done(new Error('No email returned from Google.'));

        // Helper: serialise a Mongoose doc to the shape Express.User expects.
        // `isNewUser` lets the callback route tell the frontend that this
        // account was just created via Google, so it can prompt the user to
        // pick their own nickname instead of keeping the auto-generated one.
        const toPayload = (doc: { _id: { toString(): string }; email?: string }, isNewUser = false) =>
          ({ userId: doc._id.toString(), email: doc.email ?? '', isNewUser });

        // Case 1: already linked
        let user = await UserModel.findOne({ googleId: profile.id });
        if (user) return done(null, toPayload(user));

        // Case 2: same email — link Google ID to existing account
        user = await UserModel.findOneAndUpdate(
          { email },
          { $set: { googleId: profile.id } },
          { new: true }
        );
        if (user) return done(null, toPayload(user));

        // Case 3: brand new user via Google
        const baseUsername = (profile.displayName ?? email.split('@')[0])
          .replace(/\s+/g, '_')
          .toLowerCase()
          .replace(/[^a-z0-9_]/g, '');

        // Ensure username is unique by appending a suffix if needed
        let username = baseUsername || `user_${Date.now()}`;
        const conflict = await UserModel.findOne({ username });
        if (conflict) username = `${username}_${Date.now()}`;

        const avatarUrl = profile.photos?.[0]?.value;
        user = await UserModel.create({
          googleId: profile.id,
          email,
          username,
          passwordHash: 'google_oauth_no_password',
          ...(avatarUrl ? { avatarUrl } : {}),
        });

        return done(null, toPayload(user, true));
      } catch (err) {
        return done(err as Error);
      }
    }
  )
);

export default passport;
