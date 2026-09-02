const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000/api";

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

const tokenStore = {
  get(): TokenPair | null {
    const accessToken = sessionStorage.getItem("stockline.accessToken");
    const refreshToken = sessionStorage.getItem("stockline.refreshToken");
    return accessToken && refreshToken ? { accessToken, refreshToken } : null;
  },
  set(tokens: TokenPair): void {
    sessionStorage.setItem("stockline.accessToken", tokens.accessToken);
    sessionStorage.setItem("stockline.refreshToken", tokens.refreshToken);
  },
  clear(): void {
    sessionStorage.removeItem("stockline.accessToken");
    sessionStorage.removeItem("stockline.refreshToken");
  },
};

async function parseResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as
      | { message?: string }
      | null;
    throw new ApiError(response.status, body?.message ?? "Request failed.");
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

async function refreshTokens(): Promise<TokenPair> {
  const current = tokenStore.get();
  if (!current) throw new ApiError(401, "Your session has expired.");
  const response = await fetch(`${API_URL}/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken: current.refreshToken }),
  });
  const tokens = await parseResponse<TokenPair>(response);
  tokenStore.set(tokens);
  return tokens;
}

export async function apiRequest<T>(
  path: string,
  init: RequestInit = {},
  retry = true,
): Promise<T> {
  const tokens = tokenStore.get();
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  if (tokens) headers.set("Authorization", `Bearer ${tokens.accessToken}`);

  const response = await fetch(`${API_URL}${path}`, { ...init, headers });
  if (response.status === 401 && tokens && retry) {
    await refreshTokens();
    return apiRequest<T>(path, init, false);
  }
  return parseResponse<T>(response);
}

export async function login(email: string, password: string): Promise<void> {
  const response = await fetch(`${API_URL}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  tokenStore.set(await parseResponse<TokenPair>(response));
}

export async function logout(): Promise<void> {
  try {
    await apiRequest<void>("/logout", { method: "POST" }, false);
  } finally {
    tokenStore.clear();
  }
}

export function clearSession(): void {
  tokenStore.clear();
}

export function hasSession(): boolean {
  return tokenStore.get() !== null;
}

