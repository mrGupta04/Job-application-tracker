import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import { env } from '../config/env';
import { protect } from '../middleware/auth';
import { AuthRequest } from '../types/auth';

const router = express.Router();

const normalizeEmail = (value: unknown) => (typeof value === 'string' ? value.trim().toLowerCase() : '');
const normalizePassword = (value: unknown) => (typeof value === 'string' ? value.trim() : '');

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const createToken = (id: string) =>
  jwt.sign({ id }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  });

// Register
router.post('/register', async (req, res) => {
  const email = normalizeEmail(req.body?.email);
  const password = normalizePassword(req.body?.password);

  if (!emailPattern.test(email)) {
    return res.status(400).json({ message: 'Please provide a valid email address' });
  }

  if (password.length < 8 || password.length > 72) {
    return res.status(400).json({ message: 'Password must be 8-72 characters long' });
  }

  try {
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(409).json({ message: 'User already exists' });
    }

    const user = await User.create({ email, password });
    const token = createToken(user.id);
    return res.status(201).json({
      token,
      user: { id: user.id, email: user.email },
    });
  } catch (error) {
    return res.status(500).json({ message: 'Server error' });
  }
});

// Login
router.post('/login', async (req, res) => {
  const email = normalizeEmail(req.body?.email);
  const password = normalizePassword(req.body?.password);

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  try {
    const user = await User.findOne({ email }).select('+password');
    if (user && (await user.matchPassword(password))) {
      const token = createToken(user.id);
      return res.json({
        token,
        user: { id: user.id, email: user.email },
      });
    }

    return res.status(401).json({ message: 'Invalid credentials' });
  } catch (error) {
    return res.status(500).json({ message: 'Server error' });
  }
});

router.get('/me', protect, async (req: AuthRequest, res) => {
  return res.json({
    user: {
      id: req.user?._id,
      email: req.user?.email,
    },
  });
});

export default router;
