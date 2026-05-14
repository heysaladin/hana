import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({ log: ['error'] });

// Reuse client across warm serverless invocations
globalForPrisma.prisma = prisma;
