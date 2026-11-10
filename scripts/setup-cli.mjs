#!/usr/bin/env node
// CLI automation helper for Hackathon 3 setup tasks
// Usage: node scripts/setup-cli.mjs [register|roster|challenge|verify|storage|clearance|status]

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const API_BASE = (process.env.VITE_API_BASE_URL || 'https://lumon-api.vercel.app/api/v1').replace(/\/$/, '');
const TOKEN_CACHE_FILE = path.join(ROOT_DIR, '.session-token.json');
const VERIFICATION_TXT_PATH = path.join(ROOT_DIR, 'public', '.well-known', 'lumon-verification.txt');

function saveTokens(tokens) {
  fs.writeFileSync(TOKEN_CACHE_FILE, JSON.stringify(tokens, null, 2), 'utf-8');
}

function loadTokens() {
  if (fs.existsSync(TOKEN_CACHE_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(TOKEN_CACHE_FILE, 'utf-8'));
    } catch {
      return null;
    }
  }
  return null;
}

async function loginSupervisor() {
  const url = `${API_BASE}/auth/login`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Lumon-Build': 'dev',
    },
    body: JSON.stringify({
      email: 'jasyr.valdez@utec.edu.pe',
      password: 'Lumon2026!MDR',
    }),
  });
  if (!res.ok) {
    throw new Error(`Login failed with status ${res.status}`);
  }
  const data = await res.json();
  saveTokens(data);
  return data;
}

async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    'X-Lumon-Build': 'dev',
    ...(options.headers || {}),
  };

  let tokens = loadTokens();
  if (!tokens?.accessToken && !options.skipAuth) {
    tokens = await loginSupervisor();
  }

  if (tokens?.accessToken && !options.skipAuth) {
    headers['Authorization'] = `Bearer ${tokens.accessToken}`;
  }

  let res = await fetch(url, { ...options, headers });
  let text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }

  if (res.status === 401 && json?.error === 'TOKEN_EXPIRED' && !options.skipAuth) {
    console.log('Token vencido. Re-autenticando supervisor...');
    tokens = await loginSupervisor();
    headers['Authorization'] = `Bearer ${tokens.accessToken}`;
    res = await fetch(url, { ...options, headers });
    text = await res.text();
    try {
      json = JSON.parse(text);
    } catch {
      json = { raw: text };
    }
  }

  if (!res.ok) {
    console.error(`\x1b[31m[ERROR ${res.status}]\x1b[0m`, json);
    process.exit(1);
  }
  return json;
}

const command = process.argv[2] || 'help';

async function main() {
  switch (command) {
    case 'register': {
      const teamName = process.argv[3] || 'Cuadrilla-MDR-01';
      const email = process.argv[4] || 'jasyr.valdez@utec.edu.pe';
      const password = process.argv[5] || 'Password123!';
      console.log(`\x1b[36mRegistrando cuadrilla...\x1b[0m [${teamName}] (${email})`);
      const res = await request('/auth/register', {
        method: 'POST',
        skipAuth: true,
        body: JSON.stringify({ teamName, email, password }),
      });
      saveTokens(res);
      console.log(`\x1b[32m✔ Cuadrilla registrada exitosamente!\x1b[0m`);
      console.log(`  Team Code: \x1b[33m${res.team?.code}\x1b[0m`);
      console.log(`  Token guardado localmente en .session-token.json`);
      break;
    }

    case 'roster': {
      console.log(`\x1b[36mInscribiendo 3 integrantes...\x1b[0m`);
      const members = [
        { name: 'Elías Paz', code: '202510360' },
        { name: 'Jasyr Valdez', code: '202510474' },
        { name: 'Jasyr Valdez', code: '202510474-2' },
      ];
      const res = await request('/team/roster', {
        method: 'PUT',
        body: JSON.stringify({ members }),
      });
      console.log(`\x1b[32m✔ Roster inscrito!\x1b[0m`, res);
      break;
    }

    case 'challenge': {
      const origin = (process.argv[3] || 'https://su-proyecto.vercel.app').replace(/\/$/, '');
      console.log(`\x1b[36mSolicitando challenge para:\x1b[0m ${origin}`);
      const res = await request('/integrations/deploy/challenge', {
        method: 'POST',
        body: JSON.stringify({ origin }),
      });
      console.log(`\x1b[32m✔ Challenge recibido!\x1b[0m Token: \x1b[33m${res.token}\x1b[0m`);
      
      // Auto-write to public/.well-known/lumon-verification.txt
      fs.mkdirSync(path.dirname(VERIFICATION_TXT_PATH), { recursive: true });
      fs.writeFileSync(VERIFICATION_TXT_PATH, res.token.trim(), 'utf-8');
      console.log(`\x1b[32m✔ Token escrito automáticamente en:\x1b[0m ${VERIFICATION_TXT_PATH}`);
      console.log(`👉 Ahora haz git add, commit y push a Vercel/Netlify. Una vez desplegado, corre: npm run setup:verify`);
      break;
    }

    case 'verify': {
      console.log(`\x1b[36mVerificando despliegue de dominio...\x1b[0m`);
      const res = await request('/integrations/deploy/verify', {
        method: 'POST',
      });
      console.log(`\x1b[32m✔ Dominio verificado con éxito!\x1b[0m`, res);
      break;
    }

    case 'storage': {
      const provider = (process.argv[3] || 'CLOUDINARY').toUpperCase();
      let body;
      if (provider === 'CLOUDINARY') {
        const cloudName = process.argv[4] || 'cuadrilla007';
        const uploadPreset = process.argv[5] || 'lumon_unsigned';
        body = { provider: 'CLOUDINARY', cloudName, uploadPreset };
      } else {
        const projectUrl = process.argv[4] || 'https://abcd1234.supabase.co';
        const publicKey = process.argv[5] || 'sb_publishable_test';
        body = { provider: 'SUPABASE', projectUrl, bucket: 'lumon-media', publicKey };
      }
      console.log(`\x1b[36mConfigurando y poniendo a prueba storage...\x1b[0m`, body);
      const res = await request('/integrations/storage', {
        method: 'PUT',
        body: JSON.stringify(body),
      });
      console.log(`\x1b[32m✔ Storage verificado!\x1b[0m`, res);
      break;
    }

    case 'clearance': {
      console.log(`\x1b[36mEjecutando revisión de clearance...\x1b[0m`);
      const res = await request('/clearance/check', {
        method: 'POST',
      });
      console.log(`\x1b[32m✔ Resultado clearance check:\x1b[0m`, res);
      break;
    }

    case 'status': {
      console.log(`\x1b[36mConsultando estado de integraciones...\x1b[0m`);
      const res = await request('/integrations/status');
      console.log(`\x1b[32m✔ Estado:\x1b[0m`, JSON.stringify(res, null, 2));
      break;
    }

    default:
      console.log(`
Uso: node scripts/setup-cli.mjs <comando> [argumentos]

Comandos disponibles:
  register  [teamName] [email] [password]  -> POST /auth/register
  roster                                   -> PUT /team/roster (inscribe a los 3 integrantes)
  challenge <origin>                       -> POST /integrations/deploy/challenge (y auto-escribe en lumon-verification.txt)
  verify                                   -> POST /integrations/deploy/verify
  storage   CLOUDINARY <cloudName> <preset>
  storage   SUPABASE   <projectUrl> <key>  -> PUT /integrations/storage
  clearance                                -> POST /clearance/check
  status                                   -> GET /integrations/status
      `);
      break;
  }
}

main().catch(console.error);
