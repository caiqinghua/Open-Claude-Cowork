import { create } from 'zustand';
import type { ServerEvent, SessionStatus, StreamMessage, SkillCard } from "../types";

export type PermissionRequest = {
  toolUseId: string;
  toolName: string;
  input: unknown;
};

export type SessionView = {
  id: string;
  title: string;
  status: SessionStatus;
  cwd?: string;
  messages: StreamMessage[];
  permissionRequests: PermissionRequest[];
  lastPrompt?: string;
  createdAt?: number;
  updatedAt?: number;
  hydrated: boolean;
};

export type WorkspaceInfo = {
  id: string;
  path: string;
  name: string;
  createdAt: number;
};

export type SkillInstallStats = {
  [url: string]: {
    count: number;
    name: string;
    lastInstalled: number;
  };
};

interface AppState {
  sessions: Record<string, SessionView>;
  activeSessionId: string | null;
  prompt: string;
  cwd: string;
  pendingStart: boolean;
  globalError: string | null;
  sessionsLoaded: boolean;
  showStartModal: boolean;
  historyRequested: Set<string>;
  sidebarOpen: boolean;
  skills: SkillCard[];
  skillsLoading: boolean;
  skillsError: string | null;
  currentView: "chat" | "skills";
  workspaces: WorkspaceInfo[];
  activeWorkspaceId: string | null;
  workspaceSelectorOpen: boolean;
  skillInstallStats: SkillInstallStats;

  setPrompt: (prompt: string) => void;
  setCwd: (cwd: string) => void;
  setPendingStart: (pending: boolean) => void;
  setGlobalError: (error: string | null) => void;
  setShowStartModal: (show: boolean) => void;
  setActiveSessionId: (id: string | null) => void;
  setSidebarOpen: (open: boolean) => void;
  markHistoryRequested: (sessionId: string) => void;
  resolvePermissionRequest: (sessionId: string, toolUseId: string) => void;
  handleServerEvent: (event: ServerEvent) => void;
  setSkills: (skills: SkillCard[]) => void;
  setSkillsLoading: (loading: boolean) => void;
  setSkillsError: (error: string | null) => void;
  setCurrentView: (view: "chat" | "skills") => void;
  setWorkspaces: (workspaces: WorkspaceInfo[]) => void;
  setActiveWorkspaceId: (id: string | null) => void;
  setWorkspaceSelectorOpen: (open: boolean) => void;
  addWorkspace: (path: string) => void;
  removeWorkspace: (id: string) => void;
  loadWorkspaces: () => void;
  saveWorkspaces: () => void;
  loadSkillStats: () => void;
  saveSkillStats: () => void;
  recordSkillInstall: (url: string, name: string) => void;
  getTopSkillUrls: (limit?: number) => Array<{ url: string; name: string; count: number }>;
}

function createSession(id: string): SessionView {
  return { id, title: "", status: "idle", messages: [], permissionRequests: [], hydrated: false };
}

