import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { seedCities } from "../scripts/seed-cities";
import { seedDevData } from "./seed-dev-data";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is required for seed");
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

const main = async () => {
  await seedDevData(prisma);
  await seedCities(prisma);
};

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
