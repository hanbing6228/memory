import { execSync } from "child_process";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const demo = await prisma.user.findUnique({
    where: { email: "demo@nianguichu.local" },
    select: { id: true },
  });
  if (demo) {
    console.log("Seed skipped — demo user already exists");
    return;
  }
  console.log("Running seed…");
  execSync("npm run seed", { stdio: "inherit" });
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
