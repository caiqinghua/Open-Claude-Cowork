import { useState, useCallback, useEffect } from "react";
import { useAppStore } from "../store/useAppStore";
import type { SkillCard, ClientEvent } from "../types";

interface SkillsProps {
  sendEvent: (event: ClientEvent) => void;
}

export function Skills({ sendEvent }: SkillsProps) {
  const cwd = useAppStore((s) => s.cwd);
  const skills = useAppStore((s) => s.skills);
  const skillsLoading = useAppStore((s) => s.skillsLoading);
  const skillsError = useAppStore((s) => s.skillsError);
  const setSkillsLoading = useAppStore((s) => s.setSkillsLoading);
  const setSkillsError = useAppStore((s) => s.setSkillsError);
  const recordSkillInstall = useAppStore((s) => s.recordSkillInstall);
  const getTopSkillUrls = useAppStore((s) => s.getTopSkillUrls);
  const loadSkillStats = useAppStore((s) => s.loadSkillStats);

  const [installUrl, setInstallUrl] = useState("");
  const [showInstallFromUrl, setShowInstallFromUrl] = useState(false);
  const [uninstallTarget, setUninstallTarget] = useState<SkillCard | null>(null);

  useEffect(() => {
    loadSkillStats();
  }, [loadSkillStats]);

  const refreshSkills = useCallback(() => {
    if (!cwd) return;
    setSkillsLoading(true);
    setSkillsError(null);
    sendEvent({ type: "skills.list", payload: { projectDir: cwd } });
  }, [cwd, sendEvent, setSkillsLoading, setSkillsError]);

  useEffect(() => {
    refreshSkills();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cwd]);

  const handleImportLocal = useCallback(async () => {
    if (!cwd) return;

    try {
      const result = await (window as { electron?: { selectDirectory?: () => Promise<string | null> } }).electron?.selectDirectory();

      if (result) {
        setSkillsLoading(true);
        sendEvent({
          type: "skills.import",
          payload: { projectDir: cwd, sourceDir: result, overwrite: false }
        });
      }
    } catch (error) {
      setSkillsError(String(error));
    }
  }, [cwd, sendEvent, setSkillsLoading, setSkillsError]);

  const handleInstallFromUrl = useCallback(() => {
    if (!cwd || !installUrl) return;

    // Extract skill name from URL for stats
    const skillName = installUrl.split('/').filter(Boolean).pop() || installUrl;

    setSkillsLoading(true);

    // Record the install attempt
    recordSkillInstall(installUrl, skillName);

    sendEvent({
      type: "skills.install.fromUrl",
      payload: {
        projectDir: cwd,
        url: installUrl,
        overwrite: false
      }
    });
    setInstallUrl("");
    setShowInstallFromUrl(false);
  }, [cwd, installUrl, sendEvent, setSkillsLoading, recordSkillInstall]);

  const handleRevealFolder = useCallback(() => {
    if (!cwd) return;
    sendEvent({
      type: "skills.revealFolder",
      payload: { projectDir: cwd }
    });
  }, [cwd, sendEvent]);

  const handleUninstallSkill = useCallback((skillName: string) => {
    if (!cwd) return;
    setSkillsLoading(true);
    sendEvent({
      type: "skills.uninstall",
      payload: { projectDir: cwd, name: skillName }
    });
    setUninstallTarget(null);
  }, [cwd, sendEvent, setSkillsLoading]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-ink-800">Skills</h2>
          <p className="text-sm text-muted mt-1">Manage your Claude Code skills</p>
        </div>
        <button
          className="rounded-xl border border-ink-900/10 bg-surface px-3 py-1.5 text-sm font-medium text-ink-700 hover:bg-surface-tertiary hover:border-ink-900/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={refreshSkills}
          disabled={skillsLoading || !cwd}
        >
          Refresh
        </button>
      </div>

      <div className="rounded-2xl border border-ink-900/10 bg-surface overflow-hidden">
        <div className="px-5 py-4 border-b border-ink-900/5 bg-surface-tertiary">
          <div className="text-sm font-semibold text-ink-700">Add Skills</div>
          <div className="text-xs text-muted mt-1">Install skills from various sources</div>
        </div>

        <div className="divide-y divide-ink-900/5">
          <div className="flex items-center justify-between px-5 py-4">
            <div>
              <div className="text-sm font-medium text-ink-800">Install from URL</div>
              <div className="text-xs text-muted mt-1">Install a skill from a GitHub URL or other source</div>
            </div>
            <button
              className="rounded-xl border border-ink-900/10 bg-surface px-3 py-1.5 text-sm font-medium text-ink-700 hover:bg-surface-tertiary hover:border-ink-900/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={() => setShowInstallFromUrl(!showInstallFromUrl)}
              disabled={skillsLoading || !cwd}
            >
              {showInstallFromUrl ? "Cancel" : "Install"}
            </button>
          </div>

          {showInstallFromUrl && (
            <div className="px-5 py-4 bg-surface-tertiary space-y-3">
              <input
                type="text"
                className="w-full rounded-lg border border-ink-900/10 bg-surface px-3 py-2 text-sm text-ink-700 placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/50"
                placeholder="GitHub URL (e.g., https://github.com/user/repo/tree/main/skills/skill-name)"
                value={installUrl}
                onChange={(e) => setInstallUrl(e.target.value)}
              />
              <button
                className="w-full rounded-xl bg-accent px-3 py-2 text-sm font-medium text-white hover:bg-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handleInstallFromUrl}
                disabled={!installUrl || skillsLoading}
              >
                Install Skill
              </button>
            </div>
          )}

          <div className="flex items-center justify-between px-5 py-4">
            <div>
              <div className="text-sm font-medium text-ink-800">Import Local</div>
              <div className="text-xs text-muted mt-1">Import a skill from a local directory</div>
            </div>
            <button
              className="rounded-xl border border-ink-900/10 bg-surface px-3 py-1.5 text-sm font-medium text-ink-700 hover:bg-surface-tertiary hover:border-ink-900/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={handleImportLocal}
              disabled={skillsLoading || !cwd}
            >
              Import
            </button>
          </div>

          <div className="flex items-center justify-between px-5 py-4">
            <div>
              <div className="text-sm font-medium text-ink-800">Reveal Folder</div>
              <div className="text-xs text-muted mt-1">Open the skills directory in file explorer</div>
            </div>
            <button
              className="rounded-xl border border-ink-900/10 bg-surface px-3 py-1.5 text-sm font-medium text-ink-700 hover:bg-surface-tertiary hover:border-ink-900/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={handleRevealFolder}
              disabled={skillsLoading || !cwd}
            >
              Open
            </button>
          </div>
        </div>

        {skillsError && (
          <div className="border-t border-ink-900/5 px-5 py-3 text-xs text-error">
            {skillsError}
          </div>
        )}
      </div>

      {getTopSkillUrls(3).length > 0 && (
        <div className="rounded-2xl border border-ink-900/10 bg-surface overflow-hidden">
          <div className="px-5 py-4 border-b border-ink-900/5 bg-surface-tertiary">
            <div className="text-sm font-semibold text-ink-700">Recommended Skills</div>
            <div className="text-xs text-muted mt-1">Popular skills from the community</div>
          </div>

          <div className="divide-y divide-ink-900/5">
            {getTopSkillUrls(3).map((skill, index) => (
              <div
                key={skill.url}
                className="flex items-center justify-between px-5 py-3 hover:bg-ink-900/5 transition-colors cursor-pointer"
                onClick={() => {
                  setInstallUrl(skill.url);
                  setShowInstallFromUrl(true);
                }}
              >
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-accent/10 text-accent text-xs font-semibold">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-ink-800 truncate">{skill.name}</div>
                    <div className="text-xs text-muted truncate">{skill.url}</div>
                  </div>
                  <div className="text-xs text-muted">
                    {skill.count} install{skill.count !== 1 ? "s" : ""}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-sm font-semibold text-ink-700">Installed Skills</div>
            <div className="text-xs text-muted mt-1">
              {skills.length} skill{skills.length !== 1 ? "s" : ""} installed
            </div>
          </div>
        </div>

        {skills.length === 0 ? (
          <div className="rounded-2xl border border-ink-900/10 bg-surface px-5 py-6 text-center text-sm text-muted">
            No skills installed yet. Add your first skill above.
          </div>
        ) : (
          <div className="rounded-2xl border border-ink-900/10 bg-surface divide-y divide-ink-900/5">
            {skills.map((skill) => (
              <div key={skill.name} className="px-5 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <svg viewBox="0 0 24 24" className="h-4 w-4 text-ink-500" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                        <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                        <line x1="12" y1="22.08" x2="12" y2="12" />
                      </svg>
                      <div className="font-medium text-ink-800">{skill.name}</div>
                    </div>
                    {skill.description && (
                      <div className="text-sm text-muted mt-2">{skill.description}</div>
                    )}
                    <div className="text-xs text-muted mt-2 font-mono truncate">{skill.path}</div>
                  </div>
                  <button
                    className="rounded-lg border border-error/20 bg-error-light px-3 py-1.5 text-xs font-medium text-error hover:bg-error/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={() => setUninstallTarget(skill)}
                    disabled={skillsLoading}
                  >
                    Uninstall
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {uninstallTarget && (
        <div className="fixed inset-0 z-50 bg-ink-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface border border-ink-900/10 w-full max-w-md rounded-2xl shadow-xl overflow-hidden">
            <div className="p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-ink-800">Uninstall Skill</h3>
                  <p className="text-sm text-ink-600 mt-1">
                    Are you sure you want to uninstall "{uninstallTarget.name}"?
                  </p>
                </div>
              </div>

              <div className="mt-4 rounded-xl bg-surface-tertiary border border-ink-900/10 p-3 text-xs text-muted font-mono break-all">
                {uninstallTarget.path}
              </div>

              <div className="mt-6 flex justify-end gap-2">
                <button
                  className="rounded-xl border border-ink-900/10 bg-surface px-3 py-1.5 text-sm font-medium text-ink-700 hover:bg-surface-tertiary transition-colors"
                  onClick={() => setUninstallTarget(null)}
                  disabled={skillsLoading}
                >
                  Cancel
                </button>
                <button
                  className="rounded-xl bg-error px-3 py-1.5 text-sm font-medium text-white hover:bg-error/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={() => handleUninstallSkill(uninstallTarget.name)}
                  disabled={skillsLoading}
                >
                  Uninstall
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
