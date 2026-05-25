import { Router, type Request, type Response } from 'express';
import type { Router as RouterType } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { dbRun, dbGet, pool } from '../db/db.js';
import { config } from '../config/index.js';
import { authenticate, type AuthRequest } from '../middlewares/auth.js';
import { authLimiter, forgotPasswordLimiter } from '../middlewares/rate-limit.js';
import { avatarUpload } from '../middlewares/upload.js';
import type {
  RegisterRequest,
  LoginRequest,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  User,
} from '../db/db-schema.js';

const router: RouterType = Router();

// ─── Validation helpers ──────────────────────────────────────────────

const isValidEmail = (email: string): boolean =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const isValidMobile = (mobile: string): boolean =>
  /^\d{10}$/.test(mobile);

const isValidCountryCode = (code: string): boolean =>
  /^\+?\d{1,4}$/.test(code);

const isValidDateOfBirth = (dob: string): boolean => {
  const date = new Date(dob);
  if (isNaN(date.getTime())) return false;
  // Must be at least 18 years old
  const today = new Date();
  const age = today.getFullYear() - date.getFullYear();
  const monthDiff = today.getMonth() - date.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < date.getDate())) {
    return age - 1 >= 18;
  }
  return age >= 18;
};

const sanitizeUser = (user: User): Omit<User, 'password_hash' | 'reset_token' | 'reset_token_expires'> => {
  const { password_hash, reset_token, reset_token_expires, ...safeUser } = user;
  return safeUser;
};

const signToken = (user: User): string =>
  jwt.sign(
    { id: user.id, email: user.email, role: user.role ?? 'user' },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresInSeconds },
  );

async function createRefreshToken(userId: number): Promise<string> {
  const raw = crypto.randomBytes(64).toString('hex');
  const hash = crypto.createHash('sha256').update(raw).digest('hex');
  const expiresAt = new Date(Date.now() + config.refreshToken.expiresInMs);
  await pool.query(
    'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
    [userId, hash, expiresAt],
  );
  return raw;
}

// ─── POST /api/auth/register ─────────────────────────────────────────

