import { PrismaClient } from '@prisma/client';
export declare const prisma: PrismaClient<{
    log: ("warn" | "error")[];
}, "warn" | "error", import("@prisma/client/runtime/library").DefaultArgs>;
export declare function connectDatabase(): Promise<boolean>;
