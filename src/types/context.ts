import { PrismaClient } from '@prisma/client';

export interface Context {
  prisma: PrismaClient;
  user?: {
    id: string;
    email: string;
    role: string;
  };
}