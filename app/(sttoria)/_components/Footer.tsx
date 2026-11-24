import { SITE_URL, site } from "@/lib/site";

export default function Footer() {
  return (
    <footer className="bg-night px-5 pb-16 text-[#f1ebe2] sm:px-10 lg:px-16 lg:pb-26">
      <div className="reveal mx-auto flex max-w-330 flex-col items-center gap-5 border-t border-[#3a342e] pt-14 text-center">
        <p className="pl-[0.32em] font-serif text-[clamp(40px,5vw,64px)] font-light leading-none tracking-[0.32em]">
          {site.name}
        </p>
        <p className="flex items-center gap-4.5 text-[11px] font-normal uppercase tracking-[0.36em] text-[#cfc5b8]">
          <span aria-hidden className="h-px w-10 bg-[#6e645a]" />
          {site.tagline}
          <span aria-hidden className="h-px w-10 bg-[#6e645a]" />
        </p>
        <p className="mt-7 text-xs tracking-[0.14em] text-[#a39889]">
          {SITE_URL.replace(/^https?:\/\//, "")} · © {new Date().getFullYear()}
          {site.instagram && (
            <>
              {" · "}
              <a href={site.instagram} rel="me" className="hover:text-ivory">
                Instagram
              </a>
            </>
          )}
        </p>
      </div>
    </footer>
  );
}
