import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Context } from '../types/context.js';

export const authResolvers = {
  Mutation: {
    register: async (_: any, { email, password, name }: any, { prisma }: Context) => {
      const existingUser = await prisma.user.findUnique({
        where: { email }
      });

      if (existingUser) {
        throw new Error('User already exists with this email');
      }

      const hashedPassword = await bcrypt.hash(password, 12);
      
      const user = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          name
        }
      });

      const token = jwt.sign(
        { userId: user.id, email: user.email, role: user.role },
        process.env.JWT_SECRET!,
        { expiresIn: '7d' }
      );

      return {
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          createdAt: user.createdAt.toISOString()
        }
      };
    },

    login: async (_: any, { email, password }: any, { prisma }: Context) => {
      const user = await prisma.user.findUnique({
        where: { email }
      });

      if (!user) {
        throw new Error('Invalid email or password');
      }

      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        throw new Error('Invalid email or password');
      }

      const token = jwt.sign(
        { userId: user.id, email: user.email, role: user.role },
        process.env.JWT_SECRET!,
        { expiresIn: '7d' }
      );

      return {
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          createdAt: user.createdAt.toISOString()
        }
      };
    }
  },

  Query: {
    me: async (_: any, __: any, { prisma, user }: Context) => {
      if (!user) {
        throw new Error('Not authenticated');
      }

      const userData = await prisma.user.findUnique({
        where: { id: user.id }
      });

      if (!userData) {
        throw new Error('User not found');
      }

      return {
        id: userData.id,
        email: userData.email,
        name: userData.name,
        role: userData.role,
        createdAt: userData.createdAt.toISOString()
      };
    }
  }
};