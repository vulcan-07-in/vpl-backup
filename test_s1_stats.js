const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const matches = await prisma.match.findMany({ select: { matchNo: true, liveState: true } });
  console.log(matches.slice(0, 5));
}

main().finally(() => prisma.$disconnect());
