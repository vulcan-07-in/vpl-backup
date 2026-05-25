const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const matches = await prisma.match.findMany({ include: { team1: true, team2: true } });
  
  for (const m of matches) {
    const isS1 = m.createdAt < new Date('2026-01-01');
    console.log(`Match: ${m.matchNo} | Group: ${m.group} | T1: ${m.team1.name} (${m.team1.groupId}) | T2: ${m.team2.name} (${m.team2.groupId}) | S1: ${isS1} | CreatedAt: ${m.createdAt}`);
  }
}
main().finally(() => prisma.$disconnect());
