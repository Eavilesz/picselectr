export type EventType =
  | "wedding"
  | "birthday"
  | "photobooth"
  | "quinceañera"
  | "other";

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
}

export const EVENT_LABELS: Record<EventType, string> = {
  wedding: "Boda",
  birthday: "Cumpleaños",
  photobooth: "Sesión de fotos",
  quinceañera: "Quinceañera",
  other: "Otro",
};

const EVENT_TITLE_LABELS: Record<EventType, string> = {
  wedding: "La Boda de",
  quinceañera: "La Quinceañera de",
  birthday: "El Cumpleaños de",
  photobooth: "La Sesión de",
  other: "El Evento de",
};

// "La Boda de", "El Cumpleaños de", or the custom label for "other" events
export function getEventTitleLabel(
  client: Pick<Client, "eventType" | "customEventLabel">,
): string {
  return client.eventType === "other" && client.customEventLabel
    ? client.customEventLabel + " de"
    : EVENT_TITLE_LABELS[client.eventType];
}
