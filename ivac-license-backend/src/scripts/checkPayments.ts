import { prisma } from '../config/database.js';

async function main() {
  const payments = await prisma.paymentRequest.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5,
    include: { license: true, plan: true },
  });
  console.log('Recent 5 payment requests in DB:');
  console.log(JSON.stringify(payments, null, 2));
  await prisma.$disconnect();
}

main().catch(console.error);
