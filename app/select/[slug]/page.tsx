import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getEventBySlug,
  getSelections,
  isEventOwner,
} from "@/app/events/store";
import { getEventTitleLabel } from "@/app/events/types";
import { getPhotosBySlug } from "@/lib/r2";
import SelectionPage from "./SelectionPage";
import PinGate from "@/components/PinGate";
import { I18nProvider } from "@/components/I18nProvider";
import { getMessages } from "@/lib/i18n";
import { hasEventAccess } from "@/lib/event-access";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const client = await getEventBySlug(slug);
  if (!client) return {};
  const t = getMessages(client.language);
  const title = `${getEventTitleLabel(client)} ${client.name}`;
  const description = t.meta.description(client.studioName ?? null);
  return {
    title: `${title} — ${t.meta.titleSuffix}`,
    description,
    // The OG image comes from opengraph-image.tsx in this folder
    openGraph: {
      title,
      description,
      type: "website",
      locale: t.meta.ogLocale,
    },
  };
}

export default async function SelectPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const client = await getEventBySlug(slug);
  if (!client) notFound();

  // The PIN is enforced here, on the server: without the access cookie
  // (set by a correct PIN) no photos or selections are sent. The signed-in
  // owner skips the PIN.
  const [isOwner, hasAccess] = await Promise.all([
    isEventOwner(slug),
    hasEventAccess(slug),
  ]);
  const language = client.language ?? "es";
  if (!isOwner && !hasAccess) {
    return (
      <I18nProvider language={language}>
        <PinGate slug={slug} />
      </I18nProvider>
    );
  }

  const [photos, savedSelections] = await Promise.all([
    getPhotosBySlug(slug),
    getSelections(slug),
  ]);

  const t = getMessages(language);
  return (
    <I18nProvider language={language}>
      <SelectionPage
        client={client}
        photos={photos.map((p, i) => ({ ...p, alt: t.page.photoAlt(i + 1) }))}
        savedSelections={savedSelections}
      />
    </I18nProvider>
  );
}
