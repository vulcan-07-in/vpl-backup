const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const teams = await prisma.team.findMany({ select: { name: true, groupId: true } });
  
  const map = {};
  const ensureTeam = (name, group) => {
      if (!map[name]) {
          map[name] = { team: name, group, played: 0 };
      }
  };
  
  teams.forEach(t => {
      if (t.groupId && ["A", "B", "C"].includes(t.groupId)) {
          ensureTeam(t.name, t.groupId);
      }
  });

  const matches = await prisma.match.findMany({ select: { matchNo: true, group: true, team1: { select: { name: true } }, team2: { select: { name: true } } } });
  
  matches.forEach(m => {
      if (m.group === "-") return;
      const group = m.group;
      if (m.team1) ensureTeam(m.team1.name, group);
      if (m.team2) ensureTeam(m.team2.name, group);
  });
  
  console.log('Map values:');
  Object.values(map).forEach(v => console.log(v));
}

main().finally(() => prisma.$disconnect());
