import type { EventLanguage, EventType } from "@/app/events/types";

// Text for the pages an event's client sees (PIN form, /select, search),
// in the event's language. The photographer's dashboard isn't translated.
//
// Both languages share the Messages type, so a key missing in either one
// fails the build. Client components read these through useT()
// (components/I18nProvider.tsx); server code calls getMessages().

export interface Messages {
  pin: {
    protectedAccess: string;
    label: string;
    submit: string;
    verifying: string;
    wrong: string;
    locked: string;
  };
  eventTitle: Record<EventType, string>;
  customEventTitle: (label: string) => string;
  page: {
    eyebrow: string;
    photoCount: (n: number) => string;
    deadline: (daysLeft: number) => string;
    hintDigital: string;
    hintAlbumOnly: string;
    hintAlbumFromDigital: string;
    hintCover: (n: number) => string;
    noPhotos: string;
    noResults: string;
    noResultsTip: (example: string) => string;
    moreResults: (n: number) => string;
    photoAlt: (n: number) => string;
  };
  modes: { digital: string; album: string; cover: string };
  finalize: {
    button: (count: number) => string;
    finalizing: string;
    finalized: string;
    error: string;
    saving: string;
    saved: string;
    saveError: string;
  };
  photo: {
    select: string;
    unselect: string;
    close: string;
    previous: string;
    next: string;
  };
  search: {
    placeholder: (example: string) => string;
    submit: string;
    searching: string;
    hint: string;
    resultsFor: string;
    showAll: string;
    failed: string;
    // One example per event type, following the pattern that searched best
    // in scripts/eval-search.mjs: who appears + who they're with / doing
    examples: Record<EventType, string>;
  };
  api: {
    emptyQuery: string;
    unavailable: string;
    pinRequired: string;
    dailyCap: string;
    busy: string;
    failed: string;
  };
  meta: {
    titleSuffix: string;
    description: (studioName: string | null) => string;
    ogCallToAction: string;
    ogLocale: string;
  };
}

const es: Messages = {
  pin: {
    protectedAccess: "Acceso protegido",
    label: "PIN de acceso",
    submit: "Entrar",
    verifying: "Verificando...",
    wrong: "PIN incorrecto. Intenta de nuevo.",
    locked: "Demasiados intentos. Espera 15 minutos o contacta al fotógrafo.",
  },
  eventTitle: {
    wedding: "La Boda de",
    quinceañera: "La Quinceañera de",
    birthday: "El Cumpleaños de",
    photobooth: "La Sesión de",
    other: "El Evento de",
  },
  customEventTitle: (label) => `${label} de`,
  page: {
    eyebrow: "Selección de fotos",
    photoCount: (n) => (n === 1 ? "foto" : "fotos"),
    deadline: (d) =>
      d === 0
        ? "Hoy es el último día para seleccionar tus fotos."
        : d === 1
          ? "Queda 1 día para seleccionar tus fotos."
          : `Quedan ${d} días para seleccionar tus fotos.`,
    hintDigital: "Selecciona las fotos que deseas recibir digitalmente",
    hintAlbumOnly: "Selecciona las fotos que irán en el álbum",
    hintAlbumFromDigital:
      "De tu selección digital, elige las que irán en el álbum",
    hintCover: (n) => `Elige ${n} fotos para la portada del álbum`,
    noPhotos: "Sin fotos",
    noResults: "Sin resultados",
    noResultsTip: (example) => `Prueba con quién aparece, ej. “${example}”`,
    moreResults: (n) => `Ver más resultados (${n})`,
    photoAlt: (n) => `Foto ${n}`,
  },
  modes: { digital: "Digital", album: "Álbum", cover: "Portada" },
  finalize: {
    button: (count) =>
      count > 0 ? `Finalizar selección · ${count}` : "Finalizar selección",
    finalizing: "Finalizando…",
    finalized: "Selección finalizada ✓",
    error: "No se pudo finalizar. Inténtalo de nuevo.",
    saving: "Guardando…",
    saved: "Cambios guardados ✓",
    saveError: "No se pudo guardar. Reintentando…",
  },
  photo: {
    select: "Seleccionar foto",
    unselect: "Deseleccionar foto",
    close: "Cerrar vista previa",
    previous: "Foto anterior",
    next: "Siguiente foto",
  },
  search: {
    placeholder: (example) => `Busca una foto, ej. “${example}”`,
    submit: "Buscar",
    searching: "Buscando...",
    hint: "Describe quién aparece y qué está haciendo.",
    resultsFor: "Resultados para",
    showAll: "Ver todas",
    failed: "No se pudo buscar",
    examples: {
      wedding: "la novia con su papá",
      quinceañera: "la quinceañera con sus padres",
      birthday: "soplando las velas",
      photobooth: "sonriendo con la familia",
      other: "con la familia",
    },
  },
  api: {
    emptyQuery: "Escribe qué foto buscas",
    unavailable: "Búsqueda no disponible",
    pinRequired: "Ingresa el PIN para buscar",
    dailyCap: "Se alcanzó el límite de búsquedas por hoy. Intenta mañana.",
    busy: "La búsqueda está ocupada. Intenta en un momento.",
    failed: "No se pudo completar la búsqueda",
  },
  meta: {
    titleSuffix: "Selección de Fotos",
    description: (studio) =>
      studio
        ? `${studio} · Elige tus fotos favoritas de la galería`
        : "Elige tus fotos favoritas de la galería",
    ogCallToAction: "Elige tus fotos favoritas →",
    ogLocale: "es_MX",
  },
};

