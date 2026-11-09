import { apiFetch, setSessionTokens } from './client';
import type {
  RegisterResponse,
  LoginResponse,
  Me,
  Role,
  Member,
  MemberCreate,
  Roster,
  RosterMember,
  DeployChallenge,
  DeployVerified,
  StorageRequest,
  StorageResult,
  IntegrationStatus,
  FilePage,
  LumonFile,
  Rules,
  Tile,
  RefineResult,
  CellCoord,
  TemperBin,
  FloorTicket,
  Clearance,
  ClearanceCheckResult,
  WellnessDraw,
  Department,
  RefinerPage,
  Refiner,
  RefinerPatch,
  MediaTicketRequest,
  MediaTicket,
  Media,
  IncidentPage,
  IncidentCreate,
  Incident,
  StreamTicket,
} from '../types/lumon';

// --- AUTH SERVICE ---
export const authService = {
  async register(teamName: string, email: string, password: string): Promise<RegisterResponse> {
    const res = await apiFetch<RegisterResponse>('/auth/register', {
      method: 'POST',
      skipAuth: true,
      body: JSON.stringify({ teamName, email, password }),
    });
    setSessionTokens(res.data);
    return res.data;
  },

  async login(email: string, password: string): Promise<LoginResponse> {
    const res = await apiFetch<LoginResponse>('/auth/login', {
      method: 'POST',
      skipAuth: true,
      body: JSON.stringify({ email, password }),
    });
    setSessionTokens(res.data);
    return res.data;
  },

  async logout(): Promise<void> {
    const refreshToken = localStorage.getItem('lumon_refresh_token');
    if (refreshToken) {
      try {
        await apiFetch<void>('/auth/logout', {
          method: 'POST',
          skipAuth: true,
          body: JSON.stringify({ refreshToken }),
        });
      } catch {
        // ignore
      }
    }
    setSessionTokens(null);
  },

  async getMe(): Promise<Me> {
    const res = await apiFetch<Me>('/auth/me');
    return res.data;
  },
};

