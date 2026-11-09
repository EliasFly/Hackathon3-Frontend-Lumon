import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLumonEvents } from '../hooks/useLumonEvents';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, team, logout, isAuthenticated } = useAuth();
  const location = useLocation();
  const { isConnected, activeContingency, ackContingency } = useLumonEvents(isAuthenticated);

  const navLinks = [
    { to: '/files', label: 'Archivos MDR' },
    { to: '/integrations', label: 'Integraciones' },
    { to: '/refiners', label: 'Expedientes' },
    { to: '/incidents', label: 'Incidencias' },
    { to: '/wellness', label: 'Sala de Bienestar' },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-cyan-500 selection:text-slate-950">
      {/* Top Bar / Lumon Header */}
      <header className="border-b border-cyan-950 bg-slate-900/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <Link to="/files" className="flex items-center space-x-3 group">
              <div className="w-9 h-9 rounded bg-cyan-900/60 border border-cyan-500/50 flex items-center justify-center text-cyan-400 font-bold text-lg tracking-wider group-hover:border-cyan-400 group-hover:shadow-[0_0_12px_rgba(6,182,212,0.5)] transition-all">
                L
              </div>
              <div>
                <span className="font-bold tracking-widest text-cyan-400 text-sm block">LUMON INDUSTRIES</span>
                <span className="text-[10px] text-slate-400 tracking-wider uppercase block">Macrodata Refinement</span>
              </div>
            </Link>

            {isAuthenticated && (
              <nav className="hidden md:flex items-center space-x-1">
                {navLinks.map((link) => {
                  const isActive = location.pathname.startsWith(link.to);
                  return (
                    <Link
                      key={link.to}
                      to={link.to}
                      className={`px-3 py-1.5 rounded-md text-xs font-medium tracking-wide transition-colors ${
                        isActive
                          ? 'bg-cyan-950/80 text-cyan-300 border border-cyan-800'
                          : 'text-slate-300 hover:text-cyan-200 hover:bg-slate-800/50'
                      }`}
                    >
                      {link.label}
                    </Link>
                  );
                })}
              </nav>
            )}
          </div>

          <div className="flex items-center space-x-4">
            {isAuthenticated ? (
              <>
                {/* Team & SSE Status */}
                <div className="hidden sm:flex items-center space-x-2 text-xs">
                  <span className="px-2.5 py-1 rounded bg-slate-800 border border-slate-700 text-cyan-300 font-mono">
                    {team?.code || 'NO-TEAM'}
                  </span>
                  <div
                    title={isConnected ? 'SSE Conectado' : 'SSE Desconectado'}
                    className={`flex items-center space-x-1.5 px-2 py-1 rounded text-[11px] font-mono border ${
                      isConnected
                        ? 'bg-emerald-950/40 text-emerald-400 border-emerald-800'
                        : 'bg-amber-950/40 text-amber-400 border-amber-800'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                    <span>{isConnected ? 'LIVE' : 'OFFLINE'}</span>
                  </div>
                </div>

                {/* User & Logout */}
                <div className="flex items-center space-x-3">
                  <span className="text-xs text-slate-300 hidden lg:inline-block">
                    {user?.displayName || user?.email}
                  </span>
                  <button
                    onClick={() => logout()}
                    className="px-3 py-1 rounded text-xs font-medium text-rose-300 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800 transition-colors"
                  >
                    Salir
                  </button>
                </div>
              </>
            ) : (
              <div className="flex items-center space-x-3">
                <Link
                  to="/login"
                  className="px-3 py-1.5 rounded text-xs font-medium text-slate-200 hover:text-white"
                >
                  Ingresar
                </Link>
                <Link
                  to="/register"
                  className="px-3 py-1.5 rounded text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-slate-950 transition-colors"
                >
                  Registrar Cuadrilla
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Contingency Modal / Alert */}
      {activeContingency && (
        <div className="bg-rose-950/90 border-b border-rose-600 px-4 py-3 text-rose-100 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg animate-bounce">
          <div className="flex items-center space-x-3">
            <span className="text-xl">⚠️</span>
            <div>
              <span className="font-bold tracking-wide uppercase text-rose-300 mr-2">Contingencia Activada:</span>
              <span>{activeContingency.message}</span>
            </div>
          </div>
          <button
            onClick={ackContingency}
            className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs uppercase tracking-wider rounded transition-colors"
          >
            Confirmar Contingencia (ACK)
          </button>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/90 py-4 text-center text-xs text-slate-500">
        <p>Lumon Industries &copy; {new Date().getFullYear()} &middot; Macrodata Refinement Division &middot; Severed Access Only</p>
      </footer>
    </div>
  );
};
