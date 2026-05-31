import { z } from "zod";
import { prisma } from "@/lib/db";
import { jsonError, jsonOk } from "@/lib/api-response";
import { sanitizeText } from "@/lib/sanitize";
import { generateOrderNumber } from "@/lib/content-admin";
import {
  orderLinesToJson,
  orderLinesToText,
  orderLinesTotalCents,
  resolveOrderLineItems,
} from "@/lib/order-items";

export const dynamic = "force-dynamic";

const itemSchema = z
  .object({
    slug: z.string().min(1).max(80),
    qty: z.number().int().positive().max(99),
    name: z.string().max(120).optional(),
  })
  .strict();

const schema = z.object({
  contactEmail: z.string().email(),
  contactName: z.string().min(1).max(80),
  contactPhone: z.string().min(6).max(20),
  shippingAddress: z.string().min(4).max(200),
  shippingCity: z.string().min(1).max(60),
  shippingProvince: z.string().min(1).max(60),
  shippingPostal: z.string().max(20).optional(),
  note: z.string().max(2000).optional(),
  memorialSlug: z.string().max(80).optional(),
  items: z.array(itemSchema).min(1),
  paymentMethod: z.enum(["inquiry", "stripe"]).default("inquiry"),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return jsonError("请完整填写收货与联系信息", 400);

  const data = parsed.data;
  const resolved = await resolveOrderLineItems(
    data.items.map((i) => ({
      slug: i.slug,
      qty: i.qty,
      name: i.name,
    }))
  );
  if ("error" in resolved) return jsonError(resolved.error, 400);

  const lines = resolved.items;
  const totalCents = orderLinesTotalCents(lines);
  const itemsText = orderLinesToText(lines);
  const itemsJson = orderLinesToJson(lines);

  const orderNumber = generateOrderNumber();

  if (data.paymentMethod === "stripe" && process.env.STRIPE_SECRET_KEY) {
    try {
      const Stripe = (await import("stripe")).default;
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
      const baseUrl =
        process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
        "http://localhost:3000";

      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        customer_email: data.contactEmail,
        line_items: lines.map((i) => ({
          quantity: i.qty,
          price_data: {
            currency: "cny",
            unit_amount: i.priceCents,
            product_data: { name: i.name },
          },
        })),
        success_url: `${baseUrl}/?order=${orderNumber}&paid=1`,
        cancel_url: `${baseUrl}/?order=${orderNumber}&paid=0`,
        metadata: { orderNumber },
      });

      await prisma.orderInquiry.create({
        data: {
          orderNumber,
          contactEmail: data.contactEmail.toLowerCase(),
          contactName: sanitizeText(data.contactName, 80),
          contactPhone: sanitizeText(data.contactPhone, 20),
          shippingAddress: sanitizeText(data.shippingAddress, 200),
          shippingCity: sanitizeText(data.shippingCity, 60),
          shippingProvince: sanitizeText(data.shippingProvince, 60),
          shippingPostal: data.shippingPostal
            ? sanitizeText(data.shippingPostal, 20)
            : null,
          items: sanitizeText(itemsText, 2000),
          itemsJson: JSON.stringify(itemsJson),
          note: data.note ? sanitizeText(data.note, 2000) : null,
          memorialSlug: data.memorialSlug
            ? sanitizeText(data.memorialSlug, 80)
            : null,
          totalCents,
          status: "awaiting_payment",
          paymentMethod: "stripe",
          stripeSessionId: session.id,
        },
      });

      return jsonOk({
        orderNumber,
        checkoutUrl: session.url,
        paymentMethod: "stripe",
      });
    } catch (e) {
      console.error("Stripe checkout failed:", e);
      return jsonError("在线支付暂不可用，请改用人工跟进", 502);
    }
  }

  await prisma.orderInquiry.create({
    data: {
      orderNumber,
      contactEmail: data.contactEmail.toLowerCase(),
      contactName: sanitizeText(data.contactName, 80),
      contactPhone: sanitizeText(data.contactPhone, 20),
      shippingAddress: sanitizeText(data.shippingAddress, 200),
      shippingCity: sanitizeText(data.shippingCity, 60),
      shippingProvince: sanitizeText(data.shippingProvince, 60),
      shippingPostal: data.shippingPostal
        ? sanitizeText(data.shippingPostal, 20)
        : null,
      items: sanitizeText(itemsText, 2000),
      itemsJson: JSON.stringify(itemsJson),
      note: data.note ? sanitizeText(data.note, 2000) : null,
      memorialSlug: data.memorialSlug
        ? sanitizeText(data.memorialSlug, 80)
        : null,
      totalCents,
      status: "pending",
      paymentMethod: "inquiry",
    },
  });

  return jsonOk({
    orderNumber,
    total: totalCents / 100,
    paymentMethod: "inquiry",
  });
}

export async function GET(request: Request) {
  const orderNumber = new URL(request.url).searchParams.get("orderNumber");
  if (!orderNumber) return jsonError("缺少订单号", 400);

  const order = await prisma.orderInquiry.findUnique({
    where: { orderNumber },
    select: {
      orderNumber: true,
      status: true,
      totalCents: true,
      paymentMethod: true,
      createdAt: true,
    },
  });
  if (!order) return jsonError("订单不存在", 404);

  return jsonOk({
    order: {
      ...order,
      total: order.totalCents / 100,
    },
  });
}
