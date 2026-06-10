import { PrismaClient } from "@prisma/client";

// Singleton pattern for Prisma Client with health check for new models
const prismaClientSingleton = () => {
  return new PrismaClient()
}

declare const globalThis: {
  prismaGlobal: PrismaClient | undefined;
} & typeof global;

// Singleton pattern for Prisma Client — use globalThis cache in ALL environments
// (serverless functions on Vercel need this to prevent connection exhaustion)
const getPrisma = () => {
  if (!globalThis.prismaGlobal) {
    globalThis.prismaGlobal = prismaClientSingleton();
  }
  return globalThis.prismaGlobal;
}

const prisma = getPrisma();

export default prisma;
