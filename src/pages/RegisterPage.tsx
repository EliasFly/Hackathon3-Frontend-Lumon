import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import type { LumonApiError } from '../types/lumon';

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [teamName, setTeamName] = useState('Cuadrilla MDR');
  const [email, setEmail] = useState('jasyr.valdez@utec.edu.pe');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres');
      return;
    }

    setLoading(true);
    try {
      await register(teamName, email, password);
      navigate('/integrations');
    } catch (err) {
      const apiErr = err as LumonApiError;
      setError(apiErr.message || apiErr.error || 'Error al registrar la cuadrilla');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto my-12 p-8 bg-slate-900/90 border border-cyan-900/40 rounded-xl shadow-2xl backdrop-blur-sm">
      <div className="text-center mb-8">
        <div className="inline-flex w-14 h-14 rounded-lg bg-cyan-950/80 border border-cyan-500/40 items-center justify-center text-cyan-400 font-bold text-2xl mb-3 shadow-[0_0_15px_rgba(6,182,212,0.3)]">
          L
        </div>
        <h1 className="text-xl font-bold tracking-widest text-slate-100 uppercase">Registrar Cuadrilla</h1>
        <p className="text-xs text-slate-400 mt-1">POST /auth/register &middot; Primeros 20 minutos</p>
      </div>

      {error && (
        <div className="mb-6 p-3 rounded-md bg-rose-950/60 border border-rose-800 text-rose-300 text-xs">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
            Nombre de la Cuadrilla (Team Name)
          </label>
          <input
            type="text"
            required
            minLength={3}
            maxLength={40}
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            placeholder="Cuadrilla MDR"
            className="w-full px-3.5 py-2 rounded-md bg-slate-950 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:border-cyan-500 transition-colors"
          />
          <span className="text-[10px] text-slate-500 mt-0.5 block">Único, entre 3 y 40 caracteres</span>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
            Correo Electrónico Supervisor
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="jasyr.valdez@utec.edu.pe"
            className="w-full px-3.5 py-2 rounded-md bg-slate-950 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:border-cyan-500 transition-colors font-mono"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
            Contraseña (Mínimo 8 caracteres)
          </label>
          <input
            type="password"
            required
            minLength={8}
            maxLength={72}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full px-3.5 py-2 rounded-md bg-slate-950 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:border-cyan-500 transition-colors font-mono"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 px-4 rounded-md font-semibold text-slate-950 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 transition-colors text-sm uppercase tracking-wider mt-2 shadow-[0_0_15px_rgba(6,182,212,0.4)]"
        >
          {loading ? 'Registrando...' : 'Registrar Cuadrilla'}
        </button>
      </form>

      <div className="mt-6 text-center text-xs text-slate-400">
        ¿Ya tienes tu cuenta?{' '}
        <Link to="/login" className="text-cyan-400 hover:underline font-semibold">
          Iniciar sesión
        </Link>
      </div>
    </div>
  );
};
