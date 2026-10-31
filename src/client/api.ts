import type { EventConfig, Invitation, InviteMode, RsvpResponse } from "../shared/types";

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(path, {
    ...init,
    credentials: "same-origin",
    headers: init.body ? { "Content-Type": "application/json", ...init.headers } : init.headers,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || (data && data.success === false)) {
    throw new ApiError(data?.error || "Erro de conexão. Tente novamente.", res.status);
  }
  return data as T;
}

const body = (value: unknown) => JSON.stringify(value);

export const api = {
  config: () => request<EventConfig>("/api/config"),
  invite: (code: string, mode?: InviteMode) =>
    request<Invitation>(`/api/invites/${encodeURIComponent(code)}${mode ? `?mode=${mode}` : ""}`),
  rsvp: (code: string, responses: RsvpResponse[]) =>
    request<{ invite: Invitation }>("/api/rsvp", { method: "POST", body: body({ code, responses }) }),

  session: () => request<{ authenticated: boolean }>("/api/admin/session"),
  login: (password: string) => request("/api/admin/login", { method: "POST", body: body({ password }) }),
  logout: () => request("/api/admin/logout", { method: "POST" }),

  invites: () => request<Invitation[]>("/api/admin/invites"),
  createInvite: (invite: Partial<Invitation>) =>
    request<{ invite: Invitation }>("/api/admin/invites", { method: "POST", body: body(invite) }),
  updateInvite: (code: string, invite: Partial<Invitation>) =>
    request<{ invite: Invitation }>(`/api/admin/invites/${encodeURIComponent(code)}`, {
      method: "PUT",
      body: body(invite),
    }),
  deleteInvite: (code: string) =>
    request(`/api/admin/invites/${encodeURIComponent(code)}`, { method: "DELETE" }),
  saveSettings: (config: Partial<EventConfig>) =>
    request<{ config: EventConfig }>("/api/admin/settings", { method: "POST", body: body(config) }),
};
