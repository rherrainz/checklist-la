import { useEffect, useMemo, useState } from "react";
import branchesData from "./branches.json";
import templateData from "./template.json";
import supervisorsMap from "./supervisors.json";
import BrandLogo from "./BrandLogo.jsx";

const API_URL = import.meta.env.VITE_API_URL; // Web App de Apps Script

// Ícono info (SVG simple)
const InfoIcon = ({ className = "w-5 h-5" }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
    <path
      d="M12 11v6m0-10h.01"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
);

function getCurrentPeriod(d = new Date()) {
  const m = d.getMonth() + 1;
  const quarter = m <= 3 ? 1 : m <= 6 ? 2 : m <= 9 ? 3 : 4;
  return { year: d.getFullYear(), quarter, month: m };
}
function monthsForQuarter(q) {
  if (q === 1) return [1, 2, 3];
  if (q === 2) return [4, 5, 6];
  if (q === 3) return [7, 8, 9];
  return [10, 11, 12];
}

export default function ChecklistForm({ mode, onBack }) {
  // Filtros / selección
  const [branches, setBranches] = useState([]);
  const [branchCode, setBranchCode] = useState("");
  const [branchObj, setBranchObj] = useState(null);
  const [period, setPeriod] = useState(getCurrentPeriod());
  const { quarter, month } = period; // deps limpias
  const [supType, setSupType] = useState("zonal"); // "zonal" | "regional"
  const [supervisor, setSupervisor] = useState({ name: "", email: "" });

  // Datos de checklist
  const [items, setItems] = useState([]);
  const [observations, setObservations] = useState([]);
  const [obsText, setObsText] = useState("");

  // Estado UI
  const [loading, setLoading] = useState(true);
  const [loadingEdit, setLoadingEdit] = useState(false);
  const [sending, setSending] = useState(false);
  const [step, setStep] = useState("edit"); // "edit" | "review"
  const [action, setAction] = useState("save"); // "save" | "send"

  // Carga base: sucursales + plantilla
useEffect(() => {
  const sorted = [...branchesData].sort((a, b) =>
    String(a.code).localeCompare(String(b.code), "es", { numeric: true })
  );
  setBranches(sorted);

  const def = sorted[0];
  setBranchCode(def?.code || "");
  setBranchObj(def || null);

  setItems(templateData.map((d) => ({ ...d, score: 0 })));
  setObservations([]);
  setPeriod(getCurrentPeriod());
  setLoading(false);
}, []);

  // Sync branchObj
  useEffect(() => {
    const found = branches.find((b) => String(b.code) === String(branchCode));
    setBranchObj(found || null);
  }, [branchCode, branches]);

  // Si cambia trimestre, asegurar mes válido
  useEffect(() => {
    const allowed = monthsForQuarter(Number(quarter));
    if (!allowed.includes(Number(month))) {
      setPeriod((p) => ({ ...p, month: allowed[0] }));
    }
  }, [quarter, month]);

  // Supervisor depende de sucursal (zona/region) y del tipo elegido (zonal/regional)
  useEffect(() => {
    if (!branchObj) return;
    const regional = supervisorsMap?.regional?.[branchObj.region];
    const zonal = supervisorsMap?.zonal?.[branchObj.zone];
    const chosen = supType === "regional" ? regional : zonal;
    setSupervisor({ name: chosen?.name || "", email: chosen?.email || "" });
  }, [branchObj, supType]);

  // Total ponderado
  const total = useMemo(() => {
    const sw = items.reduce((acc, it) => acc + Number(it.weight || 0), 0);
    const s = items.reduce(
      (acc, it) => acc + Number(it.weight || 0) * Number(it.score || 0),
      0
    );
    return sw ? Number((s / sw).toFixed(2)) : 0;
  }, [items]);

  // GET a la base: traer último registro para filtros actuales (solo "edit")
  async function fetchFromDB() {
    if (!API_URL) return alert("Falta VITE_API_URL en .env");
    if (!branchCode) return alert("Elegí una sucursal");

    setLoadingEdit(true);
    try {
      const url = new URL(API_URL);
      url.searchParams.set("branchCode", String(branchCode));
      url.searchParams.set("year", String(period.year));
      url.searchParams.set("quarter", String(period.quarter));
      url.searchParams.set("month", String(period.month));

      const res = await fetch(url.toString());
      const json = await res.json();
      const arr = json.data || [];
      const last = arr[arr.length - 1];

      if (!last) {
        alert("No hay checklist para esos filtros.");
        return;
      }

      // Merge de scores por id (sin note)
      try {
        const parsedItems = JSON.parse(last.itemsJson || "[]");
        const map = Object.fromEntries(parsedItems.map((p) => [p.id, p]));
        setItems((prev) =>
          prev.map((it) => ({
            ...it,
            score: map[it.id]?.score ?? 0,
          }))
        );
      } catch {
        /* noop */
      }

      // Observaciones numeradas
      try {
        const parsedObs = JSON.parse(last.obsJson || "[]");
        const normalized = parsedObs.map((o, i) => ({
          n: o.n ?? i + 1,
          text: o.text ?? String(o),
        }));
        setObservations(normalized);
      } catch {
        setObservations([]);
      }

      alert("Último checklist cargado.");
    } catch (e) {
      console.error(e);
      alert("Error consultando la base (GET).");
    } finally {
      setLoadingEdit(false);
    }
  }

  // Observaciones numeradas
  function addObservation() {
    const t = obsText.trim();
    if (!t) return;
    setObservations((prev) => [...prev, { n: prev.length + 1, text: t }]);
    setObsText("");
  }
  function removeObservation(i) {
    setObservations((prev) =>
      prev.filter((_, idx) => idx !== i).map((o, idx) => ({ ...o, n: idx + 1 }))
    );
  }

  // Validaciones mínimas
  function validate() {
    if (!API_URL) return "Falta VITE_API_URL en .env";
    if (!branchObj) return "Elegí una sucursal";
    if (!supervisor.name || !supervisor.email)
      return "Seleccioná Zonal o Regional (supervisor inválido)";
    for (const it of items) {
      const sc = Number(it.score);
      if (Number.isNaN(sc) || sc < 0 || sc > 10) {
        return `Puntaje inválido en ${it.id} (0–10)`;
      }
    }
    return null;
  }

  // POST (guardar / enviar)
  const ENV = import.meta.env.VITE_ENV || "DEV";

  async function submit(kind) {
    const err = validate();
    if (err) return alert(err);

    const willSend = kind === "send" && ENV === "PROD"; // ← decide envío real

    const payload = {
      visitId: crypto.randomUUID(),
      branchCode: String(branchObj.code),
      branchName: branchObj.name,
      zone: branchObj.zone,
      region: branchObj.region,
      supervisor,
      period,
      date: new Date().toISOString(),
      items,
      observations,
      total,
      sendEmail: willSend, // ← sólo true en PROD + "send"
    };

    setAction(kind);
    setSending(true);
    try {
      await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        mode: "no-cors",
        body: JSON.stringify(payload),
      });
      if (kind === "send") {
        alert(
          willSend
            ? "Enviado por correo."
            : "Guardado (DEV): no se enviaron correos."
        );
      } else {
        alert("Guardado sin enviar.");
      }
    } catch (e) {
      console.error(e);
      alert("Error al enviar (POST).");
    } finally {
      setSending(false);
    }
  }

  if (loading) return <div className="p-6">Cargando…</div>;
  const months = monthsForQuarter(Number(period.quarter));

  return (
    <div className="p-4 max-w-5xl mx-auto">
      <button
        onClick={onBack}
        className="mb-4 text-celeste-700 hover:underline"
      >
        ← Volver
      </button>

{/* Título principal con sucursal actual */}
<BrandLogo className="w-10 h-10 md:w-12 md:h-12" />
<h1 className="text-2xl font-extrabold text-reflex mb-1">
  {branchObj
    ? `${branchObj.code} — ${branchObj.name} · ${branchObj.zone} · ${branchObj.region}`
    : "Seleccioná una sucursal"}
</h1>

<h2 className="text-xl font-bold text-reflex mb-4">
  {mode === "new" ? "Nuevo checklist" : "Ver / Editar checklist"}
</h2>

      {/* Filtros */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
  <div>
    <label className="block mb-1 font-semibold">Sucursal</label>
    <select
      value={branchCode}
      onChange={(e) => setBranchCode(e.target.value)}
      className="border rounded p-2 w-full"
    >
      {branches.map((b) => (
        <option key={b.code} value={b.code}>
          {b.code} — {b.name} | {b.zone} | {b.region}
        </option>
      ))}
    </select>
    <p className="text-xs text-gray-500 mt-1">
      Ordenado por código de sucursal
    </p>
  </div>
        <div>
          <label className="block mb-1 font-semibold">Año</label>
          <input
            type="number"
            value={period.year}
            onChange={(e) =>
              setPeriod((p) => ({ ...p, year: Number(e.target.value) }))
            }
            className="border rounded p-2 w-full"
          />
        </div>
        <div>
          <label className="block mb-1 font-semibold">Trimestre</label>
          <select
            value={period.quarter}
            onChange={(e) =>
              setPeriod((p) => ({ ...p, quarter: Number(e.target.value) }))
            }
            className="border rounded p-2 w-full"
          >
            <option value={1}>Q1 (Ene–Mar)</option>
            <option value={2}>Q2 (Abr–Jun)</option>
            <option value={3}>Q3 (Jul–Sep)</option>
            <option value={4}>Q4 (Oct–Dic)</option>
          </select>
        </div>
        <div>
          <label className="block mb-1 font-semibold">Mes</label>
          <select
            value={period.month}
            onChange={(e) =>
              setPeriod((p) => ({ ...p, month: Number(e.target.value) }))
            }
            className="border rounded p-2 w-full"
          >
            {months.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Supervisor (solo Zonal) + info sucursal */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {/* Panel Supervisor */}
        <div>
          <label className="block mb-1 font-semibold">Supervisor</label>
          <div className="flex items-center gap-4 mb-2">
            <label className="inline-flex items-center gap-2">
              <input
                type="radio"
                value="zonal"
                checked={supType === "zonal"}
                onChange={(e) => setSupType(e.target.value)}
              />
              <span>Gerente Zonal</span>
            </label>

            <label className="inline-flex items-center gap-2">
              <input
                type="radio"
                value="regional"
                checked={supType === "regional"}
                onChange={(e) => setSupType(e.target.value)}
              />
              <span>Gerente Regional</span>
            </label>
          </div>
          <div className="p-3 border rounded bg-celeste-50">
            <div className="text-sm text-gray-700">
              <div>
                <b>Nombre:</b> {supervisor.name || "-"}
              </div>
              <div>
                <b>Email:</b> {supervisor.email || "-"}
              </div>
            </div>
          </div>
        </div>

        {/* Panel Sucursal */}
        <div className="text-sm text-gray-700 p-3 border rounded bg-white">
          <div>
            <b>Región:</b> {branchObj?.region}
          </div>
          <div>
            <b>Zona:</b> {branchObj?.zone}
          </div>
          <div>
            <b>Sucursal:</b> {branchObj?.code} {branchObj?.name}
          </div>
        </div>
      </div>

      {/* Ítems (con columna Info) */}
      {step === "edit" && (
        <>
          <table className="w-full border text-sm mb-4">
            <thead className="bg-celeste-100">
              <tr>
                <th className="border px-2 py-1">ID</th>
                <th className="border px-2 py-1">Ítem</th>
                <th className="border px-2 py-1 w-12 text-center">Info</th>
                <th className="border px-2 py-1" title="Ponderación">
                  Peso
                </th>
                <th className="border px-2 py-1">Puntaje</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it, idx) => (
                <tr key={it.id} className="odd:bg-white even:bg-celeste-50">
                  <td className="border px-2 py-1">{it.id}</td>
                  <td className="border px-2 py-1" title={it.detail || ""}>
                    {it.label}
                  </td>

                  {/* Info con tooltip (hover + focus para mobile) */}
                  <td className="border px-2 py-1">
                    <div className="relative group flex justify-center">
                      <button
                        type="button"
                        className="inline-flex items-center justify-center focus:outline-none"
                        aria-label="Ver detalle del ítem"
                        tabIndex={0}
                      >
                        <InfoIcon className="w-5 h-5 text-gray-500 group-hover:text-gray-700" />
                      </button>
                      <span className="pointer-events-none absolute z-10 left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:block group-focus-within:block whitespace-pre-line max-w-xs rounded bg-gray-900 text-white text-xs px-2 py-1 shadow">
                        {it.detail?.trim() ? it.detail : "Sin detalle"}
                      </span>
                    </div>
                  </td>

                  <td className="border px-2 py-1 text-center">
                    {(it.weight * 100).toFixed(0)}%
                  </td>
                  <td className="border px-2 py-1 text-center">
                    <select
                      value={it.score}
                      onChange={(e) =>
                        setItems((prev) =>
                          prev.map((x, i) =>
                            i === idx
                              ? { ...x, score: Number(e.target.value) }
                              : x
                          )
                        )
                      }
                      className="border rounded p-1"
                    >
                      {[...Array(11).keys()].map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Observaciones numeradas (únicas) */}
          <div className="mb-4">
            <label className="block mb-1 font-semibold">Observaciones</label>
            <div className="flex gap-2 mb-2">
              <input
                className="border rounded p-2 flex-1"
                placeholder="Escribí una observación"
                value={obsText}
                onChange={(e) => setObsText(e.target.value)}
              />
              <button
                onClick={addObservation}
                className="px-4 py-2 bg-gray-800 text-white rounded"
              >
                Agregar
              </button>
            </div>
            <ul className="space-y-1">
              {observations.map((o, i) => (
                <li
                  key={i}
                  className="flex items-center justify-between border rounded p-2 bg-white"
                >
                  <span>
                    <b>{o.n}.</b> {o.text}
                  </span>
                  <button
                    onClick={() => removeObservation(i)}
                    className="text-sm text-red-600"
                  >
                    Quitar
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <p className="text-lg font-bold mb-4">Puntaje final: {total}</p>

          <div className="flex gap-3 flex-wrap">
            {mode === "edit" && (
              <button
                onClick={fetchFromDB}
                disabled={loadingEdit}
                className="px-4 py-2 border border-celeste-700 text-celeste-700 rounded-lg hover:bg-celeste-50"
              >
                {loadingEdit ? "Buscando…" : "Buscar último cargado"}
              </button>
            )}
            <button
              onClick={() => setStep("review")}
              className="px-4 py-2 border border-celeste-700 text-celeste-700 rounded-lg hover:bg-celeste-50"
            >
              Revisar checklist
            </button>
          </div>
        </>
      )}

      {/* Revisión con semáforos (ícono circular) */}
      {step === "review" && (
        <div className="my-4 p-4 border rounded bg-white">
          <h3 className="font-bold mb-3 text-reflex">Revisión</h3>
          <table className="w-full border text-sm mb-4">
            <thead className="bg-celeste-100">
              <tr>
                <th className="border px-2 py-1">Ítem</th>
                <th className="border px-2 py-1 w-12 text-center">Info</th>
                <th className="border px-2 py-1">Peso</th>
                <th className="border px-2 py-1">Puntaje</th>
                <th className="border px-2 py-1">Semáforo</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr key={it.id} className="odd:bg-white even:bg-celeste-50">
                  <td className="border px-2 py-1">{it.label}</td>

                  {/* Info con tooltip (hover + focus para mobile) */}
                  <td className="border px-2 py-1">
                    <div className="relative group flex justify-center">
                      <button
                        type="button"
                        className="inline-flex items-center justify-center focus:outline-none"
                        aria-label="Ver detalle del ítem"
                        tabIndex={0}
                      >
                        <InfoIcon className="w-5 h-5 text-gray-500 group-hover:text-gray-700" />
                      </button>
                      <span className="pointer-events-none absolute z-10 left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:block group-focus-within:block whitespace-pre-line max-w-xs rounded bg-gray-900 text-white text-xs px-2 py-1 shadow">
                        {it.detail?.trim() ? it.detail : "Sin detalle"}
                      </span>
                    </div>
                  </td>

                  <td className="border px-2 py-1 text-center">
                    {(it.weight * 100).toFixed(0)}%
                  </td>
                  <td className="border px-2 py-1 text-center">{it.score}</td>
                  <td className="border px-2 py-1">
                    <div className="flex justify-center">
                      <span
                        className={`inline-block w-4 h-4 rounded-full ${
                          it.score <= 4
                            ? "bg-red-500"
                            : it.score <= 7
                            ? "bg-yellow-400"
                            : "bg-green-500"
                        }`}
                        title={
                          it.score <= 4
                            ? "Rojo"
                            : it.score <= 7
                            ? "Amarillo"
                            : "Verde"
                        }
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mb-3">
            <b>Observaciones</b>
            {observations.length ? (
              <ol className="list-decimal ml-6">
                {observations.map((o) => (
                  <li key={o.n}>{o.text}</li>
                ))}
              </ol>
            ) : (
              <p className="text-gray-600 text-sm">Sin observaciones.</p>
            )}
          </div>

          <p className="text-lg font-bold mb-4">Puntaje final: {total}</p>

          <div className="flex gap-3 flex-wrap">
            <button
              onClick={() => setStep("edit")}
              className="px-4 py-2 border rounded"
            >
              Volver a editar
            </button>
            <button
              onClick={() => submit("save")}
              disabled={sending}
              className="px-6 py-3 bg-gray-800 text-white rounded-xl hover:bg-gray-900"
            >
              {sending && action === "save"
                ? "Guardando…"
                : "Guardar evaluación"}
            </button>
            <button
              onClick={() => submit("send")}
              disabled={sending}
              className="px-6 py-3 bg-reflex text-white rounded-xl hover:bg-celeste-700"
            >
              {sending && action === "send" ? "Enviando…" : "Enviar por correo"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
