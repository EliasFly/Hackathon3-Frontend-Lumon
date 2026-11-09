import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { filesService } from '../api/services';
import type {
  LumonFile,
  Rules,
  Tile,
  FloorWsServerMessage,
  FloorWsClientMessage,
  TemperBin,
  LumonApiError,
} from '../types/lumon';
import {
  parseTileCells,
  findScaryGroups,
  TEMPER_NAMES,
  type ScaryCell,
  type ScaryGroup,
} from '../utils/mdr';

const WS_BASE_URL = (import.meta.env.VITE_WS_BASE_URL || 'wss://lumon-api.vercel.app/api/v1').replace(/\/$/, '');

export const MdrConsolePage: React.FC = () => {
  const { fileId } = useParams<{ fileId: string }>();
  const numFileId = Number(fileId);

  const [file, setFile] = useState<LumonFile | null>(null);
  const [rules, setRules] = useState<Rules | null>(null);
  const [tile, setTile] = useState<Tile | null>(null);
  const [tileRow, setTileRow] = useState(0);
  const [tileCol, setTileCol] = useState(0);

  const [cellsGrid, setCellsGrid] = useState<ScaryCell[][]>([]);
  const [scaryGroups, setScaryGroups] = useState<ScaryGroup[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<ScaryGroup | null>(null);

  const [loading, setLoading] = useState(true);
  const [refining, setRefining] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  // Floor WS state
  const [wsConnected, setWsConnected] = useState(false);
  const [members, setMembers] = useState<Array<{ userId: number; displayName: string; r: number | null; c: number | null }>>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const pingIntervalRef = useRef<number | null>(null);

  // Load File & Rules
  useEffect(() => {
    if (!numFileId) return;

    const loadMeta = async () => {
      try {
        const [f, r] = await Promise.all([
          filesService.getFile(numFileId),
          filesService.getRules(numFileId),
        ]);
        setFile(f);
        setRules(r);
      } catch (err) {
        const apiErr = err as LumonApiError;
        setStatusMsg(`Error cargando archivo: ${apiErr.message || apiErr.error}`);
      }
    };

    loadMeta();
  }, [numFileId]);

  // Load Tile
  const loadTileData = useCallback(async (r: number, c: number) => {
    if (!numFileId || !rules) return;
    setLoading(true);
    setStatusMsg(null);
    try {
      const t = await filesService.getTile(numFileId, r, c);
      setTile(t);
      const parsed = parseTileCells(t, rules);
      setCellsGrid(parsed);
      const detected = findScaryGroups(parsed, rules);
      setScaryGroups(detected);
      if (detected.length > 0) {
        setSelectedGroup(detected[0]);
      } else {
        setSelectedGroup(null);
      }
    } catch (err) {
      const apiErr = err as LumonApiError;
      setStatusMsg(`Error cargando tile: ${apiErr.message || apiErr.error}`);
    } finally {
      setLoading(false);
    }
  }, [numFileId, rules]);

  useEffect(() => {
    if (rules) {
      loadTileData(tileRow, tileCol);
    }
  }, [rules, tileRow, tileCol, loadTileData]);

  // Floor WebSocket Connection
  useEffect(() => {
    if (!numFileId) return;

    let active = true;

    const connectWs = async () => {
      try {
        const { ticket } = await filesService.getFloorTicket(numFileId);
        if (!active) return;

        const ws = new WebSocket(`${WS_BASE_URL}/floor/ws?ticket=${ticket}`);
        wsRef.current = ws;

        ws.onopen = () => {
          if (!active) return;
          setWsConnected(true);
          // Heartbeat ping every 18 seconds
          pingIntervalRef.current = window.setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
              const pingMsg: FloorWsClientMessage = { type: 'ping', t: Date.now() };
              ws.send(JSON.stringify(pingMsg));
            }
          }, 18000);
        };

        ws.onmessage = (event) => {
          if (!active) return;
          try {
            const msg = JSON.parse(event.data) as FloorWsServerMessage;
            if (msg.type === 'snapshot') {
              setMembers(msg.members);
            } else if (msg.type === 'member.joined') {
              setMembers((prev) => [...prev.filter((m) => m.userId !== msg.userId), { userId: msg.userId, displayName: msg.displayName, r: null, c: null }]);
            } else if (msg.type === 'member.left') {
              setMembers((prev) => prev.filter((m) => m.userId !== msg.userId));
            } else if (msg.type === 'cursor') {
              setMembers((prev) => prev.map((m) => (m.userId === msg.userId ? { ...m, r: msg.r, c: msg.c } : m)));
            } else if (msg.type === 'claim.denied') {
              setStatusMsg(`Reserva denegada: ${msg.reason === 'HELD' ? `Ocupada por ${msg.holder?.displayName}` : 'No es un grupo válido'}`);
            }
          } catch {
            // ignore
          }
        };

        ws.onclose = () => {
          if (!active) return;
          setWsConnected(false);
        };
      } catch {
        // Floor WS might require clearance if not open yet
      }
    };

    connectWs();

    return () => {
      active = false;
      if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, [numFileId]);

  // Handle cell click / group selection
  const handleCellClick = (cell: ScaryCell) => {
    // Check if cell is in a scary group
    const grp = scaryGroups.find((g) => g.cells.some((c) => c.r === cell.r && c.c === cell.c));
    if (grp) {
      setSelectedGroup(grp);

      // Claim group via WebSocket if connected
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        const claimMsg: FloorWsClientMessage = {
          type: 'claim',
          requestId: `clm-${Date.now()}`,
          r: cell.r,
          c: cell.c,
        };
        wsRef.current.send(JSON.stringify(claimMsg));
      }
    }
  };

  // Submit Refinement (POST /files/{id}/refinements)
  const handleRefineSelected = async (targetBinOverride?: TemperBin) => {
    if (!selectedGroup || !numFileId || !file) return;

    const binToRefine = targetBinOverride || selectedGroup.targetBin;
    setRefining(true);
    setStatusMsg(null);

    try {
      const res = await filesService.refine(numFileId, binToRefine, selectedGroup.cells);
      setStatusMsg(`¡Grupo refinado con éxito en la caja ${binToRefine}! (${res.data.size} celdas)`);

      // Update file progress
      setFile((prev) => prev ? {
        ...prev,
        progress: res.data.file.progress,
        refinedGroups: res.data.file.refinedGroups,
        totalGroups: res.data.file.totalGroups,
        mistakes: res.data.file.mistakes,
        status: res.data.file.status,
      } : null);

      // Refresh tile data
      await loadTileData(tileRow, tileCol);
    } catch (err) {
      const apiErr = err as LumonApiError;
      setStatusMsg(`Error al refinar: ${apiErr.message || apiErr.error}`);
    } finally {
      setRefining(false);
    }
  };

  const maxTileRows = file ? Math.ceil(file.rows / file.tileSize) : 1;
  const maxTileCols = file ? Math.ceil(file.cols / file.tileSize) : 1;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 font-mono">
      {/* Lumon Terminal Header */}
      <div className="bg-slate-900 border border-cyan-900/60 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center space-x-4">
          <Link
            to="/files"
            className="px-2.5 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded border border-slate-700"
          >
            &larr; Volver
          </Link>
          <div>
            <h1 className="text-lg font-bold text-cyan-400 tracking-wider">
              {file?.name || `Archivo #${numFileId}`}
            </h1>
            <span className="text-[11px] text-slate-400">
              Dimensiones: {file?.rows} &times; {file?.cols} &middot; Bloque: {file?.tileSize}
            </span>
          </div>
        </div>

        {/* Progress & WebSocket Badge */}
        <div className="flex items-center space-x-4 text-xs">
          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded bg-slate-950 border border-slate-800">
            <span className="text-slate-400">Piso WS:</span>
            <span className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-emerald-400' : 'bg-slate-600'}`} />
            <span className={wsConnected ? 'text-emerald-400' : 'text-slate-500'}>
              {wsConnected ? 'ACTIVO' : 'OFFLINE'}
            </span>
            {members.length > 0 && (
              <span className="text-[10px] text-cyan-300">({members.length} usuarios)</span>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-slate-400">Progreso:</span>
            <span className="text-cyan-300 font-bold">
              {file ? Math.round(file.progress.overall * 100) : 0}%
            </span>
          </div>
        </div>
      </div>

      {/* Rules & Tile Navigator Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
        {/* Rules Card */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-3">
          <span className="text-cyan-400 font-bold block mb-1">REGLAS DE REFINAMIENTO</span>
          {rules ? (
            <div className="text-[11px] text-slate-300 space-y-0.5">
              <div>Umbral Temblor: <span className="text-amber-300">&ge; {rules.tremorThreshold}</span></div>
              <div>Conectividad: <span className="text-cyan-300">{rules.connectivity}-vías</span></div>
              <div>Tamaño Grupo: <span className="text-cyan-300">{rules.minGroupSize} - {rules.maxGroupSize} celdas</span></div>
              <div>Estrategia: <span className="text-slate-200">{rules.binning.strategy}</span></div>
            </div>
          ) : (
            <span className="text-slate-500">Cargando reglas...</span>
          )}
        </div>

        {/* Tile Selector */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-3">
          <span className="text-cyan-400 font-bold block mb-1">BLOQUE ACTUAL (TILE)</span>
          <div className="flex items-center space-x-2 mt-2">
            <label className="text-slate-400">Fila:</label>
            <select
              value={tileRow}
              onChange={(e) => setTileRow(Number(e.target.value))}
              className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-200"
            >
              {Array.from({ length: maxTileRows }, (_, i) => (
                <option key={i} value={i}>{i}</option>
              ))}
            </select>

            <label className="text-slate-400 ml-2">Col:</label>
            <select
              value={tileCol}
              onChange={(e) => setTileCol(Number(e.target.value))}
              className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-200"
            >
              {Array.from({ length: maxTileCols }, (_, i) => (
                <option key={i} value={i}>{i}</option>
              ))}
            </select>

            <button
              onClick={() => loadTileData(tileRow, tileCol)}
              className="ml-auto px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded text-cyan-300 text-[10px]"
            >
              Recargar
            </button>
          </div>
        </div>

        {/* Selected Group Action */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-3 flex flex-col justify-between">
          <div>
            <span className="text-cyan-400 font-bold block mb-1">GRUPO SELECCIONADO</span>
            {selectedGroup ? (
              <div className="text-[11px] text-slate-300">
                <span>{selectedGroup.size} celdas &middot; Caja: </span>
                <span className={`font-bold ${TEMPER_NAMES[selectedGroup.targetBin].color}`}>
                  {selectedGroup.targetBin} ({TEMPER_NAMES[selectedGroup.targetBin].name})
                </span>
              </div>
            ) : (
              <span className="text-slate-500 text-[11px]">Ningún grupo detectado en este tile</span>
            )}
          </div>

          {selectedGroup && (
            <button
              onClick={() => handleRefineSelected()}
              disabled={refining}
              className="mt-2 w-full py-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded text-xs uppercase tracking-wider transition-all disabled:opacity-50"
            >
              {refining ? 'Refinando...' : `Refinar en Caja ${selectedGroup.targetBin}`}
            </button>
          )}
        </div>
      </div>

      {/* Status Alert */}
      {statusMsg && (
        <div className="p-3 bg-cyan-950/70 border border-cyan-800 text-cyan-200 rounded text-xs">
          {statusMsg}
        </div>
      )}

      {/* CRT Main Terminal Grid */}
      <div className="relative bg-slate-950 border-2 border-cyan-900/80 rounded-xl p-4 shadow-[0_0_30px_rgba(6,182,212,0.15)] overflow-hidden">
        <div className="crt-grid absolute inset-0 pointer-events-none opacity-40" />

        {loading ? (
          <div className="text-center py-32 text-cyan-400 text-xs">
            <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            LEYENDO MATRIZ DE MACRODATOS...
          </div>
        ) : cellsGrid.length === 0 ? (
          <div className="text-center py-24 text-slate-500 text-xs">
            Sin datos para este bloque.
          </div>
        ) : (
          <div className="overflow-x-auto flex justify-center py-2">
            <div
              className="inline-grid gap-1 select-none"
              style={{
                gridTemplateColumns: `repeat(${tile?.cols || 1}, minmax(28px, 1fr))`,
              }}
            >
              {cellsGrid.flatMap((row, rIdx) =>
                row.map((cell, cIdx) => {
                  const isInSelectedGroup = selectedGroup?.cells.some(
                    (c) => c.r === cell.r && c.c === cell.c
                  );
                  const isScary = cell.isScary;
                  const isRefined = cell.refinedBin !== '.';

                  let cellStyle = 'bg-slate-900 text-slate-400 border-slate-800';

                  if (isRefined) {
                    const bin = cell.refinedBin as TemperBin;
                    cellStyle = TEMPER_NAMES[bin]
                      ? `${TEMPER_NAMES[bin].bg} ${TEMPER_NAMES[bin].color} font-bold opacity-60`
                      : 'bg-slate-800 text-slate-500';
                  } else if (isInSelectedGroup) {
                    cellStyle = 'bg-cyan-500 text-slate-950 font-bold border-cyan-300 ring-2 ring-cyan-400 scale-110 z-10';
                  } else if (isScary) {
                    cellStyle = 'bg-amber-950/80 text-amber-300 border-amber-600 font-bold animate-pulse';
                  }

                  return (
                    <button
                      key={`${rIdx}-${cIdx}`}
                      onClick={() => handleCellClick(cell)}
                      title={`(${cell.r}, ${cell.c}) - Dígito: ${cell.digit}, Temblor: ${cell.tremor}`}
                      className={`w-7 h-7 flex items-center justify-center text-xs rounded border transition-all ${cellStyle}`}
                    >
                      {cell.digit}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      {/* Lumon Tempers Refinement Baskets (Bottom Bar) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
        {(['WO', 'FC', 'DR', 'MA'] as const).map((bin) => {
          const info = TEMPER_NAMES[bin];
          const pct = file ? Math.round(file.progress[bin] * 100) : 0;
          return (
            <button
              key={bin}
              onClick={() => selectedGroup && handleRefineSelected(bin)}
              disabled={!selectedGroup || refining}
              className={`p-3 rounded-lg border text-left transition-all ${
                selectedGroup
                  ? `${info.bg} hover:brightness-125 cursor-pointer`
                  : 'bg-slate-900 border-slate-800 opacity-60 cursor-not-allowed'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={`font-bold text-sm ${info.color}`}>{bin} &middot; {info.name}</span>
                <span className="text-xs text-slate-300 font-bold">{pct}%</span>
              </div>
              <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden border border-slate-800">
                <div
                  className={`h-full ${info.bg.split(' ')[0]}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
