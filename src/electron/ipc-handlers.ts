import { BrowserWindow, shell } from "electron";
import type { ClientEvent, ServerEvent } from "./types.js";
import { runClaude, type RunnerHandle } from "./libs/runner.js";
import { SessionStore } from "./libs/session-store.js";
import * as skills from "./libs/skills.js";
import { app } from "electron";
import { join } from "path";

const DB_PATH = join(app.getPath("userData"), "sessions.db");
const sessions = new SessionStore(DB_PATH);
const runnerHandles = new Map<string, RunnerHandle>();

function broadcast(event: ServerEvent) {
  const payload = JSON.stringify(event);
  const windows = BrowserWindow.getAllWindows();
  for (const win of windows) {
    win.webContents.send("server-event", payload);
  }
}

function emit(event: ServerEvent) {
  if (event.type === "session.status") {
    sessions.updateSession(event.payload.sessionId, { status: event.payload.status });
  }
  if (event.type === "stream.message") {
    sessions.recordMessage(event.payload.sessionId, event.payload.message);
  }
  if (event.type === "stream.user_prompt") {
    sessions.recordMessage(event.payload.sessionId, {
      type: "user_prompt",
      prompt: event.payload.prompt
    });
  }
  broadcast(event);
}

export async function handleClientEvent(event: ClientEvent) {
  if (event.type === "session.list") {
    emit({
      type: "session.list",
      payload: { sessions: sessions.listSessions() }
    });
    return;
  }

  if (event.type === "session.history") {
    const history = sessions.getSessionHistory(event.payload.sessionId);
    if (!history) {
      emit({
        type: "runner.error",
        payload: { message: "Unknown session" }
      });
      return;
    }
    emit({
      type: "session.history",
      payload: {
        sessionId: history.session.id,
        status: history.session.status,
        messages: history.messages
      }
    });
    return;
  }

  if (event.type === "session.start") {
    const session = sessions.createSession({
      cwd: event.payload.cwd,
      title: event.payload.title,
      allowedTools: event.payload.allowedTools,
      prompt: event.payload.prompt
    });

    sessions.updateSession(session.id, {
      status: "running",
      lastPrompt: event.payload.prompt
    });
    emit({
      type: "session.status",
      payload: { sessionId: session.id, status: "running", title: session.title, cwd: session.cwd }
    });

    emit({
      type: "stream.user_prompt",
      payload: { sessionId: session.id, prompt: event.payload.prompt }
    });

    runClaude({
      prompt: event.payload.prompt,
      session,
      resumeSessionId: session.claudeSessionId,
      onEvent: emit,
      onSessionUpdate: (updates) => {
        sessions.updateSession(session.id, updates);
      }
    })
      .then((handle) => {
        runnerHandles.set(session.id, handle);
        sessions.setAbortController(session.id, undefined);
      })
      .catch((error) => {
        sessions.updateSession(session.id, { status: "error" });
        emit({
          type: "session.status",
          payload: {
            sessionId: session.id,
            status: "error",
            title: session.title,
            cwd: session.cwd,
            error: String(error)
          }
        });
      });

    return;
  }

  if (event.type === "session.continue") {
    const session = sessions.getSession(event.payload.sessionId);
    if (!session) {
      emit({
        type: "runner.error",
        payload: { message: "Unknown session" }
      });
      return;
    }

    if (!session.claudeSessionId) {
      emit({
        type: "runner.error",
        payload: { sessionId: session.id, message: "Session has no resume id yet." }
      });
      return;
    }

    sessions.updateSession(session.id, { status: "running", lastPrompt: event.payload.prompt });
    emit({
      type: "session.status",
      payload: { sessionId: session.id, status: "running", title: session.title, cwd: session.cwd }
    });

    emit({
      type: "stream.user_prompt",
      payload: { sessionId: session.id, prompt: event.payload.prompt }
    });

    runClaude({
      prompt: event.payload.prompt,
      session,
      resumeSessionId: session.claudeSessionId,
      onEvent: emit,
      onSessionUpdate: (updates) => {
        sessions.updateSession(session.id, updates);
      }
    })
      .then((handle) => {
        runnerHandles.set(session.id, handle);
      })
      .catch((error) => {
        sessions.updateSession(session.id, { status: "error" });
        emit({
          type: "session.status",
          payload: {
            sessionId: session.id,
            status: "error",
            title: session.title,
            cwd: session.cwd,
            error: String(error)
          }
        });
      });

    return;
  }

  if (event.type === "session.stop") {
    const session = sessions.getSession(event.payload.sessionId);
    if (!session) return;

    const handle = runnerHandles.get(session.id);
    if (handle) {
      handle.abort();
      runnerHandles.delete(session.id);
    }

    sessions.updateSession(session.id, { status: "idle" });
    emit({
      type: "session.status",
      payload: { sessionId: session.id, status: "idle", title: session.title, cwd: session.cwd }
    });
    return;
  }

  if (event.type === "session.delete") {
    const sessionId = event.payload.sessionId;
    const handle = runnerHandles.get(sessionId);
    if (handle) {
      handle.abort();
      runnerHandles.delete(sessionId);
    }

    // Always try to delete and emit deleted event
    // Don't emit error if session doesn't exist - it may have already been deleted
    sessions.deleteSession(sessionId);
    emit({
      type: "session.deleted",
      payload: { sessionId }
    });
    return;
  }

  if (event.type === "permission.response") {
    const session = sessions.getSession(event.payload.sessionId);
    if (!session) return;

    const pending = session.pendingPermissions.get(event.payload.toolUseId);
    if (pending) {
      pending.resolve(event.payload.result);
    }
    return;
  }

  if (event.type === "skills.list") {
    try {
      const skillList = await skills.listLocalSkills(event.payload.projectDir);
      emit({
        type: "skills.list",
        payload: { skills: skillList }
      });
    } catch (error) {
      emit({
        type: "runner.error",
        payload: { message: String(error) }
      });
    }
    return;
  }

  if (event.type === "skills.import") {
    try {
      const result = await skills.importLocalSkill(
        event.payload.projectDir,
        event.payload.sourceDir,
        event.payload.overwrite ?? false
      );
      emit({
        type: "skills.installed",
        payload: { result }
      });
    } catch (error) {
      emit({
        type: "skills.installed",
        payload: {
          result: {
            ok: false,
            status: 1,
            stdout: "",
            stderr: String(error)
          }
        }
      });
    }
    return;
  }

  if (event.type === "skills.install.fromUrl") {
    try {
      const result = await skills.installSkillFromUrl(
        event.payload.projectDir,
        event.payload.url,
        event.payload.overwrite ?? false
      );
      emit({
        type: "skills.installed",
        payload: { result }
      });
    } catch (error) {
      emit({
        type: "skills.installed",
        payload: {
          result: {
            ok: false,
            status: 1,
            stdout: "",
            stderr: String(error)
          }
        }
      });
    }
    return;
  }

  if (event.type === "skills.install.template") {
    try {
      const result = await skills.installSkillTemplate(
        event.payload.projectDir,
        event.payload.name,
        event.payload.content,
        event.payload.overwrite ?? false
      );
      emit({
        type: "skills.installed",
        payload: { result }
      });
    } catch (error) {
      emit({
        type: "skills.installed",
        payload: {
          result: {
            ok: false,
            status: 1,
            stdout: "",
            stderr: String(error)
          }
        }
      });
    }
    return;
  }

  if (event.type === "skills.uninstall") {
    try {
      const result = await skills.uninstallSkill(
        event.payload.projectDir,
        event.payload.name
      );
      emit({
        type: "skills.uninstalled",
        payload: { result }
      });
    } catch (error) {
      emit({
        type: "skills.uninstalled",
        payload: {
          result: {
            ok: false,
            status: 1,
            stdout: "",
            stderr: String(error)
          }
        }
      });
    }
    return;
  }

  if (event.type === "skills.revealFolder") {
    try {
      const skillRoot = skills.resolveSkillRoot(event.payload.projectDir);
      await shell.openPath(skillRoot);
    } catch (error) {
      emit({
        type: "runner.error",
        payload: { message: String(error) }
      });
    }
    return;
  }
}

export { sessions };
