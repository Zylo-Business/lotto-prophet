import { Router, type Request, type Response } from 'express';
import type { Router as RouterType } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { dbRun, dbGet } from '../db/db.js';
import { config } from '../config/index.js';
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

// ─── POST /api/auth/register ─────────────────────────────────────────

router.post('/register', async (req: Request, res: Response) => {
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

    // Generate JWT
    const token = signToken(newUser);

    res.status(201).json({
      message: 'Registration successful.',
      token,
      user: sanitizeUser(newUser),
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
});

// ─── POST /api/auth/login ────────────────────────────────────────────

router.post('/login', async (req: Request, res: Response) => {
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

    // Generate JWT
    const token = signToken(user);

    res.json({
      message: 'Login successful.',
      token,
      user: sanitizeUser(user),
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed. Please try again.' });
  }
});

// ─── POST /api/auth/forgot-password ──────────────────────────────────

router.post('/forgot-password', async (req: Request, res: Response) => {
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

export default router;
