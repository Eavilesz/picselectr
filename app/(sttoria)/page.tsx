import type { Metadata } from "next";
import { SITE_URL, services, site } from "@/lib/site";
import Header from "./_components/Header";
import Hero from "./_components/Hero";
import Studio from "./_components/Studio";
import Services from "./_components/Services";
import Portfolio from "./_components/Portfolio";
import Footer from "./_components/Footer";
import WhatsAppButton from "./_components/WhatsAppButton";
import heroPhoto from "./_images/window.jpg";

export const metadata: Metadata = {
  title: { absolute: site.title },
  description: site.description,
  alternates: { canonical: `${SITE_URL}/` },
  openGraph: {
    type: "website",
    url: `${SITE_URL}/`,
    siteName: site.name,
    locale: site.locale,
    title: site.title,
    description: site.description,
  },
  twitter: {
    card: "summary_large_image",
    title: site.title,
    description: site.description,
  },
  robots: { index: true, follow: true },
};

// Structured data: lets Google and AI assistants read who the studio is and
// what it offers without parsing the design.
function jsonLd() {
  const business: Record<string, unknown> = {
    "@type": "ProfessionalService",
    "@id": `${SITE_URL}/#studio`,
    name: site.name,
    alternateName: `${site.name} ${site.tagline}`,
    url: `${SITE_URL}/`,
    description: site.description,
    image: `${SITE_URL}${heroPhoto.src}`,
    knowsLanguage: "es",
    knowsAbout: [
      "Fotografía de bodas",
      "Video de bodas",
      "Álbumes de boda impresos",
      "Sesiones Save the Date",
      "Sesiones de fotos personalizadas",
      "Fotografía de cumpleaños y celebraciones",
    ],
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "Servicios",
      itemListElement: services.map((s) => ({
        "@type": "Offer",
        itemOffered: { "@type": "Service", name: s.name, description: s.description },
      })),
    },
  };
  if (site.city) {
    business.address = {
      "@type": "PostalAddress",
      addressLocality: site.city,
      addressCountry: site.country,
    };
    business.areaServed = site.city;
  }
  if (site.whatsapp) business.telephone = `+${site.whatsapp}`;
  if (site.instagram) business.sameAs = [site.instagram];

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        url: `${SITE_URL}/`,
        name: site.name,
        inLanguage: "es",
        publisher: { "@id": `${SITE_URL}/#studio` },
      },
      business,
    ],
  };
}

export default function Home() {
  return (
    <div className="flex-1 bg-onyx font-light text-ivory">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd()).replace(/</g, "\\u003c"),
        }}
      />
      <Header />
      <main>
        <Hero />
        <Studio />
        <Services />
        <Portfolio />
      </main>
      <Footer />
      <WhatsAppButton />
    </div>
  );
}
