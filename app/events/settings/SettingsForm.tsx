"use client";

import { useState, useTransition } from "react";
import { updateSettings } from "@/app/events/store";

export default function SettingsForm({
  initialStudioName,
  initialNotificationEmail,
  loginEmail,
}: {
  initialStudioName: string;
  initialNotificationEmail: string;
  loginEmail: string | null;
}) {
  const [studioName, setStudioName] = useState(initialStudioName);
  const [notificationEmail, setNotificationEmail] = useState(
    initialNotificationEmail,
  );
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(false);
    setError(null);
    startTransition(async () => {
      try {
        await updateSettings({ studioName, notificationEmail });
        setSaved(true);
      } catch {
        setError("No se pudo guardar. Intenta de nuevo.");
      }
    });
  };

  const markChanged = () => setSaved(false);

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-md">
      <div className="space-y-2">
        <label
          htmlFor="studioName"
          className="block text-[10px] tracking-[0.2em] uppercase text-neutral-500"
        >
          Nombre del estudio
        </label>
        <input
          id="studioName"
          type="text"
          value={studioName}
          onChange={(e) => {
            setStudioName(e.target.value);
            markChanged();
          }}
          placeholder="Estudio Foto XYZ"
          className="w-full bg-neutral-900 border border-white/10 px-4 py-3 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-white/30 transition-colors"
        />
        <p className="text-[11px] text-neutral-600">
          Se mostrará en la página de selección de tus clientes.
        </p>
      </div>

      <div className="space-y-2">
        <label
          htmlFor="notificationEmail"
          className="block text-[10px] tracking-[0.2em] uppercase text-neutral-500"
        >
          Correo para notificaciones
        </label>
        <input
          id="notificationEmail"
          type="email"
          value={notificationEmail}
          onChange={(e) => {
            setNotificationEmail(e.target.value);
            markChanged();
          }}
          placeholder={loginEmail ?? "tu@correo.com"}
          className="w-full bg-neutral-900 border border-white/10 px-4 py-3 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-white/30 transition-colors"
        />
        <p className="text-[11px] text-neutral-600">
          Aquí recibirás un aviso cuando un cliente finalice su selección.
          {loginEmail
            ? ` Si lo dejas vacío, se usará ${loginEmail}.`
            : " Si lo dejas vacío, se usará el correo de tu cuenta."}
        </p>
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}

      <button
        type="submit"
        disabled={isPending}
        className="bg-neutral-700 text-neutral-200 text-xs tracking-[0.15em] uppercase px-5 py-2.5 hover:bg-neutral-600 transition-colors disabled:opacity-50"
      >
        {isPending ? "Guardando…" : saved ? "Guardado" : "Guardar"}
      </button>
    </form>
  );
}
