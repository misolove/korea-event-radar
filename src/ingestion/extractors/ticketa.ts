import type { DiscoveredCandidate, ExtractedEventDraft, SourceSeed } from "@/ingestion/types";
import { normalizeWhitespace } from "@/lib/text";

const TICKETA_SUPABASE_URL = "https://vlizxsubseudvtswwsjd.supabase.co/rest/v1";
const TICKETA_API_KEY = process.env.TICKETA_API_KEY ?? "";

interface SupabaseVenue {
  id: number;
  place_name: string | null;
  place_detail: string | null;
  address: string | null;
  district: string | null;
  province: string | null;
}

interface SupabaseOrganization {
  id: string;
  name: string | null;
}

interface SupabaseTicketType {
  id: number;
  name: string;
  price: number;
  open_at: string;
  close_at: string;
  sold_count: number;
  total_count: number;
  visibility: "PUBLIC" | "PRIVATE";
}

interface SupabaseEvent {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  start_date: string;
  end_date: string | null;
  status: string;
  venues: SupabaseVenue | null;
  organizations: SupabaseOrganization | null;
  ticket_types: SupabaseTicketType[] | null;
}

export async function discoverTicketa(seed: SourceSeed, html: string): Promise<string[]> {
  const url = `${TICKETA_SUPABASE_URL}/single_events?select=id&status=eq.PUBLIC`;
  try {
    const res = await fetch(url, {
      headers: {
        "apikey": TICKETA_API_KEY,
        "authorization": `Bearer ${TICKETA_API_KEY}`,
        "accept": "application/json",
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      return [];
    }

    const data = (await res.json()) as Array<{ id: string }>;
    return data.map((item) => `https://ticketa.co/event/${item.id}`);
  } catch {
    return [];
  }
}

export async function extractTicketa(
  url: string,
  html: string,
  discoveredFromUrl: string | null = "https://ticketa.co",
): Promise<ExtractedEventDraft | null> {
  const match = url.match(/\/event\/([a-zA-Z0-9]+)/);
  if (!match) {
    return null;
  }
  const eventId = match[1];

  const apiUrl = `${TICKETA_SUPABASE_URL}/single_events?id=eq.${eventId}&select=*,venues(*),organizations(*),ticket_types(*)`;
  
  let event: SupabaseEvent | null = null;
  try {
    const res = await fetch(apiUrl, {
      headers: {
        "apikey": TICKETA_API_KEY,
        "authorization": `Bearer ${TICKETA_API_KEY}`,
        "accept": "application/json",
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      return null;
    }

    const data = (await res.json()) as SupabaseEvent[];
    if (data.length === 0) {
      return null;
    }
    event = data[0];
  } catch {
    return null;
  }

  const title = normalizeWhitespace(event.title);
  const summary = event.description ? normalizeWhitespace(event.description) : null;
  const organizer = event.organizations?.name ? normalizeWhitespace(event.organizations.name) : "Ticketa 주최자";
  
  const startsAt = event.start_date ? new Date(event.start_date) : null;
  const endsAt = event.end_date ? new Date(event.end_date) : null;

  // Venue & City mapping
  let city = "서울"; // default for Seoul IT events
  let venueName = "온라인";
  if (event.venues) {
    const v = event.venues;
    const parts = [v.place_name, v.place_detail].filter(Boolean);
    venueName = parts.join(" ") || "오프라인 장소";
    
    const address = v.address ?? "";
    const province = v.province ?? "";
    if (province.includes("서울") || address.includes("서울")) {
      city = "서울";
    } else if (province.includes("부산") || address.includes("부산")) {
      city = "부산";
    } else if (province.includes("경기") || address.includes("경기")) {
      city = "판교"; // Default to Pangyo for Gyeonggi-do IT events
    } else if (province) {
      city = province;
    }
  }

  // Delivery type detection
  let deliveryType: "online" | "offline" | "hybrid" = "offline";
  const venueLower = venueName.toLowerCase();
  const addressLower = (event.venues?.address ?? "").toLowerCase();
  if (venueLower.includes("온라인") || venueLower.includes("zoom") || venueLower.includes("webinar") || addressLower.includes("온라인")) {
    deliveryType = "online";
  }

  // Ticket & Price resolution
  const publicTickets = (event.ticket_types ?? []).filter((t) => t.visibility === "PUBLIC");
  
  const now = new Date();
  
  // Registration Status
  let registrationStatus: ExtractedEventDraft["registrationStatus"] = "unknown";
  if (startsAt && startsAt < now) {
    registrationStatus = "past";
  } else if (publicTickets.length === 0) {
    registrationStatus = "unknown";
  } else {
    const openTickets = publicTickets.filter((t) => {
      const openTime = t.open_at ? new Date(t.open_at) : null;
      const closeTime = t.close_at ? new Date(t.close_at) : null;
      const isTimeOpen = (!openTime || openTime <= now) && (!closeTime || closeTime >= now);
      const isStockAvailable = t.total_count === null || t.sold_count < t.total_count;
      return isTimeOpen && isStockAvailable;
    });

    const waitlistTickets = publicTickets.filter((t) => {
      const openTime = t.open_at ? new Date(t.open_at) : null;
      return openTime && openTime > now;
    });

    const soldOutTickets = publicTickets.filter((t) => {
      return t.total_count !== null && t.sold_count >= t.total_count;
    });

    if (openTickets.length > 0) {
      registrationStatus = "open";
    } else if (waitlistTickets.length > 0 && waitlistTickets.length === publicTickets.length) {
      registrationStatus = "waitlist";
    } else if (soldOutTickets.length > 0 && soldOutTickets.length === publicTickets.length) {
      registrationStatus = "closed"; // Sold out
    } else {
      registrationStatus = "closed";
    }
  }

  // Price Type & Text
  let priceType: ExtractedEventDraft["priceType"] = "unknown";
  let priceText = "무료";
  if (publicTickets.length > 0) {
    const prices = publicTickets.map((t) => t.price);
    const hasFree = prices.some((p) => p === 0);
    const hasPaid = prices.some((p) => p > 0);

    if (hasFree && hasPaid) {
      priceType = "mixed";
    } else if (hasFree) {
      priceType = "free";
    } else {
      priceType = "paid";
    }

    priceText = publicTickets
      .map((t) => `${t.name}: ${t.price === 0 ? "무료" : `${t.price.toLocaleString()}원`}`)
      .join(" / ");
  }

  return {
    title,
    summary,
    organizer,
    primarySource: "Ticketa",
    primarySourceUrl: url,
    registrationUrl: url,
    city,
    venueName,
    startsAt,
    endsAt,
    registrationStatus,
    statusOrigin: "direct",
    priceType,
    priceText,
    eventKind: "seminar",
    deliveryType,
    topicTags: ["IT", "개발"],
    confidenceScore: startsAt ? 90 : 75,
    evidence: [
      {
        sourceKind: "platform",
        sourceName: "Ticketa",
        sourceUrl: url,
        discoveredFromUrl,
        extractedTitle: title,
        extractedStatusText: registrationStatus,
        extractedPriceText: priceText,
        extractedLocationText: venueName,
        extractedStartText: event.start_date,
        registrationUrl: url,
        registrationStatus,
        statusOrigin: "direct",
        priceType,
        confidenceScore: startsAt ? 90 : 75,
        payload: {
          event,
        },
      },
    ],
    rawText: JSON.stringify(event),
  };
}
