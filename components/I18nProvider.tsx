"use client";

import { createContext, useContext } from "react";
import type { EventLanguage } from "@/app/events/types";
import { getMessages, type Messages } from "@/lib/i18n";

// Gives the event's language to the client components of /select. Only the
// language crosses from the server; the messages (which include functions)
// are looked up here on the client.

const LanguageContext = createContext<EventLanguage>("es");

export function I18nProvider({
  language,
  children,
}: {
  language: EventLanguage;
  children: React.ReactNode;
}) {
  return (
    <LanguageContext.Provider value={language}>
      {/* lang lets screen readers and browser translation read it right */}
      <div lang={language} className="contents">
        {children}
      </div>
    </LanguageContext.Provider>
  );
}

export function useT(): Messages {
  return getMessages(useContext(LanguageContext));
}
