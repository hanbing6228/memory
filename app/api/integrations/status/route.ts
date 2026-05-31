import { composioConfigured } from "@/lib/composio";
import { jsonOk } from "@/lib/api-response";

export async function GET() {
  return jsonOk({
    composio: composioConfigured(),
    cron: Boolean(process.env.CRON_SECRET),
    database: Boolean(process.env.DATABASE_URL),
    stripeEnabled: Boolean(process.env.STRIPE_SECRET_KEY),
  });
}