router.post('/register', authLimiter, async (req: Request, res: Response) => {
  try {
    const body: RegisterRequest = req.body;
    const { firstname, surname, email, country_code, mobile_number, referral_code, password, date_of_birth } = body;

    // Required fields check
    if (!firstname || !surname || !email || !country_code || !mobile_number || !password || !date_of_birth) {
      return res.status(400).json({
        error: 'All fields are required: firstname, surname, email, country_code, mobile_number, password, date_of_birth.',
      });
    }

    // Validate firstname & surname
    if (firstname.trim().length < 2 || surname.trim().length < 2) {
      return res.status(400).json({ error: 'Firstname and surname must be at least 2 characters.' });
    }

    // Validate email
    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'Invalid email address.' });
    }

    // Validate country code
    if (!isValidCountryCode(country_code)) {
      return res.status(400).json({ error: 'Invalid country code. Must be 1-4 digits, optionally prefixed with +.' });
    }

    // Validate mobile number (10 digits)
    if (!isValidMobile(mobile_number)) {
      return res.status(400).json({ error: 'Mobile number must be exactly 10 digits.' });
    }

    // Validate password strength
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters.' });
    }

    // Validate date of birth (must be 18+)
    if (!isValidDateOfBirth(date_of_birth)) {
      return res.status(400).json({ error: 'Invalid date of birth or user must be at least 18 years old.' });
    }

    // Check if email already exists
    const existingEmail = await dbGet('SELECT id FROM users WHERE email = ?', [email.toLowerCase()]);
    if (existingEmail) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    // Check if mobile number already exists
    const existingMobile = await dbGet(
      'SELECT id FROM users WHERE country_code = ? AND mobile_number = ?',
      [country_code, mobile_number]
    );
    if (existingMobile) {
      return res.status(409).json({ error: 'An account with this mobile number already exists.' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(12);
    const password_hash = await bcrypt.hash(password, salt);

    // Insert user
    const result = await dbRun(
      `INSERT INTO users (firstname, surname, email, country_code, mobile_number, referral_code, password_hash, date_of_birth)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        firstname.trim(),
        surname.trim(),
        email.toLowerCase().trim(),
        country_code.trim(),
        mobile_number.trim(),
        referral_code?.trim() || null,
        password_hash,
        date_of_birth,
      ]
    );

    // Fetch created user
    const newUser: User = await dbGet('SELECT * FROM users WHERE id = ?', [result.lastID]);

    // Generate JWT and refresh token
    const token = signToken(newUser);
    const refresh_token = await createRefreshToken(newUser.id);

    res.status(201).json({
      message: 'Registration successful.',
      token,
      refresh_token,
      user: sanitizeUser(newUser),
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
});

// ─── POST /api/auth/login ────────────────────────────────────────────

router.post('/login', authLimiter, async (req: Request, res: Response) => {
  try {
    const { identifier, password }: LoginRequest = req.body;

    if (!identifier || !password) {
      return res.status(400).json({ error: 'Email/phone and password are required.' });
    }

    let user: User | null = null;

    // Determine if identifier is an email or phone number
    if (isValidEmail(identifier)) {
      user = await dbGet('SELECT * FROM users WHERE email = ?', [identifier.toLowerCase()]);
    } else {
      // Try matching by mobile number (strip leading zeros, match last 10 digits)
      const digits = identifier.replace(/\D/g, '');
      const mobile = digits.slice(-10);
      if (mobile.length === 10) {
        user = await dbGet('SELECT * FROM users WHERE mobile_number = ?', [mobile]);
      }
    }

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    // Generate JWT and refresh token
    const token = signToken(user);
    const refresh_token = await createRefreshToken(user.id);

    res.json({
      message: 'Login successful.',
      token,
      refresh_token,
      user: sanitizeUser(user),
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed. Please try again.' });
  }
});

// ─── POST /api/auth/forgot-password ──────────────────────────────────

router.post('/forgot-password', forgotPasswordLimiter, async (req: Request, res: Response) => {
  try {
    const { email }: ForgotPasswordRequest = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required.' });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'Invalid email address.' });
    }

    const user: User | null = await dbGet('SELECT * FROM users WHERE email = ?', [email.toLowerCase()]);

    // Always return success to prevent email enumeration
    if (!user) {
      return res.json({ message: 'If an account with that email exists, a reset token has been generated.' });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
    const expiresAt = new Date(Date.now() + config.resetToken.expiresInMs);

    await dbRun(
      'UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE id = ?',
      [resetTokenHash, expiresAt.toISOString().slice(0, 19).replace('T', ' '), user.id]
    );

    // In production, send this token via email. For now, return it in response.
    res.json({
      message: 'If an account with that email exists, a reset token has been generated.',
      // TODO: Remove reset_token from response once email service is integrated
      reset_token: resetToken,
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Failed to process request. Please try again.' });
  }
});

// ─── POST /api/auth/reset-password ───────────────────────────────────

router.post('/reset-password', async (req: Request, res: Response) => {
  try {
    const { token, new_password }: ResetPasswordRequest = req.body;

    if (!token || !new_password) {
      return res.status(400).json({ error: 'Token and new password are required.' });
    }

    if (new_password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters.' });
    }

    // Hash the provided token to match stored hash
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const user: User | null = await dbGet(
      'SELECT * FROM users WHERE reset_token = ? AND reset_token_expires > NOW()',
      [tokenHash]
    );

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired reset token.' });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(12);
    const password_hash = await bcrypt.hash(new_password, salt);

    // Update password and clear reset token
    await dbRun(
      'UPDATE users SET password_hash = ?, reset_token = NULL, reset_token_expires = NULL WHERE id = ?',
      [password_hash, user.id]
    );

    res.json({ message: 'Password reset successful. You can now log in with your new password.' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Failed to reset password. Please try again.' });
  }
});

// ─── GET /api/auth/me ────────────────────────────────────────────────

router.get('/me', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = await dbGet('SELECT * FROM users WHERE id = ?', [req.user!.id]);
    if (!user) return res.status(404).json({ error: 'User not found.' });
    const { password_hash, reset_token, reset_token_expires, ...safeUser } = user as any;
    res.json({ user: safeUser });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({ error: 'Failed to retrieve user.' });
  }
});

// ─── PUT /api/auth/profile ───────────────────────────────────────────

router.put('/profile', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { firstname, surname, country_code, mobile_number, date_of_birth } = req.body;

    if (!firstname || !surname || !country_code || !mobile_number || !date_of_birth) {
      return res.status(400).json({ error: 'All fields are required.' });
    }
    if (firstname.trim().length < 2 || surname.trim().length < 2) {
      return res.status(400).json({ error: 'Firstname and surname must be at least 2 characters.' });
    }
    if (!isValidCountryCode(country_code)) {
      return res.status(400).json({ error: 'Invalid country code.' });
    }
    if (!isValidMobile(mobile_number)) {
      return res.status(400).json({ error: 'Mobile number must be 10 digits.' });
    }
    if (!isValidDateOfBirth(date_of_birth)) {
      return res.status(400).json({ error: 'Invalid date of birth. Must be 18+.' });
    }

    await dbRun(
      'UPDATE users SET firstname = ?, surname = ?, country_code = ?, mobile_number = ?, date_of_birth = ? WHERE id = ?',
      [firstname.trim(), surname.trim(), country_code, mobile_number, date_of_birth, req.user!.id],
    );

    const updated = await dbGet('SELECT * FROM users WHERE id = ?', [req.user!.id]);
    const { password_hash, reset_token, reset_token_expires, ...safeUser } = updated as any;
    res.json({ message: 'Profile updated successfully.', user: safeUser });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile.' });
  }
});

// ─── POST /api/auth/avatar ────────────────────────────────────────────

router.post('/avatar', authenticate, (req: AuthRequest, res: Response) => {
  avatarUpload(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });
      if (!req.file) return res.status(400).json({ error: 'No image file provided' });

      const avatarUrl = `/uploads/avatars/${req.file.filename}`;
      await dbRun('UPDATE users SET avatar_url = ? WHERE id = ?', [avatarUrl, userId]);

      const updated = await dbGet('SELECT * FROM users WHERE id = ?', [userId]);
      const { password_hash, reset_token, reset_token_expires, ...safeUser } = updated as any;
      return res.json({ message: 'Avatar updated successfully.', user: safeUser });
    } catch (error) {
      console.error('Avatar upload error:', error);
      return res.status(500).json({ error: 'Failed to update avatar.' });
    }
  });
});

// ─── PUT /api/auth/change-password ───────────────────────────────────

router.put('/change-password', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { current_password, new_password } = req.body;

    if (!current_password || !new_password) {
      return res.status(400).json({ error: 'Current and new passwords are required.' });
    }
    if (new_password.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters.' });
    }

    const user = await dbGet('SELECT * FROM users WHERE id = ?', [req.user!.id]);
    if (!user) return res.status(404).json({ error: 'User not found.' });

    const valid = await bcrypt.compare(current_password, (user as any).password_hash);
    if (!valid) return res.status(401).json({ error: 'Current password is incorrect.' });

    const hash = await bcrypt.hash(new_password, 12);
    await dbRun('UPDATE users SET password_hash = ? WHERE id = ?', [hash, req.user!.id]);

    res.json({ message: 'Password changed successfully.' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Failed to change password.' });
  }
});

// ─── POST /api/auth/refresh ───────────────────────────────────────────

router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const { refresh_token } = req.body;
    if (!refresh_token || typeof refresh_token !== 'string') {
      return res.status(401).json({ error: 'Refresh token required.' });
    }

    const hash = crypto.createHash('sha256').update(refresh_token).digest('hex');
    const stored = await pool.query(
      'SELECT rt.id, rt.user_id, rt.expires_at FROM refresh_tokens rt WHERE rt.token_hash = $1',
      [hash],
    );

    if (!stored.rows[0]) {
      return res.status(401).json({ error: 'Invalid refresh token.' });
    }

    const row = stored.rows[0];
    if (new Date(row.expires_at) < new Date()) {
      await pool.query('DELETE FROM refresh_tokens WHERE id = $1', [row.id]);
      return res.status(401).json({ error: 'Refresh token expired. Please log in again.' });
    }

    const user: User | null = await dbGet('SELECT * FROM users WHERE id = ?', [row.user_id]);
    if (!user) {
      return res.status(401).json({ error: 'User not found.' });
    }

    // Rotate: delete old refresh token, issue new pair
    await pool.query('DELETE FROM refresh_tokens WHERE id = $1', [row.id]);
    const newToken = signToken(user);
    const newRefreshToken = await createRefreshToken(user.id);

    res.json({
      token: newToken,
      refresh_token: newRefreshToken,
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(500).json({ error: 'Failed to refresh token.' });
  }
});

// ─── POST /api/auth/logout ────────────────────────────────────────────

router.post('/logout', async (req: Request, res: Response) => {
  try {
    const { refresh_token } = req.body;
    if (refresh_token && typeof refresh_token === 'string') {
      const hash = crypto.createHash('sha256').update(refresh_token).digest('hex');
      await pool.query('DELETE FROM refresh_tokens WHERE token_hash = $1', [hash]);
    }
    res.json({ message: 'Logged out successfully.' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed.' });
  }
});

export default router;
