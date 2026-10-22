import { PrismaClient } from '@prisma/client';
export const prisma = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
});
export async function connectDatabase() {
    try {
        await prisma.$connect();
        console.log('[Database] Connected to PostgreSQL successfully via Prisma.');
        return true;
    }
    catch (error) {
        console.warn(`[Database] Warning: Could not connect to PostgreSQL: ${error.message}`);
        return false;
    }
}
