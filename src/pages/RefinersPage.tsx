import React, { useState, useEffect } from 'react';
import { refinersService } from '../api/services';
import type { Refiner, Department, RefinerPage, LumonApiError } from '../types/lumon';

export const RefinersPage: React.FC = () => {
  const [refinersPage, setRefinersPage] = useState<RefinerPage | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRefiner, setSelectedRefiner] = useState<Refiner | null>(null);
  const [currentEtag, setCurrentEtag] = useState<string | null>(null);

  // Edit form state
  const [title, setTitle] = useState('');
  const [deptId, setDeptId] = useState<number>(1);
  const [status, setStatus] = useState<'ACTIVE' | 'SEVERED' | 'PROBATION'>('ACTIVE');
  const [notes, setNotes] = useState('');
  const [saveLoading, setSaveLoading] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; isError?: boolean } | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [rPage, depts] = await Promise.all([
        refinersService.getRefiners(0, 10),
        refinersService.getDepartments(),
      ]);
      setRefinersPage(rPage);
      setDepartments(depts);
    } catch {
      // might be 423 CLEARANCE_REQUIRED if floor is not yet opened
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenEdit = async (refinerId: number) => {
    setSaveLoading(true);
    setFeedbackMsg(null);
    try {
      const { refiner, etag } = await refinersService.getRefiner(refinerId);
      setSelectedRefiner(refiner);
      setCurrentEtag(etag);
      setTitle(refiner.title);
      setDeptId(refiner.departmentId);
      setStatus(refiner.status);
      setNotes(refiner.notes || '');
    } catch (err) {
      const apiErr = err as LumonApiError;
      alert(`Error al abrir expediente: ${apiErr.message || apiErr.error}`);
    } finally {
      setSaveLoading(false);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRefiner || !currentEtag) return;

    setSaveLoading(true);
    setFeedbackMsg(null);
    try {
      const updated = await refinersService.patchRefiner(
        selectedRefiner.id,
        {
          title,
          departmentId: deptId,
          status,
          notes,
        },
        currentEtag
      );
      setSelectedRefiner(updated);
      setFeedbackMsg({ text: 'Expediente actualizado con éxito (ETag verificado).' });
      await loadData();
    } catch (err) {
      const apiErr = err as LumonApiError;
      setFeedbackMsg({ text: `Error de versión: ${apiErr.message || apiErr.error}`, isError: true });
    } finally {
      setSaveLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12 font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-wider text-cyan-400 uppercase font-mono">
            Directorio de Expedientes
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Personal Severed &middot; Control de Versión con ETag & If-Match
          </p>
        </div>
        <button
          onClick={loadData}
          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono rounded border border-slate-700"
        >
          ↻ Actualizar
        </button>
      </div>

      {loading ? (
        <div className="text-center py-24 text-slate-400 font-mono text-sm">
          <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          Accediendo a la base de expedientes...
        </div>
      ) : !refinersPage || refinersPage.content.length === 0 ? (
        <div className="text-center py-20 bg-slate-900/60 border border-slate-800 rounded-xl p-8">
          <p className="text-amber-300 font-mono text-sm mb-1">Piso de Pruebas no disponible o sin registros</p>
          <p className="text-xs text-slate-500">
            Asegúrate de haber aprobado la revisión con POST /clearance/check en la pestaña de Integraciones.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* List of Refiners */}
          <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {refinersPage.content.map((r: Refiner) => (
              <div
                key={r.id}
                className="bg-slate-900/90 border border-slate-800 hover:border-cyan-800 rounded-xl p-4 shadow-lg flex flex-col justify-between"
              >
                <div className="flex items-start space-x-3 mb-3">
                  <div className="w-12 h-12 rounded-lg bg-slate-950 border border-slate-800 overflow-hidden flex items-center justify-center text-cyan-400 font-bold text-lg font-mono">
                    {r.badgeUrl ? (
                      <img src={r.badgeUrl} alt={r.firstName} className="w-full h-full object-cover" />
                    ) : (
                      r.firstName[0] + r.lastName[0]
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-[10px] text-cyan-400 font-mono uppercase block">
                      {r.employeeId} &middot; v{r.version}
                    </span>
                    <h3 className="text-sm font-bold text-slate-100 truncate">
                      {r.firstName} {r.lastName}
                    </h3>
                    <p className="text-xs text-slate-400 truncate">{r.title}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs pt-3 border-t border-slate-800/80">
                  <span className="text-[11px] font-mono text-slate-400">{r.department.name}</span>
                  <button
                    onClick={() => handleOpenEdit(r.id)}
                    className="px-2.5 py-1 bg-cyan-950 hover:bg-cyan-900 border border-cyan-800 text-cyan-300 rounded text-xs font-mono"
                  >
                    Editar (ETag)
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Edit Expediente Panel */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl h-fit">
            <h2 className="text-sm font-bold uppercase tracking-wider text-cyan-400 font-mono mb-4 border-b border-slate-800 pb-2">
              Expediente: {selectedRefiner ? `${selectedRefiner.firstName} ${selectedRefiner.lastName}` : 'Seleccione Refinador'}
            </h2>

            {selectedRefiner ? (
              <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
                {currentEtag && (
                  <div className="text-[10px] font-mono text-slate-400 bg-slate-950 p-2 rounded border border-slate-800">
                    Versión actual ETag: <span className="text-amber-300 font-bold">{currentEtag}</span>
                  </div>
                )}

                <div>
                  <label className="block text-slate-400 mb-1">Cargo / Título:</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3 py-1.5 rounded bg-slate-950 border border-slate-700 text-slate-100 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Departamento:</label>
                  <select
                    value={deptId}
                    onChange={(e) => setDeptId(Number(e.target.value))}
                    className="w-full px-3 py-1.5 rounded bg-slate-950 border border-slate-700 text-slate-100 focus:outline-none focus:border-cyan-500"
                  >
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Estado:</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as 'ACTIVE' | 'SEVERED' | 'PROBATION')}
                    className="w-full px-3 py-1.5 rounded bg-slate-950 border border-slate-700 text-slate-100 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="SEVERED">SEVERED</option>
                    <option value="PROBATION">PROBATION</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Notas confidenciales:</label>
                  <textarea
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-3 py-1.5 rounded bg-slate-950 border border-slate-700 text-slate-100 focus:outline-none focus:border-cyan-500 resize-none"
                  />
                </div>

                {feedbackMsg && (
                  <p className={`p-2 rounded text-[11px] border ${feedbackMsg.isError ? 'bg-rose-950/50 text-rose-300 border-rose-800' : 'bg-emerald-950/50 text-emerald-300 border-emerald-800'}`}>
                    {feedbackMsg.text}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={saveLoading}
                  className="w-full py-2 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold rounded text-xs uppercase tracking-wider transition-colors disabled:opacity-50"
                >
                  {saveLoading ? 'Guardando...' : 'Actualizar Expediente (PATCH)'}
                </button>
              </form>
            ) : (
              <p className="text-slate-500 text-xs">
                Selecciona un empleado de la lista para ver y editar su expediente con control de concurrencia.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
