import Link from "next/link";
import { logout } from "./login/actions";

export const metadata = {
  title: "Admin — Picselectr",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-neutral-950 flex flex-col">
      {/* Top bar */}
      <header className="h-14 bg-neutral-900 border-b border-white/10 flex items-center justify-between px-6 shrink-0">
        <Link
          href="/events"
          className="text-xs tracking-[0.25em] uppercase font-medium text-white"
        >
          Picselectr
        </Link>
        <nav className="flex items-center gap-6">
          <Link
            href="/events"
            className="text-xs tracking-[0.15em] uppercase text-neutral-400 hover:text-white transition-colors"
          >
            Eventos
          </Link>
          <Link
            href="/events/settings"
            className="text-xs tracking-[0.15em] uppercase text-neutral-400 hover:text-white transition-colors"
          >
            Configuración
          </Link>
          <form action={logout}>
            <button
              type="submit"
              className="text-xs tracking-[0.15em] uppercase text-neutral-500 hover:text-white transition-colors"
            >
              Salir
            </button>
          </form>
        </nav>
      </header>

      {/* Page content */}
      <main className="flex-1">{children}</main>
    </div>
  );
}
