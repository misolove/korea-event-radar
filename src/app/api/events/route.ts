import { NextResponse } from "next/server";
import { listEvents } from "@/db/repository";
import { normalizeSearchParams } from "@/lib/event-model";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const filters = normalizeSearchParams(Object.fromEntries(searchParams.entries()));
  const events = await listEvents(filters);
  return NextResponse.json(
    { events, count: events.length },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
