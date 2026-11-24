import { SITE_URL, site } from "@/lib/site";
import BrandMark from "./BrandMark";
import SocialLinks from "./SocialLinks";

export default function Footer() {
  return (
    <footer className="bg-onyx px-5 pb-16 text-[#f1ebe2] sm:px-10 lg:px-16 lg:pb-26">
      <div className="reveal mx-auto flex max-w-330 flex-col items-center gap-5 border-t border-white/10 pt-14 text-center">
        <BrandMark className="mb-3" size="lg" />
        <p className="pl-[0.32em] font-serif text-[clamp(40px,5vw,64px)] font-light leading-none tracking-[0.32em]">
          {site.name}
        </p>
        <p className="flex items-center gap-4.5 text-[11px] font-normal uppercase tracking-[0.36em] text-ivory/60">
          <span aria-hidden className="h-px w-10 bg-brand-orange" />
          {site.tagline}
          <span aria-hidden className="h-px w-10 bg-brand-orange" />
        </p>
        <SocialLinks className="mt-6 text-ivory/70" />
        <p className="mt-2 text-xs tracking-[0.14em] text-ivory/60">
          {SITE_URL.replace(/^https?:\/\//, "")} · © {new Date().getFullYear()}
        </p>
        <p className="text-[11px] tracking-[0.14em] text-ivory/60">
          Sitio diseñado y desarrollado por{" "}
          <a
            href="https://www.ernestoaviles.dev/"
            target="_blank"
            rel="noopener"
            className="text-ivory/80 underline decoration-ivory/30 underline-offset-4 transition-colors duration-500 hover:text-brand-orange hover:decoration-brand-orange"
          >
            Ernesto Avilés
          </a>
        </p>
      </div>
    </footer>
  );
}
