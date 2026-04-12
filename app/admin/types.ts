export type EventType =
  | "wedding"
  | "birthday"
  | "photobooth"
  | "quinceañera"
  | "other";

export type ProductType = "digital" | "album";

export interface Product {
  type: ProductType;
  photoLimit: number | null;
  includesCover?: boolean;
}

export interface Client {
  id: string;
  slug: string;
  name: string;
  eventType: EventType;
  deadline: string | null;
  products: Product[];
  isReady: boolean;
  digitalSelected: number;
  albumSelected: number;
  coverSelected: number;
}

export const EVENT_LABELS: Record<EventType, string> = {
  wedding: "Boda",
  birthday: "Cumpleaños",
  photobooth: "Sesión de fotos",
  quinceañera: "Quinceañera",
  other: "Otro",
};

export const PRODUCT_LABELS: Record<ProductType, string> = {
  digital: "Digital",
  album: "Álbum",
};