export const useAppStore = create<AppState>((set, get) => ({
  sessions: {},
  activeSessionId: null,
  prompt: "",
  cwd: "",
  pendingStart: false,
  globalError: null,
  sessionsLoaded: false,
  showStartModal: false,
  historyRequested: new Set(),
  sidebarOpen: true,
  skills: [],
  skillsLoading: false,
  skillsError: null,
  currentView: "chat",
  workspaces: [],
  activeWorkspaceId: null,
  workspaceSelectorOpen: false,
  skillInstallStats: {},

  setPrompt: (prompt) => set({ prompt }),
  setCwd: (cwd) => {
    set({ cwd });
    get().saveWorkspaces();
  },
  setPendingStart: (pendingStart) => set({ pendingStart }),
  setGlobalError: (globalError) => set({ globalError }),
  setShowStartModal: (showStartModal) => set({ showStartModal }),
  setActiveSessionId: (id) => set({ activeSessionId: id }),
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  setSkills: (skills) => set({ skills }),
  setSkillsLoading: (skillsLoading) => set({ skillsLoading }),
  setSkillsError: (skillsError) => set({ skillsError }),
  setCurrentView: (currentView) => set({ currentView }),
  setWorkspaces: (workspaces) => set({ workspaces }),
  setActiveWorkspaceId: (id) => {
    const workspace = get().workspaces.find(w => w.id === id);
    if (workspace) {
      set({ activeWorkspaceId: id, cwd: workspace.path });
    } else {
      set({ activeWorkspaceId: id });
    }
    get().saveWorkspaces();
  },
  setWorkspaceSelectorOpen: (workspaceSelectorOpen) => set({ workspaceSelectorOpen }),

  loadWorkspaces: () => {
    try {
      const stored = localStorage.getItem("claude-workspaces");
      if (stored) {
        const workspaces: WorkspaceInfo[] = JSON.parse(stored);
        const activeId = localStorage.getItem("claude-active-workspace");
        set({ workspaces, activeWorkspaceId: activeId });

        if (workspaces.length > 0 && activeId) {
          const active = workspaces.find(w => w.id === activeId);
          if (active) {
            set({ cwd: active.path });
          }
        }
      }
    } catch (error) {
      console.error("Failed to load workspaces:", error);
    }
  },

  saveWorkspaces: () => {
    try {
      const { workspaces, activeWorkspaceId, cwd } = get();
      localStorage.setItem("claude-workspaces", JSON.stringify(workspaces));
      if (activeWorkspaceId) {
        localStorage.setItem("claude-active-workspace", activeWorkspaceId);
      }

      if (cwd && workspaces.length > 0) {
        const current = workspaces.find(w => w.path === cwd);
        if (current && current.id !== activeWorkspaceId) {
          set({ activeWorkspaceId: current.id });
          localStorage.setItem("claude-active-workspace", current.id);
        }
      }
    } catch (error) {
      console.error("Failed to save workspaces:", error);
    }
  },

  addWorkspace: (path) => {
    const { workspaces, cwd } = get();
    const existing = workspaces.find(w => w.path === path);
    if (existing) {
      set({ activeWorkspaceId: existing.id, cwd: path });
      get().saveWorkspaces();
      return;
    }

    const name = path.split(/[\\/]/).filter(Boolean).pop() || path;
    const newWorkspace: WorkspaceInfo = {
      id: `ws-${Date.now()}`,
      path,
      name,
      createdAt: Date.now()
    };

    const updated = [...workspaces, newWorkspace];
    set({ workspaces: updated, activeWorkspaceId: newWorkspace.id, cwd: path });
    get().saveWorkspaces();
  },

  removeWorkspace: (id) => {
    const { workspaces, activeWorkspaceId } = get();
    const updated = workspaces.filter(w => w.id !== id);

    if (id === activeWorkspaceId) {
      const nextActive = updated[0] || null;
      set({
        workspaces: updated,
        activeWorkspaceId: nextActive?.id || null,
        cwd: nextActive?.path || ""
      });
    } else {
      set({ workspaces: updated });
    }

    get().saveWorkspaces();
  },

  loadSkillStats: () => {
    try {
      const stored = localStorage.getItem("claude-skill-stats");
      if (stored) {
        const stats: SkillInstallStats = JSON.parse(stored);
        set({ skillInstallStats: stats });
      }
    } catch (error) {
      console.error("Failed to load skill stats:", error);
    }
  },

  saveSkillStats: () => {
    try {
      const { skillInstallStats } = get();
      localStorage.setItem("claude-skill-stats", JSON.stringify(skillInstallStats));
    } catch (error) {
      console.error("Failed to save skill stats:", error);
    }
  },

  recordSkillInstall: (url, name) => {
    const { skillInstallStats } = get();
    const existing = skillInstallStats[url];

    const updated = {
      ...skillInstallStats,
      [url]: {
        count: (existing?.count || 0) + 1,
        name: name || existing?.name || url,
        lastInstalled: Date.now()
      }
    };

    set({ skillInstallStats: updated });
    get().saveSkillStats();
  },

  getTopSkillUrls: (limit = 5) => {
    const { skillInstallStats } = get();
    return Object.entries(skillInstallStats)
      .map(([url, data]) => ({ url, name: data.name, count: data.count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  },

  markHistoryRequested: (sessionId) => {
    set((state) => {
      const next = new Set(state.historyRequested);
      next.add(sessionId);
      return { historyRequested: next };
    });
  },

  resolvePermissionRequest: (sessionId, toolUseId) => {
    set((state) => {
      const existing = state.sessions[sessionId];
      if (!existing) return {};
      return {
        sessions: {
          ...state.sessions,
          [sessionId]: {
            ...existing,
            permissionRequests: existing.permissionRequests.filter(req => req.toolUseId !== toolUseId)
          }
        }
      };
    });
  },

  handleServerEvent: (event) => {
    const state = get();

    switch (event.type) {
      case "session.list": {
        const nextSessions: Record<string, SessionView> = {};
        for (const session of event.payload.sessions) {
          const existing = state.sessions[session.id] ?? createSession(session.id);
          nextSessions[session.id] = {
            ...existing,
            status: session.status,
            title: session.title,
            cwd: session.cwd,
            createdAt: session.createdAt,
            updatedAt: session.updatedAt
          };
        }

        set({ sessions: nextSessions, sessionsLoaded: true });

        const hasSessions = event.payload.sessions.length > 0;
        set({ showStartModal: !hasSessions });

        if (!hasSessions) {
          get().setActiveSessionId(null);
        }

        if (!state.activeSessionId && event.payload.sessions.length > 0) {
          const sorted = [...event.payload.sessions].sort((a, b) => {
            const aTime = a.updatedAt ?? a.createdAt ?? 0;
            const bTime = b.updatedAt ?? b.createdAt ?? 0;
            return aTime - bTime;
          });
          const latestSession = sorted[sorted.length - 1];
          if (latestSession) {
            get().setActiveSessionId(latestSession.id);
          }
        } else if (state.activeSessionId) {
          const stillExists = event.payload.sessions.some(
            (session) => session.id === state.activeSessionId
          );
          if (!stillExists) {
            get().setActiveSessionId(null);
          }
        }
        break;
      }

      case "session.history": {
        const { sessionId, messages, status } = event.payload;
        set((state) => {
          const existing = state.sessions[sessionId] ?? createSession(sessionId);
          return {
            sessions: {
              ...state.sessions,
              [sessionId]: { ...existing, status, messages, hydrated: true }
            }
          };
        });
        break;
      }

      case "session.status": {
        const { sessionId, status, title, cwd } = event.payload;
        set((state) => {
          const existing = state.sessions[sessionId] ?? createSession(sessionId);
          return {
            sessions: {
              ...state.sessions,
              [sessionId]: {
                ...existing,
                status,
                title: title ?? existing.title,
                cwd: cwd ?? existing.cwd,
                updatedAt: Date.now()
              }
            }
          };
        });

        if (state.pendingStart) {
          get().setActiveSessionId(sessionId);
          set({ pendingStart: false, showStartModal: false });
        }
        break;
      }

      case "session.deleted": {
        const { sessionId } = event.payload;
        const state = get();
        if (!state.sessions[sessionId]) break;
        const nextSessions = { ...state.sessions };
        delete nextSessions[sessionId];
        set({
          sessions: nextSessions,
          showStartModal: Object.keys(nextSessions).length === 0
        });
        if (state.activeSessionId === sessionId) {
          const remaining = Object.values(nextSessions).sort(
            (a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0)
          );
          get().setActiveSessionId(remaining[0]?.id ?? null);
        }
        break;
      }

      case "stream.message": {
        const { sessionId, message } = event.payload;
        set((state) => {
          const existing = state.sessions[sessionId] ?? createSession(sessionId);
          return {
            sessions: {
              ...state.sessions,
              [sessionId]: { ...existing, messages: [...existing.messages, message] }
            }
          };
        });
        break;
      }

      case "stream.user_prompt": {
        const { sessionId, prompt } = event.payload;
        set((state) => {
          const existing = state.sessions[sessionId] ?? createSession(sessionId);
          return {
            sessions: {
              ...state.sessions,
              [sessionId]: {
                ...existing,
                messages: [...existing.messages, { type: "user_prompt", prompt }]
              }
            }
          };
        });
        break;
      }

      case "permission.request": {
        const { sessionId, toolUseId, toolName, input } = event.payload;
        set((state) => {
          const existing = state.sessions[sessionId] ?? createSession(sessionId);
          return {
            sessions: {
              ...state.sessions,
              [sessionId]: {
                ...existing,
                permissionRequests: [...existing.permissionRequests, { toolUseId, toolName, input }]
              }
            }
          };
        });
        break;
      }

      case "runner.error": {
        set({ globalError: event.payload.message });
        break;
      }

      case "skills.list": {
        set({ skills: event.payload.skills, skillsLoading: false, skillsError: null });
        break;
      }

      case "skills.installed": {
        const { result } = event.payload;
        if (result.ok) {
          get().setSkillsError(null);
          // Refresh the skills list after successful installation
          const cwd = get().cwd;
          if (cwd) {
            get().setSkillsLoading(true);
            window.electron.sendClientEvent({
              type: "skills.list",
              payload: { projectDir: cwd }
            });
          }
        } else {
          get().setSkillsError(result.stderr || "Failed to install skill");
          get().setSkillsLoading(false);
        }
        break;
      }

      case "skills.uninstalled": {
        const { result } = event.payload;
        if (result.ok) {
          get().setSkillsError(null);
          // Refresh the skills list after successful uninstallation
          const cwd = get().cwd;
          if (cwd) {
            get().setSkillsLoading(true);
            window.electron.sendClientEvent({
              type: "skills.list",
              payload: { projectDir: cwd }
            });
          }
        } else {
          get().setSkillsError(result.stderr || "Failed to uninstall skill");
          get().setSkillsLoading(false);
        }
        break;
      }
    }
  }
}));
