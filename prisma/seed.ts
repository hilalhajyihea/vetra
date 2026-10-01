import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const renamedPPlus = await prisma.animal.updateMany({
    where: { geneType: "p+" },
    data: { geneType: "+B" },
  });
  const renamedPp = await prisma.animal.updateMany({
    where: { geneType: "pp" },
    data: { geneType: "BB" },
  });
  if (renamedPPlus.count || renamedPp.count) {
    console.log(
      `Renamed gene types: p+ → +B (${renamedPPlus.count}), pp → BB (${renamedPp.count}).`,
    );
  }
  console.log("Vetra seed: no demo clinic. Add veterinarians from /platform.");
  console.log("Platform login: PLATFORM_USERNAME / PLATFORM_PASSWORD from .env");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
