import "server-only";

import { createHmac } from "node:crypto";
import { headers } from "next/headers";
import { createServiceClient } from "@/lib/supabase/service";

// Server-side limit on PIN guesses. Two windows:
// - per visitor (IP) and target: a few tries, then a 15-minute wait. Stops a
//   single script cold.
// - per target, all visitors: a ceiling that rotating IPs can't get past
//   quickly. Someone who knows the link could use it to make the real client
//   wait, which is the trade-off for not letting the PIN be guessed.

export type PinScope = "event" | "gallery";
export type PinCheck = "ok" | "wrong" | "locked";

const WINDOW_MS = 15 * 60 * 1000;
const MAX_PER_VISITOR = 5;
const MAX_PER_TARGET = 30;
const PRUNE_AFTER_MS = 24 * 60 * 60 * 1000;

async function visitorHash(): Promise<string> {
  const h = await headers();
  // Vercel puts the client IP first in x-forwarded-for
  const ip =
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    "unknown";
  const secret =
    process.env.GALLERY_ACCESS_SECRET ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) throw new Error("Missing GALLERY_ACCESS_SECRET");
  return createHmac("sha256", secret).update(`pin-ip:${ip}`).digest("hex");
}

// Runs `isCorrect` only when the visitor is still allowed to guess, and
// records the failure when it isn't correct. A locked visitor gets "locked"
// even with the right PIN, so guessing during the wait reveals nothing.
export async function checkPinWithLimit(
  scope: PinScope,
  target: string,
  isCorrect: () => Promise<boolean>,
): Promise<PinCheck> {
  const supabase = createServiceClient();
  const ipHash = await visitorHash();
  const since = new Date(Date.now() - WINDOW_MS).toISOString();

  const { data: recent, error } = await supabase
    .from("pin_attempts")
    .select("ip_hash")
    .eq("scope", scope)
    .eq("target", target)
    .gte("created_at", since)
    .limit(MAX_PER_TARGET);
  // Fail closed: if the limit can't be checked, don't allow guessing
  if (error) {
    console.error("PIN attempts: lookup failed", error.message);
    return "locked";
  }

  const mine = recent.filter((r) => r.ip_hash === ipHash).length;
  if (mine >= MAX_PER_VISITOR || recent.length >= MAX_PER_TARGET) {
    return "locked";
  }

  if (await isCorrect()) return "ok";

  const { error: insertError } = await supabase
    .from("pin_attempts")
    .insert({ scope, target, ip_hash: ipHash });
  if (insertError) {
    console.error("PIN attempts: insert failed", insertError.message);
  }
  // Old rows only ever matter for 15 minutes
  await supabase
    .from("pin_attempts")
    .delete()
    .eq("scope", scope)
    .eq("target", target)
    .lt("created_at", new Date(Date.now() - PRUNE_AFTER_MS).toISOString());

  return mine + 1 >= MAX_PER_VISITOR ? "locked" : "wrong";
}
