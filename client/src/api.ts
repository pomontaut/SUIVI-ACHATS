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

async function uploadFichier<T>(path: string, file: File): Promise<T> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(`${BASE}${path}`, { method: "POST", body: formData });
  if (!res.ok) throw new Error(`upload ${path} -> ${res.status}`);
  return res.json() as Promise<T>;
}

function removeFichier<T>(path: string): Promise<T> {
  return request<T>(path, { method: "DELETE" });
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
  uploadOffreFichier: (appelOffreId: string, file: File) =>
    uploadFichier<import("./types").AppelOffre>(`/appels-offres/${appelOffreId}/offre-fichier`, file),
  removeOffreFichier: (appelOffreId: string) =>
    removeFichier<import("./types").AppelOffre>(`/appels-offres/${appelOffreId}/offre-fichier`),
  uploadConfirmationFichier: (id: string, file: File) =>
    uploadFichier<import("./types").SuiviAdministratif>(`/suivi-administratif/${id}/confirmation-fichier`, file),
  removeConfirmationFichier: (id: string) =>
    removeFichier<import("./types").SuiviAdministratif>(`/suivi-administratif/${id}/confirmation-fichier`),
  uploadBlFichier: (id: string, file: File) =>
    uploadFichier<import("./types").SuiviAdministratif>(`/suivi-administratif/${id}/bl-fichier`, file),
  removeBlFichier: (id: string) =>
    removeFichier<import("./types").SuiviAdministratif>(`/suivi-administratif/${id}/bl-fichier`),
  aoSujets: () => request<import("./types").AoSujet[]>("/ao-sujets"),
  updateAoSujet: (cle: string, data: { statutCommande?: string | null; numCmd?: string | null }) =>
    request<import("./types").AoSujet>(`/ao-sujets/${encodeURIComponent(cle)}`, { method: "PUT", body: JSON.stringify(data) }),
  aoPostes: (sujetCle: string) =>
    request<{ postes: import("./types").AoPoste[]; montants: import("./types").AoPosteMontant[] }>(`/ao-postes?sujetCle=${encodeURIComponent(sujetCle)}`),
  addAoPoste: (data: { sujetCle: string; reference?: string | null; libelle?: string | null; budget?: string | null }) =>
    request<import("./types").AoPoste>("/ao-postes", { method: "POST", body: JSON.stringify(data) }),
  updateAoPoste: (id: string, data: { reference?: string | null; libelle?: string | null; budget?: string | null; ordre?: number }) =>
    request<import("./types").AoPoste>(`/ao-postes/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  removeAoPoste: (id: string) => request<void>(`/ao-postes/${id}`, { method: "DELETE" }),
  updateAoPosteMontant: (posteId: string, appelOffreId: string, montant: string | null) =>
    request<import("./types").AoPosteMontant>(`/ao-postes/${posteId}/montant/${appelOffreId}`, { method: "PUT", body: JSON.stringify({ montant }) }),
  aoCriteresTech: (sujetCle: string) =>
    request<{ criteres: import("./types").AoCritereTech[]; valeurs: import("./types").AoCritereTechValeur[] }>(`/ao-criteres-tech?sujetCle=${encodeURIComponent(sujetCle)}`),
  addAoCritereTech: (data: { sujetCle: string; libelle?: string | null }) =>
    request<import("./types").AoCritereTech>("/ao-criteres-tech", { method: "POST", body: JSON.stringify(data) }),
  updateAoCritereTech: (id: string, data: { libelle?: string | null; remarque?: string | null; ordre?: number }) =>
    request<import("./types").AoCritereTech>(`/ao-criteres-tech/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  removeAoCritereTech: (id: string) => request<void>(`/ao-criteres-tech/${id}`, { method: "DELETE" }),
  updateAoCritereTechValeur: (critereId: string, appelOffreId: string, valeur: string | null) =>
    request<import("./types").AoCritereTechValeur>(`/ao-criteres-tech/${critereId}/valeur/${appelOffreId}`, { method: "PUT", body: JSON.stringify({ valeur }) }),
};
