import { NextResponse } from "next/server";
import { getEventBySlug } from "@/db/repository";
import { decodeSlug } from "@/lib/text";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ slug: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { slug } = await context.params;
  const event = await getEventBySlug(decodeSlug(slug));

  if (!event) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(event, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
