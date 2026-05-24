async function req<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    ...init,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status}: ${text || res.statusText}`);
  }
  if (res.headers.get("content-type")?.includes("application/json")) return res.json();
  return undefined as T;
}

export const api = {
  me: () => req<{ reviewer: any | null }>("/api/auth/me"),
  requestLink: (email: string, projectSlug?: string) =>
    req<{ ok: true; link: string; devOnly: boolean }>("/api/auth/request-link", {
      method: "POST", body: JSON.stringify({ email, projectSlug }),
    }),
  devLogin: (email: string) =>
    req<{ ok: true }>("/api/auth/dev-login", {
      method: "POST", body: JSON.stringify({ email }),
    }),
  login: (username: string, password: string) =>
    req<{ ok: true; reviewer: any }>("/api/auth/login", {
      method: "POST", body: JSON.stringify({ username, password }),
    }),
  logout: () => req<{ ok: true }>("/api/auth/logout", { method: "POST" }),

  listProjects: () => req<any[]>("/api/projects"),
  getProject: (slug: string) => req<{ project: any; requirements: any[]; signoffs: any[]; deployedSprints?: any[] }>(`/api/projects/${slug}`),
  setProjectVisibility: (slug: string, visibleToNonAdmin: boolean) =>
    req<any>(`/api/projects/${slug}/visibility`, {
      method: "PATCH",
      body: JSON.stringify({ visibleToNonAdmin }),
    }),

  signoff: async (slug: string, reqId: string, level: string, decision: string, comment?: string, files?: File[]) => {
    const fd = new FormData();
    fd.append("level", level);
    fd.append("decision", decision);
    if (comment) fd.append("comment", comment);
    (files ?? []).forEach((f) => fd.append("screenshots", f));
    const res = await fetch(`/api/projects/${slug}/requirements/${reqId}/signoff`, {
      method: "POST", credentials: "include", body: fd,
    });
    if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
    return res.json();
  },
  clearSignoff: (slug: string, reqId: string, level: string) =>
    req<{ ok: true }>(`/api/projects/${slug}/requirements/${reqId}/signoff?level=${encodeURIComponent(level)}`, {
      method: "DELETE",
    }),
  updateRequirement: (slug: string, reqId: string, payload: { testSteps?: string; expectedResult?: string }) =>
    req<any>(`/api/projects/${slug}/requirements/${reqId}`, {
      method: "PATCH", body: JSON.stringify(payload),
    }),

  getComments: (slug: string, reqId: string) =>
    req<any[]>(`/api/projects/${slug}/requirements/${reqId}/comments`),
  postComment: async (slug: string, reqId: string, body: string, files?: File[]) => {
    const fd = new FormData();
    if (body) fd.append("body", body);
    (files ?? []).forEach((f) => fd.append("screenshots", f));
    const res = await fetch(`/api/projects/${slug}/requirements/${reqId}/comments`, {
      method: "POST", credentials: "include", body: fd,
    });
    if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
    return res.json();
  },

  attachmentUrl: (id: string) => `/api/projects/attachments/${id}`,

  listActivity: (slug: string, limit = 20) =>
    req<any[]>(`/api/projects/${slug}/activity?limit=${limit}`),

  listIssues: (slug: string) => req<any[]>(`/api/projects/${slug}/issues`),
  createIssue: (slug: string, payload: any) =>
    req<any>(`/api/projects/${slug}/issues`, { method: "POST", body: JSON.stringify(payload) }),
  updateIssue: (slug: string, id: string, payload: any) =>
    req<any>(`/api/projects/${slug}/issues/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),

  // ── Feedback / ideas inbox ──────────────────────────────────────
  listFeedback: (params: { projectId?: string; status?: string; type?: string; mine?: boolean }) => {
    const qs = new URLSearchParams();
    if (params.projectId) qs.set("projectId", params.projectId);
    if (params.status) qs.set("status", params.status);
    if (params.type) qs.set("type", params.type);
    if (params.mine) qs.set("mine", "1");
    return req<any[]>(`/api/feedback?${qs.toString()}`);
  },
  getFeedback: (id: string) => req<any>(`/api/feedback/${id}`),
  feedbackStats: (projectId?: string) =>
    req<{ total: number; byStatus: Record<string, number> }>(
      projectId ? `/api/feedback/stats?projectId=${encodeURIComponent(projectId)}` : "/api/feedback/stats",
    ),
  createFeedback: (payload: {
    projectId?: string;
    type: "new_feature" | "enhancement" | "bug" | "ux" | "similar_sw" | "other";
    title: string;
    description: string;
    area?: string;
    similarTo?: string;
    priority?: string;
  }) => req<any>("/api/feedback", { method: "POST", body: JSON.stringify(payload) }),
  updateFeedback: (id: string, patch: Record<string, any>) =>
    req<any>(`/api/feedback/${id}`, { method: "PATCH", body: JSON.stringify(patch) }),
  postFeedbackComment: (id: string, body: string) =>
    req<any>(`/api/feedback/${id}/comments`, { method: "POST", body: JSON.stringify({ body }) }),
  // ── Sprint Releases ────────────────────────────────────────────
  listSprints: (slug: string) => req<any[]>(`/api/projects/${slug}/sprints`),
  createSprint: (slug: string, payload: { name: string; notes?: string; fixedItemRefs?: string[] }) =>
    req<any>(`/api/projects/${slug}/sprints`, { method: "POST", body: JSON.stringify(payload) }),
  getSprint: (id: string) => req<any>(`/api/sprints/${id}`),
  updateSprint: (id: string, patch: { name?: string; notes?: string; fixedItemRefs?: string[]; status?: string }) =>
    req<any>(`/api/sprints/${id}`, { method: "PATCH", body: JSON.stringify(patch) }),
  deploySprint: (id: string, buildRef: string) =>
    req<any>(`/api/sprints/${id}/deploy`, { method: "POST", body: JSON.stringify({ buildRef }) }),
  closeSprint: (id: string) =>
    req<any>(`/api/sprints/${id}/close`, { method: "POST" }),
  deleteSprint: (id: string) =>
    req<any>(`/api/sprints/${id}`, { method: "DELETE" }),

  uploadFeedbackAttachments: async (id: string, files: File[]) => {
    const fd = new FormData();
    files.forEach((f) => fd.append("files", f));
    const res = await fetch(`/api/feedback/${id}/attachments`, {
      method: "POST", credentials: "include", body: fd,
    });
    if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
    return res.json();
  },
};
