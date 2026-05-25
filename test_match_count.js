const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const m = await prisma.match.findMany();
  console.log('Total matches:', m.length, 'S1 matches:', m.filter(x => x.createdAt < new Date('2026-04-01')).length);
}
main().finally(() => prisma.$disconnect());
