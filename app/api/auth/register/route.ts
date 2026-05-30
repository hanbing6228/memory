import { z } from "zod";
import { prisma } from "@/lib/db";
import { createSessionToken, hashPassword, setSessionCookie, slugify } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/api-response";
import { sanitizeShort, sanitizeText } from "@/lib/sanitize";

const schema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(8).max(128),
  name: z.string().max(80).optional(),
  memorial: z
    .object({
      name: z.string().min(1).max(80),
      birthDate: z.string().optional(),
      deathDate: z.string().min(1),
      motto: z.string().max(200).optional(),
      privacy: z.enum(["private", "family", "public"]).default("family"),
      quietMode: z.boolean().default(true),
    })
    .optional(),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return jsonError("注册信息无效", 400);

  const email = parsed.data.email.toLowerCase().trim();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return jsonError("该邮箱已注册", 409);

  const passwordHash = await hashPassword(parsed.data.password);
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      name: parsed.data.name ? sanitizeShort(parsed.data.name) : null,
    },
  });

  let memorialSlug: string | null = null;
  if (parsed.data.memorial) {
    const m = parsed.data.memorial;
    const slug = slugify(sanitizeText(m.name, 40));
    const memorial = await prisma.memorial.create({
      data: {
        slug,
        ownerId: user.id,
        name: sanitizeText(m.name, 80),
        birthDate: m.birthDate ? new Date(m.birthDate) : null,
        deathDate: new Date(m.deathDate),
        motto: m.motto ? sanitizeText(m.motto, 200) : null,
        privacy: m.privacy,
        quietMode: m.quietMode,
        members: {
          create: { email: user.email, role: "owner" },
        },
      },
    });
    memorialSlug = memorial.slug;
  }

  const token = await createSessionToken({
    id: user.id,
    email: user.email,
    name: user.name,
  });
  await setSessionCookie(token);

  return jsonOk({
    user: { id: user.id, email: user.email, name: user.name },
    memorialSlug,
  });
}
