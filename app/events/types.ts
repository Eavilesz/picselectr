import { getMessages } from "@/lib/i18n";

export type EventType =
  | "wedding"
  | "birthday"
  | "photobooth"
  | "quinceañera"
  | "other";

// Language of the pages the event's client sees
export type EventLanguage = "es" | "en";

export const EVENT_LANGUAGES: { value: EventLanguage; label: string }[] = [
  { value: "es", label: "Español" },
  { value: "en", label: "English" },
];

export interface Client {
  id: string;
  slug: string;
  name: string;
  eventType: EventType;
  deadline: string | null;
  photoLimit: number | null;
  albumLimit: number | null;
  isReady: boolean;
  selected: number;
  pin?: string;
  studioName?: string | null;
  customEventLabel?: string | null;
  semanticSearchEnabled?: boolean;
  language?: EventLanguage;
}

export const EVENT_LABELS: Record<EventType, string> = {
  wedding: "Boda",
  birthday: "Cumpleaños",
  photobooth: "Sesión de fotos",
  quinceañera: "Quinceañera",
  other: "Otro",
};

// "La Boda de" / "The Wedding of", or the custom label for "other" events,
// in the event's language
export function getEventTitleLabel(
  client: Pick<Client, "eventType" | "customEventLabel" | "language">,
): string {
  const t = getMessages(client.language);
  return client.eventType === "other" && client.customEventLabel
    ? t.customEventTitle(client.customEventLabel)
    : t.eventTitle[client.eventType];
}
