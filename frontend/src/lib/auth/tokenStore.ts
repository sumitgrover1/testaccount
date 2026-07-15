// Access tokens live in memory only — never localStorage/sessionStorage,
// which would be readable by any injected script (XSS). The refresh token
// itself never touches JS at all; it's an httpOnly cookie set by the backend.
// This module is the single source of truth the axios client reads
// synchronously; AuthContext mirrors it into React state for re-renders.

let accessToken: string | null = null;
type Listener = (token: string | null) => void;
const listeners = new Set<Listener>();

export function getAccessToken(): string | null {
  return accessToken;
}

export function setAccessToken(token: string | null): void {
  accessToken = token;
  listeners.forEach((listener) => listener(token));
}

export function subscribeAccessToken(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}