// --- TEAM & WORKSPACE SERVICE ---
export const teamService = {
  async getRoles(): Promise<Role[]> {
    const res = await apiFetch<Role[]>('/team/roles');
    return res.data;
  },

  async getMembers(): Promise<Member[]> {
    const res = await apiFetch<Member[]>('/team/members');
    return res.data;
  },

  async createMember(data: MemberCreate): Promise<Member> {
    const res = await apiFetch<Member>('/team/members', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res.data;
  },

  async setChaosLevel(level: 0 | 1 | 2): Promise<{ level: 0 | 1 | 2 }> {
    const res = await apiFetch<{ level: 0 | 1 | 2 }>('/workspace/chaos', {
      method: 'PUT',
      body: JSON.stringify({ level }),
    });
    return res.data;
  },

  async getRoster(): Promise<Roster> {
    const res = await apiFetch<Roster>('/team/roster');
    return res.data;
  },

  async updateRoster(members: RosterMember[]): Promise<Roster> {
    const res = await apiFetch<Roster>('/team/roster', {
      method: 'PUT',
      body: JSON.stringify({ members }),
    });
    return res.data;
  },
};

// --- INTEGRATIONS SERVICE ---
export const integrationsService = {
  async requestDeployChallenge(origin: string): Promise<DeployChallenge> {
    const res = await apiFetch<DeployChallenge>('/integrations/deploy/challenge', {
      method: 'POST',
      body: JSON.stringify({ origin }),
    });
    return res.data;
  },

  async verifyDeploy(): Promise<DeployVerified> {
    const res = await apiFetch<DeployVerified>('/integrations/deploy/verify', {
      method: 'POST',
    });
    return res.data;
  },

  async updateStorage(data: StorageRequest): Promise<StorageResult> {
    const res = await apiFetch<StorageResult>('/integrations/storage', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return res.data;
  },

  async getStatus(): Promise<IntegrationStatus> {
    const res = await apiFetch<IntegrationStatus>('/integrations/status');
    return res.data;
  },
};

// --- FILES & MDR SERVICE ---
export const filesService = {
  async getFiles(page = 0, size: 10 | 25 | 50 = 10): Promise<FilePage> {
    const res = await apiFetch<FilePage>(`/files?page=${page}&size=${size}`);
    return res.data;
  },

  async getFile(id: number): Promise<LumonFile> {
    const res = await apiFetch<LumonFile>(`/files/${id}`);
    return res.data;
  },

  async getRules(id: number): Promise<Rules> {
    const res = await apiFetch<Rules>(`/files/${id}/rules`);
    return res.data;
  },

  async getTile(id: number, tileRow: number, tileCol: number): Promise<Tile> {
    const res = await apiFetch<Tile>(`/files/${id}/tiles/${tileRow}/${tileCol}`);
    return res.data;
  },

  async refine(fileId: number, bin: TemperBin, cells: CellCoord[], customKey?: string): Promise<{ data: RefineResult; idempotentReplayed?: boolean }> {
    const idempotencyKey = customKey || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `idemp-${Date.now()}-${Math.random()}`);
    const res = await apiFetch<RefineResult>(`/files/${fileId}/refinements`, {
      method: 'POST',
      idempotencyKey,
      body: JSON.stringify({ bin, cells }),
    });
    return { data: res.data, idempotentReplayed: res.idempotentReplayed };
  },

  async getFloorTicket(fileId: number): Promise<FloorTicket> {
    const res = await apiFetch<FloorTicket>('/floor/tickets', {
      method: 'POST',
      body: JSON.stringify({ fileId }),
    });
    return res.data;
  },
};

// --- CLEARANCE & WELLNESS ---
export const clearanceService = {
  async getClearance(): Promise<Clearance> {
    const res = await apiFetch<Clearance>('/clearance');
    return res.data;
  },

  async runClearanceCheck(): Promise<ClearanceCheckResult> {
    const res = await apiFetch<ClearanceCheckResult>('/clearance/check', {
      method: 'POST',
    });
    return res.data;
  },

  async getWellnessDraw(): Promise<WellnessDraw> {
    const res = await apiFetch<WellnessDraw>('/wellness/draw', {
      skipAuth: true,
    });
    return res.data;
  },
};

// --- REFINERS & MEDIA SERVICE ---
export const refinersService = {
  async getDepartments(): Promise<Department[]> {
    const res = await apiFetch<Department[]>('/departments');
    return res.data;
  },

  async getRefiners(page = 0, size: 10 | 25 | 50 = 10): Promise<RefinerPage> {
    const res = await apiFetch<RefinerPage>(`/refiners?page=${page}&size=${size}`);
    return res.data;
  },

  async getRefiner(id: number): Promise<{ refiner: Refiner; etag: string | null }> {
    const res = await apiFetch<Refiner>(`/refiners/${id}`);
    return { refiner: res.data, etag: res.etag || null };
  },

  async patchRefiner(id: number, patch: RefinerPatch, etag: string): Promise<Refiner> {
    const res = await apiFetch<Refiner>(`/refiners/${id}`, {
      method: 'PATCH',
      ifMatch: etag,
      body: JSON.stringify(patch),
    });
    return res.data;
  },

  async requestMediaTicket(data: MediaTicketRequest): Promise<MediaTicket> {
    const res = await apiFetch<MediaTicket>('/media/tickets', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res.data;
  },

  async confirmMedia(ticketId: string, url: string): Promise<Media> {
    const res = await apiFetch<Media>(`/media/tickets/${ticketId}/confirm`, {
      method: 'POST',
      body: JSON.stringify({ url }),
    });
    return res.data;
  },
};

// --- INCIDENTS SERVICE ---
export const incidentsService = {
  async getIncidents(page = 0, size: 10 | 25 | 50 = 10): Promise<IncidentPage> {
    const res = await apiFetch<IncidentPage>(`/incidents?page=${page}&size=${size}`);
    return res.data;
  },

  async createIncident(data: IncidentCreate): Promise<Incident> {
    const res = await apiFetch<Incident>('/incidents', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res.data;
  },
};

// --- EVENTS & CONTINGENCY SERVICE ---
export const eventsService = {
  async getStreamTicket(): Promise<StreamTicket> {
    const res = await apiFetch<StreamTicket>('/events/tickets', {
      method: 'POST',
    });
    return res.data;
  },

  async ackContingency(id: number): Promise<void> {
    await apiFetch<void>(`/contingency/${id}/ack`, {
      method: 'POST',
    });
  },
};
