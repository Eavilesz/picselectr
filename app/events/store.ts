"use server";

import { createClient } from "@/lib/supabase/server";
import { Client } from "./types";

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
    created_by: user?.id,
  });

  if (error) throw new Error(error.message);
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
  if (updates.photoLimit !== undefined) dbUpdates.photo_limit = updates.photoLimit;
  if (updates.albumLimit !== undefined) dbUpdates.album_limit = updates.albumLimit;
  if (updates.selected !== undefined) dbUpdates.digital_selected = updates.selected;

  const { error } = await supabase
    .from("events")
    .update(dbUpdates)
    .eq("slug", slug);

  if (error) throw new Error(error.message);
}

export async function deleteStoredProduct(slug: string): Promise<void> {
  const supabase = await createClient();

  // photos cascade-delete via FK
  const { error } = await supabase.from("events").delete().eq("slug", slug);
  if (error) throw new Error(error.message);
}

