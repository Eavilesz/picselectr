"use server";

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { Client } from "./types";
import { deleteEventPhotos } from "@/lib/r2";

// ---------------------------------------------------------------------------
// Row types (as stored in Supabase)
// ---------------------------------------------------------------------------

interface EventRow {
  id: string;
  slug: string;
  name: string;
  event_type: string;
  deadline: string | null;
  is_ready: boolean;
  photo_limit: number | null;
  album_limit: number | null;
  digital_selected: number;
  pin: string | null;
  created_by: string | null;
  studio_name: string | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toClient(event: EventRow): Client {
  return {
    id: event.id,
    slug: event.slug,
    name: event.name,
    eventType: event.event_type as Client["eventType"],
    deadline: event.deadline,
    isReady: event.is_ready,
    photoLimit: event.photo_limit,
    albumLimit: event.album_limit,
    selected: event.digital_selected,
    pin: event.pin ?? undefined,
    studioName: event.studio_name ?? null,
  };
}

// ---------------------------------------------------------------------------
// Store functions (same signatures as the localStorage version)
// ---------------------------------------------------------------------------

export async function getStoredProducts(): Promise<Client[]> {
  const supabase = await createClient();

  const { data: events, error } = await supabase
    .from("events")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return [];

  return (events as EventRow[]).map((e) => toClient(e));
}

export async function addStoredProduct(product: Client): Promise<void> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const studioName =
    (user?.user_metadata?.studio_name as string | undefined) ?? null;

  const { error } = await supabase.from("events").insert({
    slug: product.slug,
    name: product.name,
    event_type: product.eventType,
    deadline: product.deadline,
    is_ready: product.isReady,
    photo_limit: product.photoLimit,
    album_limit: product.albumLimit,
    digital_selected: product.selected,
    pin: product.pin ?? null,
    created_by: user?.id,
    studio_name: studioName,
  });

  if (error) throw new Error(error.message);
}

export async function getEventBySlug(slug: string): Promise<Client | null> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("events")
    .select("*")
    .eq("slug", slug)
    .single();

  if (error || !data) return null;
  // Strip pin — never expose it to client components
  const { pin: _pin, ...client } = toClient(data as EventRow);
  return client;
}

// Returns the studio_name of the currently authenticated user
export async function getStudioName(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return (user?.user_metadata?.studio_name as string | undefined) ?? null;
}

// Updates the studio_name in the user's metadata
export async function updateStudioName(studioName: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({
    data: { studio_name: studioName.trim() || null },
  });
  if (error) throw new Error(error.message);
}

export async function verifyEventPin(
  slug: string,
  inputPin: string,
): Promise<boolean> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("events")
    .select("pin")
    .eq("slug", slug)
    .single();

  if (error || !data) return false;
  const storedPin = (data as { pin: string | null }).pin;
  if (!storedPin) return false;
  return storedPin === inputPin;
}

export async function updateStoredProduct(
  slug: string,
  updates: Partial<Client>,
): Promise<void> {
  const supabase = await createClient();

  const dbUpdates: Record<string, unknown> = {};
  if (updates.name !== undefined) dbUpdates.name = updates.name;
  if (updates.eventType !== undefined) dbUpdates.event_type = updates.eventType;
  if (updates.deadline !== undefined) dbUpdates.deadline = updates.deadline;
  if (updates.isReady !== undefined) dbUpdates.is_ready = updates.isReady;
  if (updates.photoLimit !== undefined)
    dbUpdates.photo_limit = updates.photoLimit;
  if (updates.albumLimit !== undefined)
    dbUpdates.album_limit = updates.albumLimit;
  if (updates.selected !== undefined)
    dbUpdates.digital_selected = updates.selected;

  const { error } = await supabase
    .from("events")
    .update(dbUpdates)
    .eq("slug", slug);

  if (error) throw new Error(error.message);
}

export async function deleteStoredProduct(slug: string): Promise<void> {
  const supabase = await createClient();

  await deleteEventPhotos(slug);

  // photos rows cascade-delete via FK
  const { error } = await supabase.from("events").delete().eq("slug", slug);
  if (error) throw new Error(error.message);
}

// ---------------------------------------------------------------------------
// Selections
// ---------------------------------------------------------------------------

export interface Selections {
  digital: string[];
  album: string[];
  cover: string[];
  workedOn: string[];
}

export async function getSelections(slug: string): Promise<Selections> {
  const supabase = createServiceClient();

  const { data } = await supabase
    .from("selections")
    .select("digital, album, cover, worked_on")
    .eq("event_slug", slug)
    .single();

  if (!data) return { digital: [], album: [], cover: [], workedOn: [] };
  const row = data as {
    digital: string[];
    album: string[];
    cover: string[];
    worked_on: string[];
  };
  return {
    digital: row.digital,
    album: row.album,
    cover: row.cover,
    workedOn: row.worked_on ?? [],
  };
}

const COVER_LIMIT = 2;

export async function saveSelections(
  slug: string,
  digital: string[],
  album: string[],
  cover: string[],
): Promise<void> {
  const supabase = createServiceClient();

  // Fetch event limits to determine readiness
  const { data: event } = await supabase
    .from("events")
    .select("photo_limit, album_limit")
    .eq("slug", slug)
    .single();

  const { error } = await supabase.from("selections").upsert(
    {
      event_slug: slug,
      digital,
      album,
      cover,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "event_slug" },
  );

  if (error) throw new Error(error.message);

  // Compute isReady: all applicable slots must be filled
  // (worked_on is preserved via onConflict — only digital/album/cover are updated)
  const ev = event as {
    photo_limit: number | null;
    album_limit: number | null;
  } | null;
  let isReady = true;
  if (ev?.photo_limit != null)
    isReady = isReady && digital.length >= ev.photo_limit;
  if (ev?.album_limit != null) {
    isReady = isReady && album.length >= ev.album_limit;
    isReady = isReady && cover.length >= COVER_LIMIT;
  }
  // album-only events (no photoLimit but has albumLimit)
  if (ev?.photo_limit == null && ev?.album_limit == null) isReady = false;

  await supabase
    .from("events")
    .update({ digital_selected: digital.length, is_ready: isReady })
    .eq("slug", slug);
}

export async function saveWorkedOn(
  slug: string,
  workedOn: string[],
): Promise<void> {
  const supabase = createServiceClient();

  // Update if row exists; insert (with empty selections) if it doesn't yet
  const { data } = await supabase
    .from("selections")
    .update({ worked_on: workedOn, updated_at: new Date().toISOString() })
    .eq("event_slug", slug)
    .select("event_slug");

  if (!data || data.length === 0) {
    await supabase
      .from("selections")
      .insert({ event_slug: slug, worked_on: workedOn });
  }
}
