import React, { useState, useEffect } from 'react';
import { teamService, integrationsService, clearanceService } from '../api/services';
import type {
  RosterMember,
  IntegrationStatus,
  DeployChallenge,
  ClearanceCheckResult,
  LumonApiError,
} from '../types/lumon';

export const IntegrationsPage: React.FC = () => {
  // Roster state
  const [members, setMembers] = useState<RosterMember[]>([
    { name: 'Jasyr Valdez', code: '202510474' },
    { name: 'Kamilo Neyra', code: '202310250' },
    { name: 'Elías Paz', code: '202510360' },
  ]);
  const [rosterStatus, setRosterStatus] = useState<string | null>(null);
  const [rosterLoading, setRosterLoading] = useState(false);

  // Deploy state
  const [origin, setOrigin] = useState('https://hackaton-3-mdr.vercel.app');
  const [challenge, setChallenge] = useState<DeployChallenge | null>(null);
  const [deployLoading, setDeployLoading] = useState(false);
  const [deployMsg, setDeployMsg] = useState<{ text: string; isError?: boolean } | null>(null);

  // Storage state
  const [storageProvider, setStorageProvider] = useState<'SUPABASE' | 'CLOUDINARY'>('CLOUDINARY');
  const [supabaseUrl, setSupabaseUrl] = useState('https://xyzcompany.supabase.co');
  const [supabaseKey, setSupabaseKey] = useState('');
  const [cloudName, setCloudName] = useState('');
  const [uploadPreset, setUploadPreset] = useState('lumon_unsigned');
  const [storageLoading, setStorageLoading] = useState(false);
  const [storageMsg, setStorageMsg] = useState<{ text: string; isError?: boolean } | null>(null);

  // Overall Integration & Chaos state
  const [status, setStatus] = useState<IntegrationStatus | null>(null);
  const [chaosLevel, setChaosLevel] = useState<0 | 1 | 2>(0);
  const [clearanceResult, setClearanceResult] = useState<ClearanceCheckResult | null>(null);
  const [clearanceLoading, setClearanceLoading] = useState(false);
  const [generalLoading, setGeneralLoading] = useState(true);

  const fetchIntegrationStatus = async () => {
    try {
      const s = await integrationsService.getStatus();
      setStatus(s);
      if (s.deploy.pendingChallenge) {
        setChallenge(s.deploy.pendingChallenge);
      }
    } catch {
      // ignore
    }

    try {
      const r = await teamService.getRoster();
      if (r && r.members && r.members.length === 3) {
        setMembers(r.members);
        setRosterStatus(`Inscrito para: ${r.teamName} (${r.teamCode})`);
      }
    } catch {
      // ignore
    } finally {
      setGeneralLoading(false);
    }
  };

  useEffect(() => {
    fetchIntegrationStatus();
  }, []);

  // 1. Submit Roster
  const handleSaveRoster = async () => {
    setRosterLoading(true);
    setRosterStatus(null);
    try {
      const res = await teamService.updateRoster(members);
      setRosterStatus(`¡Roster guardado con éxito! Equipo: ${res.teamCode}`);
    } catch (err) {
      const apiErr = err as LumonApiError;
      setRosterStatus(`Error: ${apiErr.message || apiErr.error}`);
    } finally {
      setRosterLoading(false);
    }
  };

  // 2. Request Challenge
  const handleRequestChallenge = async () => {
    setDeployLoading(true);
    setDeployMsg(null);
    try {
      const ch = await integrationsService.requestDeployChallenge(origin.trim().replace(/\/$/, ''));
      setChallenge(ch);
      setDeployMsg({ text: 'Challenge generado. Copia el token en public/.well-known/lumon-verification.txt, haz deploy y luego verifica.' });
    } catch (err) {
      const apiErr = err as LumonApiError;
      setDeployMsg({ text: `Error: ${apiErr.message || apiErr.error}`, isError: true });
    } finally {
      setDeployLoading(false);
    }
  };

  // 2b. Verify Deploy
  const handleVerifyDeploy = async () => {
    setDeployLoading(true);
    setDeployMsg(null);
    try {
      const verified = await integrationsService.verifyDeploy();
      setDeployMsg({ text: `¡Dominio verificado exitosamente! Origen: ${verified.origin}` });
      await fetchIntegrationStatus();
    } catch (err) {
      const apiErr = err as LumonApiError;
      setDeployMsg({ text: `Error de verificación: ${apiErr.message || apiErr.error}`, isError: true });
    } finally {
      setDeployLoading(false);
    }
  };

  // 3. Save Storage
  const handleSaveStorage = async () => {
    setStorageLoading(true);
    setStorageMsg(null);
    try {
      if (storageProvider === 'SUPABASE') {
        await integrationsService.updateStorage({
          provider: 'SUPABASE',
          projectUrl: supabaseUrl.trim().replace(/\/$/, ''),
          bucket: 'lumon-media',
          publicKey: supabaseKey.trim(),
        });
      } else {
        await integrationsService.updateStorage({
          provider: 'CLOUDINARY',
          cloudName: cloudName.trim(),
          uploadPreset: uploadPreset.trim(),
        });
      }
      setStorageMsg({ text: '¡Storage configurado y verificado con éxito por el backend!' });
      await fetchIntegrationStatus();
    } catch (err) {
      const apiErr = err as LumonApiError;
      setStorageMsg({ text: `Error: ${apiErr.message || apiErr.error}`, isError: true });
    } finally {
      setStorageLoading(false);
    }
  };

  // 4. Set Chaos
  const handleChaosChange = async (level: 0 | 1 | 2) => {
    try {
      await teamService.setChaosLevel(level);
      setChaosLevel(level);
    } catch (err) {
      const apiErr = err as LumonApiError;
      alert(`Error al cambiar nivel de caos: ${apiErr.message || apiErr.error}`);
    }
  };

  // 5. Run Clearance Check
  const handleRunClearanceCheck = async () => {
    setClearanceLoading(true);
    try {
      const res = await clearanceService.runClearanceCheck();
      setClearanceResult(res);
      await fetchIntegrationStatus();
    } catch (err) {
      const apiErr = err as LumonApiError;
      alert(`Error en revisión: ${apiErr.message || apiErr.error}`);
    } finally {
      setClearanceLoading(false);
    }
  };

  if (generalLoading) {
    return (
      <div className="text-center py-24 text-slate-400 font-mono text-sm">
        <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        Cargando estado de integraciones...
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
      {/* Page Title */}
      <div>
        <h1 className="text-2xl font-bold tracking-wider text-cyan-400 uppercase font-mono">
          Panel de Configuración & Integraciones
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Guía y ejecución de los <strong>Primeros 20 minutos</strong> (Roster, Despliegue, Storage y Clearance)
        </p>
      </div>

      {/* Grid of Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Section 1: Roster */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-lg">
          <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
            <div>
              <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest block">Paso 1</span>
              <h2 className="text-sm font-bold uppercase text-slate-200">Inscribir Roster de 3 Integrantes</h2>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-950 text-cyan-300 border border-cyan-800">
              PUT /team/roster
            </span>
          </div>

          <div className="space-y-3">
            {members.map((m, idx) => (
              <div key={idx} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Nombre completo"
                  value={m.name}
                  onChange={(e) => {
                    const copy = [...members];
                    copy[idx].name = e.target.value;
                    setMembers(copy);
                  }}
                  className="flex-1 px-3 py-1.5 rounded bg-slate-950 border border-slate-700 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
                />
                <input
                  type="text"
                  placeholder="Código UTEC"
                  value={m.code}
                  onChange={(e) => {
                    const copy = [...members];
                    copy[idx].code = e.target.value;
                    setMembers(copy);
                  }}
                  className="w-28 px-3 py-1.5 rounded bg-slate-950 border border-slate-700 text-xs font-mono text-slate-100 focus:outline-none focus:border-cyan-500"
                />
              </div>
            ))}
          </div>

          {rosterStatus && (
            <p className="mt-3 text-xs text-cyan-300 bg-cyan-950/40 border border-cyan-800/60 p-2 rounded">
              {rosterStatus}
            </p>
          )}

          <button
            onClick={handleSaveRoster}
            disabled={rosterLoading}
            className="mt-4 w-full py-2 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-xs uppercase tracking-wider rounded transition-colors disabled:opacity-50"
          >
            {rosterLoading ? 'Guardando...' : 'Inscribir 3 Integrantes'}
          </button>
        </div>

        {/* Section 2: Deploy Verification */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-lg">
          <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
            <div>
              <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest block">Paso 2</span>
              <h2 className="text-sm font-bold uppercase text-slate-200">Verificación de Despliegue</h2>
            </div>
            <span className={`px-2 py-0.5 rounded text-[10px] font-mono border ${
              status?.deploy.verifiedAt ? 'bg-emerald-950 text-emerald-300 border-emerald-800' : 'bg-amber-950 text-amber-300 border-amber-800'
            }`}>
              {status?.deploy.verifiedAt ? 'VERIFICADO' : 'PENDIENTE'}
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block text-slate-400 mb-1">Origen de Producción (HTTPS):</label>
              <input
                type="url"
                value={origin}
                onChange={(e) => setOrigin(e.target.value)}
                placeholder="https://su-proyecto.vercel.app"
                className="w-full px-3 py-1.5 rounded bg-slate-950 border border-slate-700 text-slate-100 font-mono text-xs focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={handleRequestChallenge}
                disabled={deployLoading}
                className="flex-1 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 font-medium rounded text-xs transition-colors"
              >
                1. Pedir Challenge
              </button>
              <button
                onClick={handleVerifyDeploy}
                disabled={deployLoading}
                className="flex-1 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold rounded text-xs transition-colors"
              >
                2. Verificar Dominio
              </button>
            </div>

            {challenge && (
              <div className="p-3 bg-slate-950 border border-cyan-900/50 rounded space-y-1">
                <span className="text-[10px] uppercase text-cyan-400 font-mono block">Token a publicar en: {challenge.wellKnownPath}</span>
                <div className="flex items-center justify-between bg-slate-900 p-1.5 rounded font-mono text-[11px] text-amber-300 select-all overflow-x-auto">
                  <code>{challenge.token}</code>
                </div>
              </div>
            )}

            {deployMsg && (
              <p className={`p-2 rounded text-[11px] border ${deployMsg.isError ? 'bg-rose-950/50 text-rose-300 border-rose-800' : 'bg-emerald-950/50 text-emerald-300 border-emerald-800'}`}>
                {deployMsg.text}
              </p>
            )}
          </div>
        </div>

        {/* Section 3: Storage */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-lg">
          <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
            <div>
              <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest block">Paso 3</span>
              <h2 className="text-sm font-bold uppercase text-slate-200">Storage de Imágenes (Supabase / Cloudinary)</h2>
            </div>
            <span className={`px-2 py-0.5 rounded text-[10px] font-mono border ${
              status?.storage?.verifiedAt ? 'bg-emerald-950 text-emerald-300 border-emerald-800' : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}>
              {status?.storage?.verifiedAt ? 'PROBADO OK' : 'SIN CONFIGURAR'}
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex gap-2 mb-2">
              <button
                type="button"
                onClick={() => setStorageProvider('CLOUDINARY')}
                className={`flex-1 py-1 rounded text-xs font-semibold border ${
                  storageProvider === 'CLOUDINARY'
                    ? 'bg-cyan-950 text-cyan-300 border-cyan-500'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                }`}
              >
                Cloudinary (Recomendado)
              </button>
              <button
                type="button"
                onClick={() => setStorageProvider('SUPABASE')}
                className={`flex-1 py-1 rounded text-xs font-semibold border ${
                  storageProvider === 'SUPABASE'
                    ? 'bg-cyan-950 text-cyan-300 border-cyan-500'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                }`}
              >
                Supabase
              </button>
            </div>

            {storageProvider === 'CLOUDINARY' ? (
              <>
                <div>
                  <label className="block text-slate-400 mb-1">Cloud Name:</label>
                  <input
                    type="text"
                    value={cloudName}
                    onChange={(e) => setCloudName(e.target.value)}
                    placeholder="ej: mycloud"
                    className="w-full px-3 py-1.5 rounded bg-slate-950 border border-slate-700 text-slate-100 font-mono text-xs focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Upload Preset (unsigned):</label>
                  <input
                    type="text"
                    value={uploadPreset}
                    onChange={(e) => setUploadPreset(e.target.value)}
                    placeholder="lumon_unsigned"
                    className="w-full px-3 py-1.5 rounded bg-slate-950 border border-slate-700 text-slate-100 font-mono text-xs focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="block text-slate-400 mb-1">Project URL:</label>
                  <input
                    type="text"
                    value={supabaseUrl}
                    onChange={(e) => setSupabaseUrl(e.target.value)}
                    placeholder="https://xyz.supabase.co"
                    className="w-full px-3 py-1.5 rounded bg-slate-950 border border-slate-700 text-slate-100 font-mono text-xs focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Public Key (sb_publishable o anon):</label>
                  <input
                    type="text"
                    value={supabaseKey}
                    onChange={(e) => setSupabaseKey(e.target.value)}
                    placeholder="sb_publishable_..."
                    className="w-full px-3 py-1.5 rounded bg-slate-950 border border-slate-700 text-slate-100 font-mono text-xs focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </>
            )}

            {storageMsg && (
              <p className={`p-2 rounded text-[11px] border ${storageMsg.isError ? 'bg-rose-950/50 text-rose-300 border-rose-800' : 'bg-emerald-950/50 text-emerald-300 border-emerald-800'}`}>
                {storageMsg.text}
              </p>
            )}

            <button
              onClick={handleSaveStorage}
              disabled={storageLoading}
              className="mt-2 w-full py-2 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-xs uppercase tracking-wider rounded transition-colors disabled:opacity-50"
            >
              {storageLoading ? 'Probando Storage con Backend...' : 'Registrar y Poner a Prueba Storage'}
            </button>
          </div>
        </div>

        {/* Section 4: Chaos & Clearance */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-lg">
          <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
            <div>
              <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest block">Paso 4</span>
              <h2 className="text-sm font-bold uppercase text-slate-200">Revisión Automática & Modo Caos</h2>
            </div>
            <span className={`px-2 py-0.5 rounded text-[10px] font-mono border ${
              status?.clearance.granted ? 'bg-emerald-950 text-emerald-300 border-emerald-800' : 'bg-amber-950 text-amber-300 border-amber-800'
            }`}>
              {status?.clearance.granted ? 'PISO ABIERTO' : 'CERRADO'}
            </span>
          </div>

          <div className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-400 mb-1.5 font-semibold">Nivel de Caos del Workspace:</label>
              <div className="grid grid-cols-3 gap-2">
                {[0, 1, 2].map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => handleChaosChange(lvl as 0 | 1 | 2)}
                    className={`py-1.5 rounded font-mono text-xs font-bold border transition-colors ${
                      chaosLevel === lvl
                        ? 'bg-cyan-500 text-slate-950 border-cyan-400'
                        : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    Caos {lvl} {lvl === 1 ? '(Eval)' : lvl === 2 ? '(Max)' : '(Off)'}
                  </button>
                ))}
              </div>
            </div>

            <div className="border-t border-slate-800 pt-3">
              <button
                onClick={handleRunClearanceCheck}
                disabled={clearanceLoading}
                className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs uppercase tracking-wider rounded transition-colors disabled:opacity-50"
              >
                {clearanceLoading ? 'Ejecutando revisión...' : 'Correr POST /clearance/check'}
              </button>
            </div>

            {clearanceResult && (
              <div className="p-3 bg-slate-950 border border-slate-800 rounded space-y-2 mt-2">
                <div className="font-bold text-slate-200">Resultado de las comprobaciones:</div>
                <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                  {clearanceResult.checks.map((c, i) => (
                    <div
                      key={i}
                      className={`p-1.5 rounded border flex items-center justify-between ${
                        c.status === 'PASS'
                          ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800'
                          : 'bg-rose-950/40 text-rose-300 border-rose-800'
                      }`}
                    >
                      <span>{c.name}</span>
                      <span className="font-bold">{c.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
