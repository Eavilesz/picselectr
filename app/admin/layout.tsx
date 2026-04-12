import Link from "next/link";

export const metadata = {
  title: "Admin — Pickselectr",
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
          href="/admin"
          className="text-xs tracking-[0.25em] uppercase font-medium text-white"
        >
          Pickselectr
        </Link>
        <nav className="flex items-center gap-6">
          <Link
            href="/admin"
            className="text-xs tracking-[0.15em] uppercase text-neutral-400 hover:text-white transition-colors"
          >
            Productos
          </Link>
        </nav>
      </header>

      {/* Page content */}
      <main className="flex-1">{children}</main>
    </div>
  );
}
