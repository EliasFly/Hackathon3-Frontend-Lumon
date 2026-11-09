import React, { useState, useEffect } from 'react';
import { incidentsService } from '../api/services';
import type { Incident, IncidentPage, Severity, LumonApiError } from '../types/lumon';

export const IncidentsPage: React.FC = () => {
  const [incidentsPage, setIncidentsPage] = useState<IncidentPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState<Severity>('MEDIUM');
  const [creating, setCreating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadIncidents = async () => {
    setLoading(true);
    try {
      const data = await incidentsService.getIncidents(0, 10);
      setIncidentsPage(data);
    } catch {
      // 423 if clearance not granted
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadIncidents();
  }, []);

  const handleCreateIncident = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setErrorMsg(null);

    try {
      await incidentsService.createIncident({
        title,
        description,
        severity,
        mediaIds: [], // or attached media
      });
      setShowModal(false);
      setTitle('');
      setDescription('');
      await loadIncidents();
    } catch (err) {
      const apiErr = err as LumonApiError;
      setErrorMsg(apiErr.message || apiErr.error || 'Error al crear reporte');
    } finally {
      setCreating(false);
    }
  };

  const getSeverityBadge = (s: Severity) => {
    switch (s) {
      case 'CRITICAL':
        return 'bg-rose-950 text-rose-300 border-rose-800';
      case 'HIGH':
        return 'bg-orange-950 text-orange-300 border-orange-800';
      case 'MEDIUM':
        return 'bg-amber-950 text-amber-300 border-amber-800';
      case 'LOW':
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-wider text-cyan-400 uppercase font-mono">
            Reportes de Incidencias
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Gestión y auditoría de anomalías en el Piso de Pruebas
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold font-mono rounded transition-colors self-start sm:self-auto"
        >
          + Nueva Incidencia
        </button>
      </div>

      {loading ? (
        <div className="text-center py-24 text-slate-400 font-mono text-sm">
          <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          Cargando reportes de incidencia...
        </div>
      ) : !incidentsPage || incidentsPage.content.length === 0 ? (
        <div className="text-center py-20 bg-slate-900/60 border border-slate-800 rounded-xl p-8">
          <p className="text-slate-400 font-mono text-sm">No hay incidencias reportadas en el sector.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {incidentsPage.content.map((inc: Incident) => (
            <div
              key={inc.id}
              className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-lg space-y-3"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center space-x-3 mb-1">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${getSeverityBadge(inc.severity)}`}>
                      {inc.severity}
                    </span>
                    <h2 className="text-sm font-bold text-slate-100">{inc.title}</h2>
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono">
                    Reportado por: {inc.createdBy.displayName} &middot; {new Date(inc.createdAt).toLocaleString()}
                  </span>
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/60 p-3 rounded-lg border border-slate-800/80">
                {inc.description}
              </p>

              {inc.photos && inc.photos.length > 0 && (
                <div className="flex gap-2 pt-2">
                  {inc.photos.map((p, idx) => (
                    <img
                      key={idx}
                      src={p.url}
                      alt="Evidencia"
                      className="w-20 h-20 object-cover rounded-lg border border-slate-700"
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal Nueva Incidencia */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6 shadow-2xl">
            <h2 className="text-sm font-bold uppercase text-rose-400 font-mono mb-4 border-b border-slate-800 pb-2">
              Registrar Reporte de Incidencia
            </h2>

            {errorMsg && (
              <p className="mb-4 p-2.5 rounded bg-rose-950/60 border border-rose-800 text-rose-300 text-xs">
                {errorMsg}
              </p>
            )}

            <form onSubmit={handleCreateIncident} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Título de la Incidencia:</label>
                <input
                  type="text"
                  required
                  minLength={3}
                  maxLength={120}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="ej: Intento de evasión en Sector B"
                  className="w-full px-3 py-1.5 rounded bg-slate-950 border border-slate-700 text-slate-100 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Severidad:</label>
                <select
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value as Severity)}
                  className="w-full px-3 py-1.5 rounded bg-slate-950 border border-slate-700 text-slate-100 focus:outline-none focus:border-cyan-500"
                >
                  <option value="LOW">LOW</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="HIGH">HIGH</option>
                  <option value="CRITICAL">CRITICAL</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Descripción de los hechos:</label>
                <textarea
                  required
                  rows={4}
                  maxLength={4000}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Detalle de lo ocurrido..."
                  className="w-full px-3 py-1.5 rounded bg-slate-950 border border-slate-700 text-slate-100 focus:outline-none focus:border-cyan-500 resize-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded uppercase tracking-wider transition-colors disabled:opacity-50"
                >
                  {creating ? 'Guardando...' : 'Crear Reporte'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
