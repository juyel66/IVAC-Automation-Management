import { prisma } from '../config/database.js';
import { CryptoService } from '../services/crypto.service.js';
import { ENV } from '../config/env.js';
async function seed() {
    console.log('[Seed] Initializing database seed...');
    // 1. Initial Admin
    const existingAdmin = await prisma.admin.findFirst({
        where: {
            OR: [
                { email: ENV.INITIAL_ADMIN_EMAIL },
                { username: ENV.INITIAL_ADMIN_USERNAME },
            ],
        },
    });
    if (!existingAdmin) {
        const passwordHash = await CryptoService.hashPassword(ENV.INITIAL_ADMIN_PASSWORD);
        const admin = await prisma.admin.create({
            data: {
                email: ENV.INITIAL_ADMIN_EMAIL,
                username: ENV.INITIAL_ADMIN_USERNAME,
                passwordHash,
                role: 'SUPER_ADMIN',
                isActive: true,
            },
        });
        console.log(`[Seed] ✅ Superadmin created: ${admin.username} (${admin.email})`);
    }
    else {
        console.log(`[Seed] ℹ️  Superadmin already exists: ${existingAdmin.username}`);
    }
    // 2. Default Payment Plans
    const plans = [
        { code: 'PLAN_7D', name: '7 Days Trial Pass', validityDays: 7, price: 300, maxInstallations: 1, sortOrder: 1 },
        { code: 'PLAN_15D', name: '15 Days Starter Pass', validityDays: 15, price: 600, maxInstallations: 1, sortOrder: 2 },
        { code: 'PLAN_30D', name: '30 Days Standard License', validityDays: 30, price: 1000, maxInstallations: 1, sortOrder: 3 },
        { code: 'PLAN_90D', name: '90 Days Agency Pass', validityDays: 90, price: 2700, maxInstallations: 2, sortOrder: 4 },
        { code: 'PLAN_180D', name: '180 Days Multi-Branch Pass', validityDays: 180, price: 5000, maxInstallations: 3, sortOrder: 5 },
        { code: 'PLAN_365D', name: '365 Days Enterprise Pass', validityDays: 365, price: 9500, maxInstallations: 5, sortOrder: 6 },
    ];
    for (const plan of plans) {
        await prisma.paymentPlan.upsert({
            where: { code: plan.code },
            update: {
                name: plan.name,
                validityDays: plan.validityDays,
                price: plan.price,
                maxInstallations: plan.maxInstallations,
                sortOrder: plan.sortOrder,
            },
            create: plan,
        });
    }
    console.log(`[Seed] ✅ Seeded ${plans.length} payment plans.`);
    // 3. Default Payment Settings
    await prisma.paymentSettings.upsert({
        where: { id: 'default' },
        update: {},
        create: {
            id: 'default',
            bkashNumber: '01700000000',
            nagadNumber: '01800000000',
            bankInstructions: 'City Bank AC: 1102938472910 | AC Name: IVAC Assistant Portal',
            whatsappNumber: '+8801700000000',
            instructionText: '1. Send money via bKash or Nagad Personal/Merchant to the given number.\n2. Note down your Transaction ID (TrxID).\n3. Enter the TrxID and your phone number in the form.\n4. Admin will verify and activate your license within 15-30 minutes.',
        },
    });
    console.log(`[Seed] ✅ Payment settings initialized.`);
    console.log('[Seed] Seeding completed successfully!');
}
seed()
    .catch((e) => {
    console.error('[Seed] Error during seeding:', e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
