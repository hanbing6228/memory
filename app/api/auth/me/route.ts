import { getSessionUser } from "@/lib/auth";
import { jsonOk } from "@/lib/api-response";
import { canManageContent } from "@/lib/content-admin";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return jsonOk({ user: null });
  return jsonOk({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      canManageContent: canManageContent(user),
    },
  });
}
