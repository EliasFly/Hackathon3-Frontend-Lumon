# Lumon Industries · Macrodata Refinement (Hackathon 3)

Frontend oficial para la Hackathon 3 de Desarrollo Basado en Plataformas (UTEC).
Inspirado en **Severance (Lumon Industries)**.

---

## ⚡ Stack Tecnológico (Estricto según bases)

- **Framework:** React 19 + TypeScript (Modo Estricto).
- **Bundler:** Vite 6.
- **Estilos:** Tailwind CSS v4 (`@tailwindcss/vite`).
- **Enrutamiento:** React Router DOM v7.
- **Cliente HTTP:** `fetch` nativo (sin axios ni librerías externas de HTTP).
- **Tiempo Real:**
  - `EventSource` (SSE) nativo con manejo de tickets efímeros y reconexión con `lastEventId`.
  - `WebSocket` nativo para piso compartido colaborativo (`/floor/ws`).
- **Contrato:** OpenAPI / Swagger: [https://lumon-api.vercel.app/docs](https://lumon-api.vercel.app/docs).

---

## 🚀 Guía de los Primeros 20 Minutos

Puedes realizar todo el flujo inicial cómodamente desde la **interfaz web** (`/integrations`) o por **línea de comandos**:

### 1. Iniciar el Servidor de Desarrollo
```bash
npm install
npm run dev
```
Abre en tu navegador `http://localhost:5173`.

---

### 2. Registrar la Cuadrilla (`POST /auth/register`)
- **Vía Web:** Dirígete a `/register`. Ingresa el nombre de la cuadrilla, tu correo (`jasyr.valdez@utec.edu.pe`) y contraseña (&ge; 8 caracteres).
- **Vía CLI:**
  ```bash
  npm run setup:register "NombreDeTuCuadrilla" "jasyr.valdez@utec.edu.pe" "TuPassword123"
  ```
  El backend devolverá tu `TEAM_CODE` (ej: `TEAM-007`).

---

### 3. Inscribir los 3 Integrantes (`PUT /team/roster`)
*Sin esto el equipo no entra al sorteo de rondas.*
- **Vía Web:** Pestaña **Integraciones** &rarr; Sección *Paso 1: Inscribir Roster*.
- **Vía CLI:**
  ```bash
  npm run setup:roster
  ```
  *(Por defecto preconfigurado con Jasyr Valdez, Kamilo Neyra y Elías Paz).*

---

### 4. Desplegar y Verificar Dominio (`POST /integrations/deploy/*`)
1. Sube este repositorio a GitHub como repositorio público.
2. Despliega en **Vercel** o **Netlify**:
   - Variables de entorno en producción:
     - `VITE_API_BASE_URL=https://lumon-api.vercel.app/api/v1`
     - `VITE_WS_BASE_URL=wss://lumon-api.vercel.app/api/v1`
3. En la interfaz web (`/integrations`) o vía CLI, pide el challenge:
   ```bash
   npm run setup:challenge https://tu-dominio.vercel.app
   ```
   Esto escribirá automáticamente el token en `public/.well-known/lumon-verification.txt`.
4. Haz `git add`, `git commit` y `git push` a `main` para que se despliegue el archivo.
5. Verifica el dominio en la UI o vía CLI:
   ```bash
   npm run setup:verify
   ```

---

### 5. Registrar Storage de Imágenes (`PUT /integrations/storage`)
Soporta **Cloudinary** (recomendado, unsigned preset) o **Supabase**:
- **Vía Web:** Pestaña **Integraciones** &rarr; *Paso 3: Storage*.
- **Vía CLI:**
  ```bash
  npm run setup:storage CLOUDINARY <cloudName> <uploadPreset>
  # o
  npm run setup:storage SUPABASE <projectUrl> <publicKey>
  ```
  El backend validará la subida de prueba.

---

### 6. Revisión Automática de Clearance (`POST /clearance/check`)
Una vez desplegado y verificadas las acciones en la app de producción:
```bash
npm run setup:clearance
```
Cuando pasen los 4 checks (`DEPLOY`, `SESSION`, `GRID`, `REFINE`), el **Piso de Pruebas** se abrirá para todo el equipo.

---

## 🧠 Algoritmo de Detección Macrodata Refinement (MDR)
El motor de refinamiento en `src/utils/mdr.ts`:
1. **Decodificación de temblor:** Lee bytes base64 de cada celda (0 a 100).
2. **Celdas con temblor:** Si `tremor >= tremorThreshold`, la celda da miedo.
3. **Agrupamiento conectado:** BFS con conectividad de 4 u 8 vías respetando `minGroupSize` y `maxGroupSize`.
4. **Clasificación automática de caja:**
   - `DIGIT_SUM_MOD`: suma de dígitos % 4.
   - `MAX_DIGIT_MOD`: dígito máximo % 4.
   - Determina automáticamente la caja correcta entre **WO (Woe)**, **FC (Frolic)**, **DR (Dread)** o **MA (Malice)**.
5. **Idempotencia:** Envía `Idempotency-Key` (UUID) en `POST /files/{id}/refinements` para evitar penalizaciones por reintento.

---

## 📁 Estructura del Proyecto

```
hackaton 3/
├── public/
│   └── .well-known/
│       └── lumon-verification.txt  <-- Token de verificación
├── scripts/
│   └── setup-cli.mjs               <-- CLI auxiliar de configuración
├── src/
│   ├── api/
│   │   ├── client.ts               <-- Cliente fetch estricto, manejo 401/429/503 y X-Lumon-Build
│   │   └── services.ts             <-- Servicios tipados del Swagger de Lumon
│   ├── context/
│   │   └── AuthContext.tsx         <-- Estado global de sesión y usuario
│   ├── hooks/
│   │   └── useLumonEvents.ts       <-- SSE EventSource con tickets efímeros y contingencias
│   ├── pages/
│   │   ├── LoginPage.tsx           <-- Login
│   │   ├── RegisterPage.tsx        <-- Registro de cuadrilla
│   │   ├── IntegrationsPage.tsx    <-- Panel central de configuración
│   │   ├── FilesPage.tsx           <-- Listado de archivos MDR
│   │   ├── MdrConsolePage.tsx      <-- Terminal interactiva CRT con WebSocket y temblores
│   │   ├── RefinersPage.tsx        <-- Expedientes con ETag If-Match
│   │   ├── IncidentsPage.tsx       <-- Reportes de incidencias
│   │   └── WellnessPage.tsx        <-- Sala de Bienestar y sorteo de rondas
│   ├── types/
│   │   └── lumon.ts                <-- Contrato TypeScript estricto de la API Lumon
│   ├── utils/
│   │   └── mdr.ts                  <-- Algoritmos de clustering, temblor y cálculo de cajas
│   ├── App.tsx
│   ├── index.css                   <-- Tailwind CSS v4 + estilos retro CRT
│   └── main.tsx
├── .env
├── .env.example
├── .gitignore
├── hackathon.json                  <-- Metadatos del equipo
├── netlify.toml                    <-- Configuración de despliegue Netlify SPA
├── package.json
├── tsconfig.json
├── vercel.json                     <-- Configuración de despliegue Vercel SPA
└── vite.config.ts
```
