"use client";

import { useSyncExternalStore, useState } from "react";
import Link from "next/link";
import {
  subscribeToProducts,
  getStoredProducts,
  deleteStoredProduct,
  updateStoredProduct,
} from "./store";
import { Client, EVENT_LABELS, PRODUCT_LABELS, ProductType } from "./types";
import { CopyButton } from "./products/[slug]/CopyButton";

const PRODUCT_COLORS: Record<ProductType, string> = {
  digital: "bg-white/10 text-neutral-300",
  album: "bg-rose-900/30 text-rose-300",
};

function formatDeadline(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

const EMPTY: Client[] = [];

export default function AdminPage() {
  const products = useSyncExternalStore(
    subscribeToProducts,
    getStoredProducts,
    () => EMPTY,
  );
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const ready = products.filter((c) => c.isReady).length;
  const inProgress = products.length - ready;

  function handleDelete(slug: string) {
    deleteStoredProduct(slug);
    setConfirmDelete(null);
  }

  function handleToggleReady(slug: string) {
    const product = products.find((p) => p.slug === slug);
    if (!product) return;
    updateStoredProduct(slug, { isReady: !product.isReady });
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      {/* Page header */}
      <div className="flex items-end justify-between mb-8">
        <div>
          <p className="text-[10px] tracking-[0.3em] uppercase text-neutral-500 mb-1">
            Panel de administración
          </p>
          <h1 className="text-2xl font-medium text-white">Productos</h1>
        </div>
        <Link
          href="/admin/products/new"
          className="inline-flex items-center gap-2 bg-neutral-700 text-neutral-200 text-xs tracking-[0.15em] uppercase px-4 py-2.5 hover:bg-neutral-600 transition-colors"
        >
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
          Nuevo paquete
        </Link>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: "Total", value: products.length },
          { label: "En progreso", value: inProgress },
          { label: "Listos", value: ready },
        ].map((stat) => (
          <div
            key={stat.label}
            className="bg-neutral-900 border border-white/10 px-5 py-4"
          >
            <p className="text-[10px] tracking-[0.2em] uppercase text-neutral-500 mb-1">
              {stat.label}
            </p>
            <p className="text-3xl font-light text-white">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Products table */}
      <div className="bg-neutral-900 border border-white/10 overflow-hidden">
        {products.length === 0 ? (
          <div className="px-5 py-16 text-center">
            <p className="text-neutral-500 text-sm">
              No hay productos creados aún.
            </p>
            <Link
              href="/admin/products/new"
              className="mt-4 inline-block text-xs text-neutral-400 hover:text-white transition-colors underline underline-offset-4"
            >
              Crear el primero
            </Link>
          </div>
        ) : (
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
                  Productos
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
                      href={`/admin/products/${client.slug}`}
                      className="text-xs text-neutral-500 group-hover:text-white transition-colors"
                    >
                      Ver →
                    </Link>
                  </td>

                  {/* Event type */}
                  <td className="px-5 py-4 text-neutral-400">
                    {EVENT_LABELS[client.eventType]}
                  </td>

                  {/* Deadline */}
                  <td className="px-5 py-4 text-neutral-400 tabular-nums">
                    {formatDeadline(client.deadline)}
                  </td>

                  {/* Products */}
                  <td className="px-5 py-4">
                    <div className="flex gap-1.5 flex-wrap">
                      {client.products.map((p) => (
                        <span
                          key={p.type}
                          className={`text-[10px] tracking-widest uppercase px-2 py-0.5 ${PRODUCT_COLORS[p.type]}`}
                        >
                          {PRODUCT_LABELS[p.type]}
                        </span>
                      ))}
                    </div>
                  </td>

                  {/* Status — click to toggle */}
                  <td className="px-5 py-4">
                    <button
                      onClick={() => handleToggleReady(client.slug)}
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
                        <span className="text-xs text-neutral-400">
                          ¿Eliminar?
                        </span>
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
                        aria-label="Eliminar producto"
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
        )}
      </div>
    </div>
  );
}
