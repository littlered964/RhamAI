import { NextResponse } from "next/server";
import { z } from "zod";

// --- Simple in-memory rate limiter (dev / low-traffic) ---
const WINDOW_MS = 60_000;         // 1 minute window
const MAX_REQUESTS = 5;           // per IP per window
const hits = new Map<string, { count: number; ts: number }>();

function rateLimit(ip: string): boolean {
  const now = Date.now();
  const rec = hits.get(ip);
  if (!rec || now - rec.ts > WINDOW_MS) {
    hits.set(ip, { count: 1, ts: now });
    return true;
  }
  if (rec.count >= MAX_REQUESTS) return false;
  rec.count++;
  return true;
}

// Optional GET to sanity-check the route in a browser
export async function GET() {
  return NextResponse.json({ ok: true, route: "contact" });
}

const Schema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email().max(200),
  message: z.string().min(5).max(5000),
});

// POST /api/contact
export async function POST(req: Request) {
  // 1) Rate limit by IP
  const ip =
    (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
  if (!rateLimit(ip)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  // 2) Parse JSON
  let data: unknown;
  try {
    data = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // 3) Validate input
  const parsed = Schema.safeParse(data);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed" }, { status: 400 });
  }

  // 4) Handle (stubbed for now)
  const { name, email, message } = parsed.data;
  console.log("Contact form:", { name, email, message, ip });

  // 5) Respond
  return NextResponse.json({ ok: true });
}
