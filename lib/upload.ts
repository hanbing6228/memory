import { mkdir, writeFile, unlink } from "fs/promises";
import path from "path";
import { randomBytes } from "crypto";

const MAX_BYTES = 4 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

const EXT: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
};

export async function saveMemorialImage(
  slug: string,
  file: File
): Promise<{ imageUrl: string; id: string }> {
  if (!ALLOWED.has(file.type)) {
    throw new Error("仅支持 JPG、PNG、WebP、GIF 格式");
  }
  if (file.size > MAX_BYTES) {
    throw new Error("图片不能超过 4MB");
  }

  const id = randomBytes(8).toString("hex");
  const ext = EXT[file.type] || ".jpg";
  const dir = path.join(process.cwd(), "public", "uploads", "memorials", slug);
  await mkdir(dir, { recursive: true });

  const buffer = Buffer.from(await file.arrayBuffer());
  const filename = `${id}${ext}`;
  await writeFile(path.join(dir, filename), buffer);

  return { id, imageUrl: `/uploads/memorials/${slug}/${filename}` };
}

export async function deleteMemorialImage(imageUrl: string | null | undefined) {
  if (!imageUrl || !imageUrl.startsWith("/uploads/memorials/")) return;
  const filePath = path.join(process.cwd(), "public", imageUrl);
  try {
    await unlink(filePath);
  } catch {
    /* file may already be gone */
  }
}
