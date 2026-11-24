import Link from "next/link";
import { site } from "@/lib/site";

// Studio name on client pages. Events and galleries of the studio that owns
// this deployment link back to its landing page at "/"; other studios'
// names stay plain text.
function isHomeStudio(name: string): boolean {
  return name.trim().toLowerCase().startsWith(site.name.toLowerCase());
}

export default function StudioName({
  name,
  className = "",
}: {
  name: string;
  className?: string;
}) {
  if (!isHomeStudio(name)) return <p className={className}>{name}</p>;
  return (
    <p className={className}>
      <Link
        href="/"
        title={`Visitar el sitio de ${site.name}`}
        className="transition-opacity hover:opacity-70"
      >
        {name}
      </Link>
    </p>
  );
}
