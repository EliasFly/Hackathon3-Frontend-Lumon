import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { filesService } from '../api/services';
import type { LumonFile, FilePage } from '../types/lumon';
import { TEMPER_NAMES } from '../utils/mdr';

export const FilesPage: React.FC = () => {
  const [filePage, setFilePage] = useState<FilePage | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);

  const loadFiles = async (p = 0) => {
    setLoading(true);
    try {
      const data = await filesService.getFiles(p, 10);
      setFilePage(data);
      setPage(p);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFiles(0);
  }, []);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-cyan-950 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-wider text-cyan-400 uppercase font-mono">
            Archivos de Macrodatos
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Macrodata Refinement &middot; Selecciona un archivo para acceder a la terminal de refinamiento
          </p>
        </div>
        <button
          onClick={() => loadFiles(page)}
          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono rounded border border-slate-700 self-start sm:self-auto"
        >
          ↻ Actualizar Lista
        </button>
      </div>

      {loading ? (
        <div className="text-center py-24 text-slate-400 font-mono text-sm">
          <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          Cargando archivos del workspace...
        </div>
      ) : !filePage || filePage.content.length === 0 ? (
        <div className="text-center py-20 bg-slate-900/60 border border-slate-800 rounded-xl p-8">
          <p className="text-slate-400 text-sm font-mono">No hay archivos disponibles en este momento.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filePage.content.map((file: LumonFile) => {
            const overallPct = Math.round(file.progress.overall * 100);
            return (
              <div
                key={file.id}
                className="bg-slate-900/80 border border-slate-800 hover:border-cyan-800/80 rounded-xl p-5 shadow-lg transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-bold text-slate-100 font-mono tracking-wide">
                      {file.name}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                        file.status === 'COMPLETE'
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          : 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                      }`}
                    >
                      {file.status}
                    </span>
                  </div>

                  <div className="text-xs text-slate-400 space-y-1 mb-4 font-mono">
                    <div className="flex justify-between">
                      <span>Dimensiones:</span>
                      <span className="text-slate-200">{file.rows} &times; {file.cols} celdas (Bloque: {file.tileSize})</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Grupos Refinados:</span>
                      <span className="text-slate-200">{file.refinedGroups} / {file.totalGroups}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Errores (Mistakes):</span>
                      <span className={file.mistakes > 0 ? 'text-rose-400 font-bold' : 'text-slate-200'}>
                        {file.mistakes}
                      </span>
                    </div>
                  </div>

                  {/* Tempers Progress Bars */}
                  <div className="space-y-2 mb-5">
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-cyan-400 font-bold">PROGRESO TOTAL</span>
                      <span className="text-slate-200 font-bold">{overallPct}%</span>
                    </div>
                    <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                      <div
                        className="bg-gradient-to-r from-cyan-500 to-blue-500 h-full transition-all duration-500"
                        style={{ width: `${overallPct}%` }}
                      />
                    </div>

                    <div className="grid grid-cols-4 gap-2 pt-2">
                      {(['WO', 'FC', 'DR', 'MA'] as const).map((bin) => {
                        const binPct = Math.round(file.progress[bin] * 100);
                        const info = TEMPER_NAMES[bin];
                        return (
                          <div key={bin} className="text-center font-mono">
                            <span className={`text-[10px] block ${info.color}`}>{bin} ({binPct}%)</span>
                            <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden mt-1 border border-slate-800">
                              <div
                                className={`h-full ${info.bg.split(' ')[0]}`}
                                style={{ width: `${binPct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <Link
                  to={`/files/${file.id}`}
                  className="w-full py-2.5 text-center bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-xs uppercase tracking-wider rounded-lg transition-colors font-mono shadow-[0_0_12px_rgba(6,182,212,0.3)] block"
                >
                  Abrir Consola MDR &rarr;
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
