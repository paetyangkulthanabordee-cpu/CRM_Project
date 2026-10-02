export type UserRole = "ADMIN" | "MANAGER" | "SALES";

export interface User {
  userId: number;
  name: string;
  email: string;
  role: UserRole;
}

export interface Permissions {
  dashboard: boolean;
  customers: boolean;
  salesPipeline: boolean;
  documents: boolean;
  reports: boolean;
  administration: boolean;
  permissions: boolean;
  auditLogs: boolean;
}

export interface LoginResponse {
  accessToken: string;
  user: User;
  permissions: Permissions;
}

export function saveAuth(data: LoginResponse) {
  localStorage.setItem("accessToken", data.accessToken);
  localStorage.setItem("user", JSON.stringify(data.user));
  localStorage.setItem(
    "permissions",
    JSON.stringify(data.permissions),
  );

  notifySessionChange();
}

export function getUser(): User | null {
  if (typeof window === "undefined") {
    return null;
  }

  const user = localStorage.getItem("user");

  if (!user) {
    return null;
  }

  try {
    return JSON.parse(user);
  } catch {
    return null;
  }
}

export function getPermissions(): Permissions | null {
  if (typeof window === "undefined") {
    return null;
  }

  const permissions =
    localStorage.getItem("permissions");

  if (!permissions) {
    return null;
  }

  try {
    return JSON.parse(permissions);
  } catch {
    return null;
  }
}

export function updatePermissions(
  next: Permissions,
) {
  localStorage.setItem(
    "permissions",
    JSON.stringify(next),
  );

  notifySessionChange();
}

export function getAccessToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  return localStorage.getItem("accessToken");
}

/* =====================================================
   SESSION STORE
   ให้ sidebar/page อ่าน session แบบ synchronous
   เพื่อไม่ให้หน้ากะพริบตอนเปลี่ยนหน้าแบบ client-side
   ===================================================== */

type SessionListener = () => void;

const sessionListeners = new Set<SessionListener>();

let cachedUser: User | null = null;
let cachedPermissions: Permissions | null = null;
let sessionCacheReady = false;

function ensureSessionCache() {
  if (sessionCacheReady || typeof window === "undefined") {
    return;
  }

  cachedUser = getUser();
  cachedPermissions = getPermissions();
  sessionCacheReady = true;
}

export function notifySessionChange() {
  sessionCacheReady = false;

  sessionListeners.forEach((listener) => listener());
}

export function subscribeSession(
  listener: SessionListener,
) {
  sessionListeners.add(listener);

  return () => {
    sessionListeners.delete(listener);
  };
}

export function getUserSnapshot(): User | null {
  ensureSessionCache();

  return cachedUser;
}

export function getPermissionsSnapshot(): Permissions | null {
  ensureSessionCache();

  return cachedPermissions;
}

export function getSessionServerSnapshot(): null {
  return null;
}

export function clearAuth() {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("user");
  localStorage.removeItem("permissions");

  notifySessionChange();
}

export function logout() {
  clearAuth();
}