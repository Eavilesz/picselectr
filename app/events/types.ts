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
}

export const EVENT_LABELS: Record<EventType, string> = {
  wedding: "Boda",
  birthday: "Cumpleaños",
  photobooth: "Sesión de fotos",
  quinceañera: "Quinceañera",
  other: "Otro",
};
