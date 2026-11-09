// Lumon Industries · Macrodata Refinement API Types
// Contract: https://lumon-api.vercel.app/docs

export interface LumonApiError {
  error: string;
  message: string;
  details?: unknown;
  timestamp: string;
  path: string;
  requestId: string;
}

export interface User {
  id: number;
  email: string;
  displayName: string;
  roleId: number;
  roleName: string;
}

export interface Team {
  code: string;
  name: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface RegisterResponse extends TokenPair {
  user: User;
  team: Team;
}

export interface LoginResponse extends TokenPair {
  user: User;
  team: Team;
}

export type Permission =
  | 'files:read'
  | 'files:refine'
  | 'refiners:read'
  | 'refiners:write'
  | 'media:upload'
  | 'incidents:read'
  | 'incidents:create'
  | 'team:manage';

export interface Role {
  id: number;
  code: string;
  name: string;
  permissions: Permission[];
}

export interface Me {
  user: User;
  team: Team;
  role: Role;
  clearance: {
    granted: boolean;
    grantedAt: string | null;
  };
}

export interface Member {
  id: number;
  email: string;
  displayName: string;
  role: Role;
  createdAt: string;
}

export interface MemberCreate {
  email: string;
  password?: string;
  displayName: string;
  roleId: number;
}

export interface RosterMember {
  name: string;
  code: string;
}

export interface RosterRequest {
  members: RosterMember[];
}

export interface Roster {
  teamCode: string;
  teamName: string;
  members: RosterMember[];
  registeredAt: string;
}

export interface DeployChallengeRequest {
  origin: string;
}

export interface DeployChallenge {
  origin: string;
  token: string;
  wellKnownPath: '/.well-known/lumon-verification.txt';
  expiresAt: string;
}

export interface DeployVerified {
  origin: string;
  verifiedAt: string;
}

export interface StorageSupabase {
  provider: 'SUPABASE';
  projectUrl: string;
  bucket: 'lumon-media';
  publicKey: string;
}

export interface StorageCloudinary {
  provider: 'CLOUDINARY';
  cloudName: string;
  uploadPreset: string;
}

export type StorageRequest = StorageSupabase | StorageCloudinary;

export interface Check {
  name: string;
  status: 'PASS' | 'FAIL';
  message?: string;
}

export interface StorageResult {
  provider: 'SUPABASE' | 'CLOUDINARY';
  verifiedAt: string;
  checks: Check[];
  config: Record<string, unknown>;
}

export interface IntegrationStatus {
  deploy: {
    origin: string | null;
    verifiedAt: string | null;
    lastBuildSeen: string | null;
    lastBuildSeenAt: string | null;
    pendingChallenge: DeployChallenge | null;
  };
  storage: StorageResult | null;
  clearance: {
    granted: boolean;
    grantedAt: string | null;
  };
}

export type TemperBin = 'WO' | 'FC' | 'DR' | 'MA';

export interface Progress {
  WO: number;
  FC: number;
  DR: number;
  MA: number;
  overall: number;
}

export interface LumonFile {
  id: number;
  name: string;
  rows: number;
  cols: number;
  tileSize: number;
  status: 'ACTIVE' | 'COMPLETE';
  progress: Progress;
  refinedGroups: number;
  totalGroups: number;
  mistakes: number;
  updatedAt: string;
}

export interface FilePage {
  content: LumonFile[];
  totalElements: number;
  totalPages: number;
  page: number;
  size: 10 | 25 | 50;
}

export interface Rules {
  tremorThreshold: number;
  connectivity: 4 | 8;
  minGroupSize: number;
  maxGroupSize: number;
  binning: {
    strategy: 'DIGIT_SUM_MOD' | 'MAX_DIGIT_MOD';
    order: [TemperBin, TemperBin, TemperBin, TemperBin];
  };
}

export interface Tile {
  tileRow: number;
  tileCol: number;
  originRow: number;
  originCol: number;
  rows: number;
  cols: number;
  values: string;
  tremor: string;
  bins: string;
  version: number;
}

export interface CellCoord {
  r: number;
  c: number;
}

export interface RefineRequest {
  bin: TemperBin;
  cells: CellCoord[];
}

export interface RefineResult {
  refinementId: number;
  bin: TemperBin;
  size: number;
  file: {
    progress: Progress;
    refinedGroups: number;
    totalGroups: number;
    mistakes: number;
    status: 'ACTIVE' | 'COMPLETE';
  };
}

export interface ClearanceCheck {
  name: 'DEPLOY' | 'SESSION' | 'GRID' | 'REFINE';
  status: 'PASS' | 'FAIL';
  message: string;
}

export interface ClearanceCheckResult {
  granted: boolean;
  grantedAt: string | null;
  checks: ClearanceCheck[];
}

export interface Clearance {
  granted: boolean;
  grantedAt: string | null;
  checks: ClearanceCheck[];
  checkedAt: string | null;
  workspace: {
    kind: 'DEV' | 'EVAL';
    chaosLevel: 0 | 1 | 2;
  };
  roster: Roster;
  round: unknown;
}

export interface WellnessScheduleItem {
  number: number;
  startsAt: string;
  drawn: boolean;
}

export interface WellnessDraw {
  startedAt: string | null;
  serverTime: string;
  nextRound: {
    number: number;
    startsAt: string;
    drawAt: string;
  } | null;
  round: {
    number: number;
    startsAt: string;
    drawn: boolean;
    teams: unknown[];
  } | null;
  schedule: WellnessScheduleItem[];
}

export interface Department {
  id: number;
  code: string;
  name: string;
}

export interface Refiner {
  id: number;
  version: number;
  employeeId: string;
  firstName: string;
  lastName: string;
  title: string;
  departmentId: number;
  department: Department;
  status: 'ACTIVE' | 'SEVERED' | 'PROBATION';
  badgeMediaId: number | null;
  badgeUrl: string | null;
  notes: string | null;
  updatedAt: string;
}

export interface RefinerPage {
  content: Refiner[];
  totalElements: number;
  totalPages: number;
  page: number;
  size: 10 | 25 | 50;
}

export interface RefinerPatch {
  title?: string;
  departmentId?: number;
  status?: 'ACTIVE' | 'SEVERED' | 'PROBATION';
  badgeMediaId?: number | null;
  notes?: string | null;
}

export interface MediaTicketRequest {
  purpose: 'BADGE' | 'INCIDENT';
  contentType: 'image/webp';
  bytes: number;
  sha256: string;
  width: number;
  height: number;
}

export interface MediaTicket {
  ticketId: string;
  expiresAt: string;
  provider: 'SUPABASE' | 'CLOUDINARY';
  objectPath?: string;
  bucket?: string;
  uploadPublicId?: string;
  expectedPublicId?: string;
  constraints: {
    contentType: string;
    width?: number;
    height?: number;
    minLongSide?: number;
    maxLongSide?: number;
    maxBytes: number;
  };
}

export interface Media {
  mediaId: number;
  url: string;
  width: number;
  height: number;
  purpose: 'BADGE' | 'INCIDENT';
}

export type Severity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface IncidentCreate {
  title: string;
  description: string;
  severity: Severity;
  fileId?: number | null;
  mediaIds: number[];
}

export interface Incident {
  id: number;
  title: string;
  description: string;
  severity: Severity;
  fileId: number | null;
  file: { id: number; name: string } | null;
  photos: Array<{ mediaId: number; url: string; width: number; height: number }>;
  createdBy: { id: number; displayName: string };
  createdAt: string;
}

export interface IncidentPage {
  content: Incident[];
  totalElements: number;
  totalPages: number;
  page: number;
  size: 10 | 25 | 50;
}

export interface StreamTicket {
  ticket: string;
  expiresIn: number;
}

export interface FloorTicket {
  ticket: string;
  expiresIn: number;
}

export interface ContingencyActivated {
  id: number;
  userId: number;
  status: 'ACTIVE';
  createdAt: string;
  message: string;
}

export interface FloorSnapshotMember {
  userId: number;
  displayName: string;
  r: number | null;
  c: number | null;
}

export interface FloorClaim {
  claimId: string;
  userId: number;
  displayName: string;
  cells: CellCoord[];
  expiresAt: string;
}

export type FloorWsServerMessage =
  | { type: 'snapshot'; seq: number; members: FloorSnapshotMember[]; claims: FloorClaim[] }
  | { type: 'member.joined'; seq: number; userId: number; displayName: string }
  | { type: 'member.left'; seq: number; userId: number; displayName: string }
  | { type: 'cursor'; userId: number; r: number; c: number }
  | { type: 'claim.granted'; seq: number; requestId: string; claimId: string; userId: number; displayName: string; cells: CellCoord[]; expiresAt: string }
  | { type: 'claim.denied'; requestId: string; reason: 'HELD' | 'NOT_A_GROUP'; holder: { userId: number; displayName: string } | null }
  | { type: 'claim.updated'; seq: number; claimId: string; userId: number; displayName: string; cells: CellCoord[]; expiresAt: string }
  | { type: 'claim.released'; seq?: number; claimId: string; userId?: number; cells?: CellCoord[] }
  | { type: 'pong'; t: number };

export type FloorWsClientMessage =
  | { type: 'cursor'; r: number; c: number }
  | { type: 'claim'; requestId: string; r: number; c: number }
  | { type: 'renew'; claimId: string }
  | { type: 'release'; claimId: string }
  | { type: 'ping'; t: number }
  | { type: 'resync' };
