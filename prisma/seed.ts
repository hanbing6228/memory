import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = "demo@nianguichu.local";
  const passwordHash = await bcrypt.hash("demo-demo-demo", 12);

  const user = await prisma.user.upsert({
    where: { email },
    create: { email, passwordHash, name: "演示家属" },
    update: {},
  });

  const slug = "li-mingde";
  await prisma.memorial.upsert({
    where: { slug },
    create: {
      slug,
      ownerId: user.id,
      name: "李明德",
      birthDate: new Date("1938-04-03"),
      deathDate: new Date("2023-11-18"),
      motto: "春蚕到死丝方尽，蜡炬成灰泪始干",
      privacy: "family",
      quietMode: true,
      members: {
        create: { email, role: "owner" },
      },
      rituals: {
        create: [
          {
            type: "蜡烛",
            message: "父亲，我们很想您。",
            author: "李欣然",
          },
        ],
      },
    },
    update: {},
  });

  console.log("Seed OK — demo login:", email, "/ demo-demo-demo");
  console.log("Memorial slug:", slug);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
