import { useState, useEffect } from "react";
import { useAppStore, type WorkspaceInfo } from "../store/useAppStore";

export function WorkspaceSelector() {
  const cwd = useAppStore((s) => s.cwd);
  const workspaces = useAppStore((s) => s.workspaces);
  const activeWorkspaceId = useAppStore((s) => s.activeWorkspaceId);
  const workspaceSelectorOpen = useAppStore((s) => s.workspaceSelectorOpen);
  const setWorkspaceSelectorOpen = useAppStore((s) => s.setWorkspaceSelectorOpen);
  const setActiveWorkspaceId = useAppStore((s) => s.setActiveWorkspaceId);
  const addWorkspace = useAppStore((s) => s.addWorkspace);
  const removeWorkspace = useAppStore((s) => s.removeWorkspace);
  const loadWorkspaces = useAppStore((s) => s.loadWorkspaces);

  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    loadWorkspaces();
  }, [loadWorkspaces]);

  const handleSelectDirectory = async () => {
    try {
      const result = await (window as { electron?: { selectDirectory?: () => Promise<string | null> } }).electron?.selectDirectory();
      if (result) {
        addWorkspace(result);
        setWorkspaceSelectorOpen(false);
      }
    } catch (error) {
      console.error("Failed to select directory:", error);
    }
  };

  const handleWorkspaceClick = (workspace: WorkspaceInfo) => {
    setActiveWorkspaceId(workspace.id);
    setWorkspaceSelectorOpen(false);
  };

  const handleRemoveWorkspace = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm("Remove this workspace?")) {
      removeWorkspace(id);
    }
  };

  const filteredWorkspaces = workspaces.filter(w => {
    const query = searchQuery.toLowerCase();
    return w.name.toLowerCase().includes(query) || w.path.toLowerCase().includes(query);
  });

  const activeWorkspace = workspaces.find(w => w.id === activeWorkspaceId);
  const displayName = activeWorkspace?.name || cwd?.split(/[\\/]/).filter(Boolean).pop() || "Select Workspace";

  return (
    <div className="relative">
      <button
        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left hover:bg-ink-900/5 transition-colors border border-ink-900/10 bg-surface"
        onClick={() => setWorkspaceSelectorOpen(!workspaceSelectorOpen)}
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4 text-ink-500 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 7v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-6l-2-2H5a2 2 0 0 0-2 2z" />
        </svg>
        <span className="flex-1 truncate text-sm text-ink-700 font-medium">{displayName}</span>
        <svg viewBox="0 0 24 24" className="h-4 w-4 text-ink-400 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {workspaceSelectorOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setWorkspaceSelectorOpen(false)}
          />
          <div className="absolute top-full left-0 right-0 mt-1 z-20 bg-surface border border-ink-900/10 rounded-xl shadow-xl overflow-hidden max-h-80 flex flex-col">
            <div className="p-2 border-b border-ink-900/5">
              <input
                type="text"
                className="w-full rounded-lg border border-ink-900/10 bg-surface-tertiary px-3 py-2 text-sm text-ink-700 placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/50"
                placeholder="Search workspaces..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="flex-1 overflow-y-auto p-1">
              {filteredWorkspaces.length === 0 ? (
                <div className="px-3 py-4 text-sm text-muted text-center">
                  {searchQuery ? "No workspaces found" : "No workspaces yet"}
                </div>
              ) : (
                filteredWorkspaces.map((workspace) => (
                  <div
                    key={workspace.id}
                    className={`group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                      workspace.id === activeWorkspaceId
                        ? "bg-accent/10 text-accent"
                        : "hover:bg-ink-900/5"
                    }`}
                    onClick={() => handleWorkspaceClick(workspace)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{workspace.name}</div>
                      <div className="text-xs text-muted truncate">{workspace.path}</div>
                    </div>
                    <button
                      className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-error/20 text-error transition-opacity"
                      onClick={(e) => handleRemoveWorkspace(e, workspace.id)}
                      title="Remove workspace"
                    >
                      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M18 6L6 18M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="p-2 border-t border-ink-900/5">
              <button
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-ink-700 hover:bg-ink-900/5 transition-colors"
                onClick={handleSelectDirectory}
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 4v16m8-8H4" />
                </svg>
                Add Workspace
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
