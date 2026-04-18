"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { deleteStoredProduct, updateStoredProduct } from "./store";
import { Client, EVENT_LABELS } from "./types";
import { CopyButton } from "./[slug]/CopyButton";

export default function EventsTable({ products }: { products: Client[] }) {
  const router = useRouter();
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function handleDelete(slug: string) {
    startTransition(async () => {
      await deleteStoredProduct(slug);
      setConfirmDelete(null);
      router.refresh();
    });
  }

  function handleToggleReady(slug: string, current: boolean) {
    startTransition(async () => {
      await updateStoredProduct(slug, { isReady: !current });
      router.refresh();
    });
  }

  if (products.length === 0) {
    return (
      <div className="bg-neutral-900 border border-white/10">
        <div className="px-5 py-16 text-center">
          <p className="text-neutral-500 text-sm">
            No hay eventos creados aún.
          </p>
          <Link
            href="/events/new"
            className="mt-4 inline-block text-xs text-neutral-400 hover:text-white transition-colors underline underline-offset-4"
          >
            Crear el primero
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-neutral-900 border border-white/10 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/10">
            <th className="text-left px-5 py-3 text-[10px] tracking-[0.2em] uppercase text-neutral-500 font-medium">
              Cliente
            </th>
            <th className="px-5 py-3" />
            <th className="text-left px-5 py-3 text-[10px] tracking-[0.2em] uppercase text-neutral-500 font-medium">
              Evento
            </th>
            <th className="text-left px-5 py-3 text-[10px] tracking-[0.2em] uppercase text-neutral-500 font-medium">
              Límite
            </th>
            <th className="text-left px-5 py-3 text-[10px] tracking-[0.2em] uppercase text-neutral-500 font-medium">
              Estado
            </th>
            <th className="px-5 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {products.map((client) => (
            <tr
              key={client.id}
              className="hover:bg-white/5 transition-colors group"
            >
              {/* Name + copy URL button */}
              <td className="px-5 py-4">
                <p className="font-medium text-white">{client.name}</p>
                <div className="mt-1.5">
                  <CopyButton
                    value={`/select/${client.slug}`}
                    label="Copiar enlace"
                    compact
                  />
                </div>
              </td>
              {/* Ver button */}
              <td className="px-5 py-4 text-right">
                <Link
                  href={`/events/${client.slug}`}
                  className="text-xs text-neutral-500 group-hover:text-white transition-colors"
                >
                  Ver →
                </Link>
              </td>

              {/* Event type */}
              <td className="px-5 py-4 text-neutral-400">
                {EVENT_LABELS[client.eventType]}
              </td>

              {/* Photo limit */}
              <td className="px-5 py-4 text-neutral-400 tabular-nums">
                <span>{client.photoLimit ?? "—"}</span>
                {client.albumLimit != null && (
                  <span className="ml-1 text-neutral-600">
                    · {client.albumLimit} álbum
                  </span>
                )}
              </td>

              {/* Status — click to toggle */}
              <td className="px-5 py-4">
                <button
                  onClick={() => handleToggleReady(client.slug, client.isReady)}
                  className="inline-flex items-center gap-1.5 hover:opacity-75 transition-opacity"
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      client.isReady ? "bg-emerald-500" : "bg-amber-400"
                    }`}
                  />
                  <span
                    className={`text-xs ${
                      client.isReady ? "text-emerald-400" : "text-amber-400"
                    }`}
                  >
                    {client.isReady ? "Listo" : "En progreso"}
                  </span>
                </button>
              </td>

              {/* Delete */}
              <td className="px-5 py-4 text-right">
                {confirmDelete === client.slug ? (
                  <div className="flex items-center gap-2 justify-end">
                    <span className="text-xs text-neutral-400">¿Eliminar?</span>
                    <button
                      onClick={() => handleDelete(client.slug)}
                      className="text-xs text-red-400 hover:text-red-300 transition-colors"
                    >
                      Sí
                    </button>
                    <button
                      onClick={() => setConfirmDelete(null)}
                      className="text-xs text-neutral-500 hover:text-neutral-300 transition-colors"
                    >
                      No
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmDelete(client.slug)}
                    className="text-neutral-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                    aria-label="Eliminar evento"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      viewBox="0 0 24 24"
                    >
                      <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
