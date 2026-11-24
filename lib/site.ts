// Public facts about the studio, shared by the landing page, its metadata,
// the JSON-LD and llms.txt. Fill in the empty values: each one that is set
// adds a contact detail to the page and to what search engines read.

export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://sttoria.studio"
).replace(/\/$/, "");

// International format, digits only. An env var overrides the studio's
// number; set it to an empty string to hide the WhatsApp button.
const WHATSAPP_NUMBER = (
  process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "593990319194"
).replace(
  /\D/g,
  "",
);

export const site = {
  name: "STTORIA",
  tagline: "Fotografía & Video",
  title: "STTORIA — Fotografía y video de bodas en Guayaquil",
  description:
    "STTORIA es un estudio de fotografía y video de bodas en Guayaquil, Ecuador. También realizamos sesiones Save the Date, sesiones personalizadas en exteriores e interiores, cumpleaños y celebraciones.",
  locale: "es_EC",
  city: "Guayaquil",
  country: "EC",
  instagram: "https://www.instagram.com/sttoria_ph/",
  facebook: "https://www.facebook.com/Sttoria.PhotoStudio",
  whatsapp: WHATSAPP_NUMBER,
} as const;

export const services = [
  {
    name: "Bodas",
    description:
      "Del primer detalle de la mañana al último baile de la noche, contamos su día completo en foto y video. Después, eligen sus fotos favoritas y las de su álbum en una galería privada en línea.",
    includes: ["Fotografía", "Video", "Álbum impreso", "Galería privada en línea"],
  },
  {
    name: "Save the Date",
    description:
      "Una sesión previa a la boda para anunciar la fecha y sentirse cómodos frente a la cámara.",
  },
  {
    name: "Sesiones personalizadas",
    description:
      "Retratos, parejas y familia, en exteriores o en interiores, pensadas a su medida.",
  },
  {
    name: "Cumpleaños y celebraciones",
    description:
      "Fiestas y reuniones íntimas, registradas con la misma sensibilidad de una boda.",
  },
] as const;

export function whatsappHref(message: string): string | null {
  if (!site.whatsapp) return null;
  return `https://wa.me/${site.whatsapp}?text=${encodeURIComponent(message)}`;
}
