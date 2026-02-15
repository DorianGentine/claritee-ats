import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is required for seed");
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

/** Placeholder UUID for dev seed (User.id = Supabase Auth uid in production) */
const DEV_USER_ID = "00000000-0000-0000-0000-000000000001";

/** UUID valide pour l'invitation de seed (getByToken attend un UUID) */
const DEV_INVITATION_TOKEN = "00000000-0000-0000-0000-000000000002";

const main = async () => {
  const company = await prisma.company.upsert({
    where: { siren: "123456789" },
    create: {
      name: "Cabinet Claritee Dev",
      siren: "123456789",
    },
    update: {},
  });

  await prisma.user.upsert({
    where: { id: DEV_USER_ID },
    create: {
      id: DEV_USER_ID,
      email: "dev@claritee.local",
      firstName: "Dev",
      lastName: "User",
      companyId: company.id,
    },
    update: { companyId: company.id },
  });

  await prisma.invitation.upsert({
    where: { token: DEV_INVITATION_TOKEN },
    create: {
      email: "invite@claritee.local",
      companyId: company.id,
      token: DEV_INVITATION_TOKEN,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
    update: {},
  });
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
