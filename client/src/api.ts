const BASE = "/api";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) throw new Error(`${options?.method ?? "GET"} ${path} -> ${res.status}`);
  if (res.status === 204) return undefined as T;
  return res.json();
}

export function makeResource<T extends { id: string }>(name: string) {
  return {
    list: () => request<T[]>(`/${name}`),
    create: (data: Partial<T>) => request<T>(`/${name}`, { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: Partial<T>) =>
      request<T>(`/${name}/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    remove: (id: string) => request<void>(`/${name}/${id}`, { method: "DELETE" }),
  };
}

export const api = {
  options: () => request<import("./types").Options>("/options"),
  fournisseurs: (q: string) =>
    request<import("./types").Fournisseur[]>(`/fournisseurs?q=${encodeURIComponent(q)}`),
  fournisseursManuel: () => request<import("./types").Fournisseur[]>("/fournisseurs?manuel=true"),
  addFournisseur: (data: { nom: string; npa?: string | null; ville?: string | null; pays?: string | null }) =>
    request<import("./types").Fournisseur>("/fournisseurs", { method: "POST", body: JSON.stringify(data) }),
  chantiers: (q: string) =>
    request<import("./types").Chantier[]>(`/chantiers?q=${encodeURIComponent(q)}`),
  addChantier: (data: { numero: string; nom?: string | null; npa?: string | null; ville?: string | null }) =>
    request<import("./types").Chantier>("/chantiers", { method: "POST", body: JSON.stringify(data) }),
};