const en: Messages = {
  pin: {
    protectedAccess: "Protected access",
    label: "Access PIN",
    submit: "Enter",
    verifying: "Checking...",
    wrong: "Wrong PIN. Try again.",
    locked: "Too many attempts. Wait 15 minutes or contact your photographer.",
  },
  eventTitle: {
    wedding: "The Wedding of",
    quinceañera: "The Quinceañera of",
    birthday: "The Birthday of",
    photobooth: "The Photo Session of",
    other: "The Event of",
  },
  customEventTitle: (label) => `${label} of`,
  page: {
    eyebrow: "Photo selection",
    photoCount: (n) => (n === 1 ? "photo" : "photos"),
    deadline: (d) =>
      d === 0
        ? "Today is the last day to choose your photos."
        : d === 1
          ? "1 day left to choose your photos."
          : `${d} days left to choose your photos.`,
    hintDigital: "Choose the photos you want as digital files",
    hintAlbumOnly: "Choose the photos for your album",
    hintAlbumFromDigital:
      "From your digital selection, choose the ones for the album",
    hintCover: (n) => `Choose ${n} photos for the album cover`,
    noPhotos: "No photos",
    noResults: "No results",
    noResultsTip: (example) => `Try who's in it, e.g. “${example}”`,
    moreResults: (n) => `See more results (${n})`,
    photoAlt: (n) => `Photo ${n}`,
  },
  modes: { digital: "Digital", album: "Album", cover: "Cover" },
  finalize: {
    button: (count) =>
      count > 0 ? `Finish selection · ${count}` : "Finish selection",
    finalizing: "Finishing…",
    finalized: "Selection finished ✓",
    error: "Couldn't finish. Try again.",
    saving: "Saving…",
    saved: "Changes saved ✓",
    saveError: "Couldn't save. Retrying…",
  },
  photo: {
    select: "Select photo",
    unselect: "Unselect photo",
    close: "Close preview",
    previous: "Previous photo",
    next: "Next photo",
  },
  search: {
    placeholder: (example) => `Search for a photo, e.g. “${example}”`,
    submit: "Search",
    searching: "Searching...",
    hint: "Describe who's in it and what they're doing.",
    resultsFor: "Results for",
    showAll: "Show all",
    failed: "Search didn't work",
    examples: {
      wedding: "the bride with her dad",
      quinceañera: "the quinceañera with her parents",
      birthday: "blowing out the candles",
      photobooth: "smiling with the family",
      other: "with the family",
    },
  },
  api: {
    emptyQuery: "Type what photo you're looking for",
    unavailable: "Search isn't available",
    pinRequired: "Enter the PIN to search",
    dailyCap: "Today's search limit was reached. Try again tomorrow.",
    busy: "Search is busy. Try again in a moment.",
    failed: "Search couldn't be completed",
  },
  meta: {
    titleSuffix: "Photo Selection",
    description: (studio) =>
      studio
        ? `${studio} · Choose your favorite photos from the gallery`
        : "Choose your favorite photos from the gallery",
    ogCallToAction: "Choose your favorite photos →",
    ogLocale: "en_US",
  },
};

const MESSAGES: Record<EventLanguage, Messages> = { es, en };

export function getMessages(language: EventLanguage | undefined): Messages {
  return MESSAGES[language ?? "es"] ?? es;
}
