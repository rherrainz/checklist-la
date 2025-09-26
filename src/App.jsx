import { useState, useMemo } from "react";
import ChecklistForm from "./ChecklistForm.jsx";
import QuarterSummary from "./QuarterSummary.jsx";
import branchesRaw from "./branches.json";
import BrandLogo from "./BrandLogo.jsx";

export default function App() {
  const [screen, setScreen] = useState("home"); // "home" | "new" | "edit" | "quarter"

  // ordenamos sucursales una sola vez
  const branches = useMemo(
    () =>
      [...branchesRaw].sort(
        (a, b) =>
          (a.region || "").localeCompare(b.region || "") ||
          (a.zone || "").localeCompare(b.zone || "") ||
          (a.name || "").localeCompare(b.name || "")
      ),
    []
  );

  return (
    <div className="min-h-screen bg-celeste-50 text-gray-900">
      
      {screen === "home" && (
        <div className="flex flex-col items-center justify-top min-h-screen gap-6 p-6">
          <BrandLogo className="w-[200px] h-[200px] md:w-[350px] md:h-[350px]" />
          <h1 className="text-3xl font-bold text-gray-900">
            Checklist de Visitas
          </h1>
          <div className="flex flex-col gap-3 w-full max-w-sm">
            <button
              onClick={() => setScreen("new")}
              className="px-6 py-3 bg-reflex text-white rounded-xl hover:bg-celeste-700"
            >
              Nuevo checklist
            </button>
            <button
              onClick={() => setScreen("edit")}
              className="px-6 py-3 bg-reflex text-white rounded-xl hover:bg-celeste-700"
            >
              Ver / editar checklist (mensual)
            </button>
            <button
              onClick={() => setScreen("quarter")}
              className="px-6 py-3 bg-reflex text-white rounded-xl hover:bg-celeste-700"
            >
              Resumen trimestral
            </button>
          </div>
        </div>
      )}

      {screen === "new" && (
        <ChecklistForm mode="new" onBack={() => setScreen("home")} />
      )}

      {screen === "edit" && (
        <ChecklistForm mode="edit" onBack={() => setScreen("home")} />
      )}

      {screen === "quarter" && (
        <QuarterSummary branches={branches} onBack={() => setScreen("home")} />
      )}
    </div>
  );
}
