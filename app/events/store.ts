"use server";

import { createClient } from "@/lib/supabase/server";
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
  });

  if (error) throw new Error(error.message);
}

export async function getEventBySlug(slug: string): Promise<Client | null> {
  const supabase = await createClient();

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

export async function verifyEventPin(
  slug: string,
  inputPin: string,
): Promise<boolean> {
  const supabase = await createClient();

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
