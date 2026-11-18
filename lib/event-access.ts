import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { createServiceClient } from "@/lib/supabase/service";

// Server-side proof that a visitor entered an event's PIN. PinGate only keeps
// a flag in localStorage, which the server can't see, so endpoints that cost
// money (semantic search) check this cookie instead. Same scheme as the
// gallery access cookie: an HMAC of slug + PIN, so it can't be forged without
// the server secret and stops working if the PIN changes.

const ACCESS_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

const cookieName = (slug: string) => `event_access_${slug}`;

function accessToken(slug: string, pin: string): string {
  const secret =
    process.env.GALLERY_ACCESS_SECRET ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) throw new Error("Missing GALLERY_ACCESS_SECRET");
  // "event:" prefix keeps these distinct from gallery tokens for the same slug
  return createHmac("sha256", secret)
    .update(`event:${slug}:${pin}`)
    .digest("hex");
}

// Call only after the PIN has been verified
export async function grantEventAccess(slug: string, pin: string) {
  (await cookies()).set(cookieName(slug), accessToken(slug, pin), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    // "/" so it reaches /api/events/<slug>/… as well as /select/<slug>
    path: "/",
    maxAge: ACCESS_MAX_AGE,
  });
}

export async function hasEventAccess(slug: string): Promise<boolean> {
  const value = (await cookies()).get(cookieName(slug))?.value;
  if (!value) return false;

  const { data } = await createServiceClient()
    .from("events")
    .select("pin")
    .eq("slug", slug)
    .maybeSingle();
  const pin = (data as { pin: string | null } | null)?.pin;
  if (!pin) return false;

  const expected = Buffer.from(accessToken(slug, pin));
  const actual = Buffer.from(value);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
