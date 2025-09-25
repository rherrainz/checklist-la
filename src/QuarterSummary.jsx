import { useEffect, useMemo, useState } from "react";
import { monthsForQuarter, monthLabel } from "./utils";
import templateData from "./template.json"; // Para listar TODOS los ítems aunque falte algún mes

const API_URL = import.meta.env.VITE_API_URL;

function colorClass(score) {
  if (score == null) return "bg-gray-300"; // sin dato
  if (score <= 4) return "bg-red-500";
  if (score <= 7) return "bg-yellow-400";
  return "bg-green-500";
}

export default function QuarterSummary({ branches , onBack }) {
  const [branchCode, setBranchCode] = useState(branches?.[0]?.code || "");
  const [branchObj, setBranchObj] = useState(branches?.[0] || null);
  const [year, setYear] = useState(new Date().getFullYear());
  const [quarter, setQuarter] = useState(
    (() => {
      const m = new Date().getMonth() + 1;
      return m <= 3 ? 1 : m <= 6 ? 2 : m <= 9 ? 3 : 4;
    })()
  );
  const [loading, setLoading] = useState(false);

  // Estructura:
  // months[m] = { total, timestamp, items: { [id]: {id,label,weight,score} }, observations: [{n,text}, ...] }
  const [monthsData, setMonthsData] = useState({});
  const [avgTotal, setAvgTotal] = useState(null);
  const [hasAll, setHasAll] = useState(false);

  useEffect(() => {
    const found = branches.find((b) => String(b.code) === String(branchCode));
    setBranchObj(found || null);
  }, [branchCode, branches]);

  async function fetchQuarterSummary() {
    if (!API_URL) return alert("Falta VITE_API_URL en .env");
    if (!branchCode) return alert("Elegí una sucursal");
    setLoading(true);
    try {
      const url = new URL(API_URL);
      url.searchParams.set("branchCode", String(branchCode));
      url.searchParams.set("year", String(year));
      url.searchParams.set("quarter", String(quarter));
      const res = await fetch(url.toString());
      const json = await res.json();
      const rows = Array.isArray(json.data) ? json.data : [];

      const wanted = monthsForQuarter(Number(quarter));
      const byMonth = {};

      for (const m of wanted) {
        const rowsM = rows.filter((r) => Number(r.period_month) === Number(m));
        if (!rowsM.length) continue;
        rowsM.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        const last = rowsM[rowsM.length - 1];

        // Parse items y observaciones de ese mes
        let itemsMap = {};
        try {
          const arr = JSON.parse(last.itemsJson || "[]");
          itemsMap = Object.fromEntries(arr.map((it) => [it.id, it]));
        } catch {
          /* noop */
        }

        let obsArr = [];
        try {
          obsArr = JSON.parse(last.obsJson || "[]");
        } catch {
          obsArr = [];
        }

        byMonth[m] = {
          total: Number(last.total || 0),
          timestamp: last.timestamp,
          items: itemsMap,
          observations: obsArr,
          raw: last,
        };
      }

      const allPresent = wanted.every((m) => byMonth[m]);
      setHasAll(allPresent);
      setMonthsData(byMonth);

      const avg = allPresent
        ? Number(
            (
              wanted.reduce(
                (acc, m) => acc + Number(byMonth[m].total || 0),
                0
              ) / 3
            ).toFixed(2)
          )
        : null;
      setAvgTotal(avg);

      if (!rows.length) alert("No hay datos cargados para ese trimestre.");
    } catch (e) {
      console.error(e);
      alert("Error consultando el trimestre.");
    } finally {
      setLoading(false);
    }
  }

  const wantedMonths = useMemo(
    () => monthsForQuarter(Number(quarter)),
    [quarter]
  );

  // Calcula promedio trimestral por ítem (solo si hay 3 meses con dato)
  function itemQuarterAvg(itemId) {
    if (!hasAll) return null;
    const scores = wantedMonths.map(
      (m) => monthsData[m]?.items?.[itemId]?.score
    );
    if (scores.some((s) => s == null)) return null;
    const avg = scores.reduce((a, b) => a + Number(b || 0), 0) / 3;
    return Number(avg.toFixed(2));
  }

  return (
    <div className="p-4 max-w-6xl mx-auto">
      <button
        onClick={onBack}
        className="mb-4 text-celeste-700 hover:underline"
      >
        ← Volver
      </button>
      <h2 className="text-xl font-bold text-reflex mb-4">Resumen trimestral</h2>

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
                {b.region} / {b.zone} — {b.code} {b.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block mb-1 font-semibold">Año</label>
          <input
            type="number"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="border rounded p-2 w-full"
          />
        </div>
        <div>
          <label className="block mb-1 font-semibold">Trimestre</label>
          <select
            value={quarter}
            onChange={(e) => setQuarter(Number(e.target.value))}
            className="border rounded p-2 w-full"
          >
            <option value={1}>Q1 (Ene–Mar)</option>
            <option value={2}>Q2 (Abr–Jun)</option>
            <option value={3}>Q3 (Jul–Sep)</option>
            <option value={4}>Q4 (Oct–Dic)</option>
          </select>
        </div>
        <div className="flex items-end">
          <button
            onClick={fetchQuarterSummary}
            disabled={loading}
            className="w-full px-4 py-2 border border-gray-400 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            {loading ? "Calculando…" : "Ver trimestre"}
          </button>
        </div>
      </div>

      {/* Tabla de items por meses */}
      {Object.keys(monthsData).length > 0 && (
        <div className="mt-2 p-4 border rounded bg-white overflow-x-auto">
          <h3 className="font-bold text-reflex mb-3">
            {branchObj?.code} {branchObj?.name} — Q{quarter} {year}
          </h3>

          <table className="min-w-[800px] w-full border text-sm mb-3">
            <thead className="bg-celeste-100">
              <tr>
                <th className="border px-2 py-1 text-left">Descripción</th>
                {wantedMonths.map((m) => (
                  <th key={m} className="border px-2 py-1 text-center">
                    {monthLabel(m)}
                  </th>
                ))}
                <th className="border px-2 py-1 text-center">Trimestre</th>
                <th className="border px-2 py-1 text-center">Semáforo</th>
              </tr>
            </thead>
            <tbody>
              {templateData.map((tpl) => {
                const scores = wantedMonths.map(
                  (m) => monthsData[m]?.items?.[tpl.id]?.score
                );
                const qAvg = itemQuarterAvg(tpl.id);
                return (
                  <tr key={tpl.id} className="odd:bg-white even:bg-celeste-50">
                    <td className="border px-2 py-1" title={tpl.detail || ""}>
                      {tpl.label}
                    </td>
                    {scores.map((sc, i) => (
                      <td key={i} className="border px-2 py-1 text-center">
                        {sc ?? "—"}
                      </td>
                    ))}
                    <td className="border px-2 py-1 text-center">
                      {qAvg ?? "—"}
                    </td>
                    <td className="border px-2 py-1">
                      <div className="flex justify-center">
                        <span
                          className={`inline-block w-4 h-4 rounded-full ${colorClass(
                            qAvg
                          )}`}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}

              {/* Fila Total */}
              <tr className="bg-gray-100 font-semibold">
                <td className="border px-2 py-1 text-right">Total</td>
                {wantedMonths.map((m) => (
                  <td key={m} className="border px-2 py-1 text-center">
                    {monthsData[m]?.total ?? "—"}
                  </td>
                ))}
                <td className="border px-2 py-1 text-center">
                  {avgTotal ?? "—"}
                </td>
                <td className="border px-2 py-1">
                  <div className="flex justify-center">
                    <span
                      className={`inline-block w-4 h-4 rounded-full ${colorClass(
                        avgTotal
                      )}`}
                    />
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

          {/* Observaciones de los tres meses */}
          <div className="mt-4">
            <h4 className="font-semibold mb-2">Observaciones del trimestre</h4>
            {wantedMonths.map((m) => {
              const obs = monthsData[m]?.observations || [];
              return (
                <div key={m} className="mb-2">
                  <div className="text-sm text-gray-700 mb-1">
                    <b>{monthLabel(m)}:</b>
                  </div>
                  {obs.length ? (
                    <ol className="list-decimal ml-6">
                      {obs.map((o, i) => (
                        <li key={i}>{o.text}</li>
                      ))}
                    </ol>
                  ) : (
                    <p className="text-sm text-gray-500 ml-1">
                      Sin observaciones.
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
