import { Client } from "./types";

const STORAGE_KEY = "pickselectr_products";

export function getStoredProducts(): Client[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addStoredProduct(product: Client): void {
  const products = getStoredProducts();
  products.push(product);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
}
