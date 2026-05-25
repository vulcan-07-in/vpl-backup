const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const teams = await prisma.team.findMany({ select: { name: true, groupId: true } });
  console.log('Teams:', teams);
  
  const matches = await prisma.match.findMany({ select: { matchNo: true, stage: true, group: true } });
  console.log('Matches:', matches);
}

main().finally(() => prisma.$disconnect());
