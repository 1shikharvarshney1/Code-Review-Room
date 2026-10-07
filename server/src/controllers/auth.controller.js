import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import User from '../models/User.js';
import env from '../config/env.js';

const registerSchema = z.object({
  username: z.string().min(3).max(20),
  email: z.string().email(),
  password: z.string().min(6),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

function signToken(user) {
  return jwt.sign({ id: user._id }, env.JWT_SECRET, { expiresIn: '7d' });
}

export async function register(req, res, next) {
  try {
    const body = registerSchema.parse(req.body);

    const existingEmail = await User.findOne({ email: body.email });
    if (existingEmail) {
      return res.status(409).json({ message: 'Email already in use' });
    }

    const existingUsername = await User.findOne({ username: body.username });
    if (existingUsername) {
      return res.status(409).json({ message: 'Username already taken' });
    }

    const passwordHash = await bcrypt.hash(body.password, 10);
    const user = await User.create({
      username: body.username,
      email: body.email,
      passwordHash,
    });

    const token = signToken(user);
    res.status(201).json({ token, user: user.toPublic() });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ message: err.errors[0].message });
    }
    next(err);
  }
}

export async function login(req, res, next) {
  try {
    const body = loginSchema.parse(req.body);

    const user = await User.findOne({ email: body.email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const valid = await user.comparePassword(body.password);
    if (!valid) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const token = signToken(user);
    res.json({ token, user: user.toPublic() });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ message: err.errors[0].message });
    }
    next(err);
  }
}

export async function me(req, res) {
  res.json({ user: req.user.toPublic() });
}
