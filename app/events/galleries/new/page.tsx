import Link from "next/link";
import { getStudioName } from "../../store";
import NewGalleryForm from "./NewGalleryForm";

export const metadata = { title: "Nueva galería — Picselectr" };

export default async function NewGalleryPage() {
  const studioName = await getStudioName();

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <div className="flex items-center gap-3 mb-8">
        <Link
          href="/events/galleries"
          className="text-xs text-neutral-500 hover:text-neutral-200 transition-colors"
        >
          ← Galerías
        </Link>
        <span className="text-white/15">/</span>
        <span className="text-xs text-neutral-300 font-medium">
          Nueva galería
        </span>
      </div>

      <div className="mb-8">
        <p className="text-[10px] tracking-[0.3em] uppercase text-neutral-500 mb-1">
          Entrega final
        </p>
        <h1 className="text-2xl font-medium text-white">Nueva galería</h1>
      </div>

      <NewGalleryForm studioName={studioName} />
    </div>
  );
}
