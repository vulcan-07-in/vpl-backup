import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const matches = await prisma.match.findMany({
    include: { team1: true, team2: true }
  });

  let updatedCount = 0;
  for (const match of matches) {
    if (match.group === "A" && match.team1.groupId === match.team2.groupId && match.team1.groupId !== "A") {
      await prisma.match.update({
        where: { id: match.id },
        data: { group: match.team1.groupId }
      });
      console.log(`Moved Match ${match.matchNo} from Group A to Group ${match.team1.groupId}`);
      updatedCount++;
    } else if (match.group === "A" && match.team1.groupId !== match.team2.groupId) {
      console.log(`Match ${match.matchNo} is across different groups (${match.team1.groupId} vs ${match.team2.groupId}). Leaving as Group A or please update manually.`);
    }
  }

  console.log(`Updated ${updatedCount} matches.`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
