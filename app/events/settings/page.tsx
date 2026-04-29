import { getStudioName } from "@/app/events/store";
import SettingsForm from "./SettingsForm";

export const metadata = { title: "Configuración — Picselectr" };

export default async function SettingsPage() {
  const studioName = await getStudioName();

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <p className="text-[10px] tracking-[0.3em] uppercase text-neutral-500 mb-1">
        Configuración
      </p>
      <h1 className="text-2xl font-medium text-white mb-8">Perfil</h1>
      <SettingsForm initialStudioName={studioName ?? ""} />
    </div>
  );
}
