import React, { useState, useEffect } from 'react';
import { clearanceService } from '../api/services';
import type { WellnessDraw, Clearance, WellnessScheduleItem } from '../types/lumon';

export const WellnessPage: React.FC = () => {
  const [draw, setDraw] = useState<WellnessDraw | null>(null);
  const [clearance, setClearance] = useState<Clearance | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const [d, c] = await Promise.all([
        clearanceService.getWellnessDraw(),
        clearanceService.getClearance().catch(() => null),
      ]);
      setDraw(d);
      setClearance(c);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12 font-mono">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-wider text-cyan-400 uppercase">
            Sala de Bienestar (Wellness Room)
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Sorteo público de rondas y estado de acreditación Lumon
          </p>
        </div>
        <button
          onClick={loadData}
          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded border border-slate-700"
        >
          ↻ Actualizar
        </button>
      </div>

      {loading && !draw ? (
        <div className="text-center py-24 text-slate-400 text-sm">
          <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          Sintonizando Sala de Bienestar...
        </div>
      ) : (
        <div className="space-y-6">
          {/* Clearance Status Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
            <span className="text-[10px] text-cyan-400 uppercase tracking-widest block mb-1">
              ESTADO DEL PISO DE PRUEBAS
            </span>
            <div className="flex items-center space-x-3 mt-2">
              <span
                className={`w-3 h-3 rounded-full ${
                  clearance?.granted ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                }`}
              />
              <span className="text-sm font-bold text-slate-100">
                {clearance?.granted ? 'CLEARANCE CONCEDIDO (PISO ABIERTO)' : 'CLEARANCE PENDIENTE DE REVISIÓN'}
              </span>
            </div>
            {clearance?.grantedAt && (
              <p className="text-xs text-slate-400 mt-2">
                Concedido el: {new Date(clearance.grantedAt).toLocaleString()}
              </p>
            )}
          </div>

          {/* Sorteo de Rondas */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="text-xs font-bold text-slate-200 uppercase">
                Cronograma del Sorteo de Rondas
              </span>
              <span className="text-[11px] text-cyan-300">
                Hora Servidor: {draw?.serverTime ? new Date(draw.serverTime).toLocaleTimeString() : '--:--'}
              </span>
            </div>

            {draw?.schedule && draw.schedule.length > 0 ? (
              <div className="space-y-3">
                {draw.schedule.map((item: WellnessScheduleItem, idx: number) => (
                  <div
                    key={idx}
                    className="p-3 bg-slate-950 rounded-lg border border-slate-800 flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="text-cyan-400 font-bold block">Ronda {idx + 1}</span>
                      <span className="text-slate-400 text-[11px]">Inicio programado</span>
                    </div>
                    <span className="text-slate-200 font-mono">
                      {JSON.stringify(item)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-slate-500 text-xs">
                El sorteo comenzará cuando todas las cuadrillas hayan inscrito su roster de 3 integrantes.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
