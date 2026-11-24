import Link from "next/link";
import { site } from "@/lib/site";
import BrandMark from "./BrandMark";

const links = [
  { href: "#estudio", label: "Estudio" },
  { href: "#servicios", label: "Servicios" },
  { href: "#portafolio", label: "Portafolio" },
];

export default function Header() {
  return (
    <header className="mx-auto flex max-w-330 flex-wrap items-center justify-between gap-x-10 gap-y-2 px-5 py-7 sm:px-10 lg:px-16">
      <Link
        href="/"
        className="flex items-center gap-3.5 py-2.5 font-serif text-[22px] tracking-[0.42em]"
        aria-label={`${site.name}, inicio`}
      >
        <BrandMark />
        {site.name}
      </Link>
      <nav aria-label="Principal">
        <ul className="flex flex-wrap gap-x-6 text-[11px] font-normal uppercase tracking-[0.3em] sm:gap-x-12">
          {links.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                className="relative inline-block py-3.5 after:absolute after:bottom-2 after:left-0 after:h-px after:w-full after:origin-right after:scale-x-0 after:bg-current after:transition-transform after:duration-700 after:ease-luxe hover:after:origin-left hover:after:scale-x-100"
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
