import jwt from 'jsonwebtoken';
import { Context } from '../types/context.js';

export function getUser(authorization?: string) {
  if (!authorization) {
    return null;
  }

  const token = authorization.replace('Bearer ', '');

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    return {
      id: decoded.userId,
      email: decoded.email,
      role: decoded.role
    };
  } catch (error) {
    return null;
  }
}