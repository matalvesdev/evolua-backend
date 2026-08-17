import { PrismaClient } from '@prisma/client';
import { env, isProductionLike } from '../config/env.js';

const prismaGlobal = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  prismaGlobal.prisma ??
  new PrismaClient({
    log: env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (!isProductionLike) prismaGlobal.prisma = prisma;
