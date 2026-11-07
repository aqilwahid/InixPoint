import { randomUUID } from 'node:crypto';
import bcryptjs from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from './db';
import type { User, AuthTokenPayload } from '@inixpoint/shared';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key-change-in-prod';
const SALT_ROUNDS = 10;

export async function registerUser(email: string, password: string, name: string): Promise<{ success: boolean; user?: User; error?: string }> {
  try {
    // Check if user exists
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) return { success: false, error: 'Email sudah terdaftar' };

    // Hash password
    const passwordHash = await bcryptjs.hash(password, SALT_ROUNDS);
    const userId = randomUUID();
    const now = Date.now();

    // Insert user
    db.prepare('INSERT INTO users (id, email, password_hash, name, role, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run(userId, email, passwordHash, name, 'presenter', now);

    const user: User = { id: userId, email, name, role: 'presenter', createdAt: now };
    return { success: true, user };
  } catch (error) {
    return { success: false, error: `Register failed: ${error instanceof Error ? error.message : 'unknown'}` };
  }
}

export async function loginUser(email: string, password: string): Promise<{ success: boolean; user?: User; token?: string; error?: string }> {
  try {
    const row = db.prepare('SELECT id, password_hash, name, role, created_at FROM users WHERE email = ?').get(email) as any;
    if (!row) return { success: false, error: 'Email atau password salah' };

    const match = await bcryptjs.compare(password, row.password_hash);
    if (!match) return { success: false, error: 'Email atau password salah' };

    const user: User = { id: row.id, email, name: row.name, role: row.role, createdAt: row.created_at };
    const payload: AuthTokenPayload = { userId: row.id, email, role: row.role };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '30d' });

    return { success: true, user, token };
  } catch (error) {
    return { success: false, error: `Login failed: ${error instanceof Error ? error.message : 'unknown'}` };
  }
}

export function verifyToken(token: string): { valid: boolean; payload?: AuthTokenPayload; error?: string } {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as AuthTokenPayload;
    return { valid: true, payload };
  } catch (error) {
    return { valid: false, error: error instanceof Error ? error.message : 'Invalid token' };
  }
}

export function generateToken(userId: string, email: string, role: string): string {
  return jwt.sign({ userId, email, role }, JWT_SECRET, { expiresIn: '30d' });
}

// Middleware: extract token from Authorization header
export function extractToken(authHeader?: string): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  return authHeader.slice(7);
}
