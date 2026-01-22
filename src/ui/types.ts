import type { SDKMessage, PermissionResult } from "@anthropic-ai/claude-agent-sdk";

export type UserPromptMessage = {
  type: "user_prompt";
  prompt: string;
};

export type StreamMessage = SDKMessage | UserPromptMessage;

export type SessionStatus = "idle" | "running" | "completed" | "error";

export type SessionInfo = {
  id: string;
  title: string;
  status: SessionStatus;
  claudeSessionId?: string;
  cwd?: string;
  createdAt: number;
  updatedAt: number;
};

export type SkillCard = {
  name: string;
  path: string;
  description?: string;
};

export type ExecResult = {
  ok: boolean;
  status: number;
  stdout: string;
  stderr: string;
};

// Server -> Client events
export type ServerEvent =
  | { type: "stream.message"; payload: { sessionId: string; message: StreamMessage } }
  | { type: "stream.user_prompt"; payload: { sessionId: string; prompt: string } }
  | { type: "session.status"; payload: { sessionId: string; status: SessionStatus; title?: string; cwd?: string; error?: string } }
  | { type: "session.list"; payload: { sessions: SessionInfo[] } }
  | { type: "session.history"; payload: { sessionId: string; status: SessionStatus; messages: StreamMessage[] } }
  | { type: "session.deleted"; payload: { sessionId: string } }
  | { type: "permission.request"; payload: { sessionId: string; toolUseId: string; toolName: string; input: unknown } }
  | { type: "runner.error"; payload: { sessionId?: string; message: string } }
  | { type: "skills.list"; payload: { skills: SkillCard[] } }
  | { type: "skills.installed"; payload: { result: ExecResult } }
  | { type: "skills.uninstalled"; payload: { result: ExecResult } };

// Client -> Server events
export type ClientEvent =
  | { type: "session.start"; payload: { title: string; prompt: string; cwd?: string; allowedTools?: string } }
  | { type: "session.continue"; payload: { sessionId: string; prompt: string } }
  | { type: "session.stop"; payload: { sessionId: string } }
  | { type: "session.delete"; payload: { sessionId: string } }
  | { type: "session.list" }
  | { type: "session.history"; payload: { sessionId: string } }
  | { type: "permission.response"; payload: { sessionId: string; toolUseId: string; result: PermissionResult } }
  | { type: "skills.list"; payload: { projectDir: string } }
  | { type: "skills.import"; payload: { projectDir: string; sourceDir: string; overwrite?: boolean } }
  | { type: "skills.install.fromUrl"; payload: { projectDir: string; url: string; overwrite?: boolean } }
  | { type: "skills.install.template"; payload: { projectDir: string; name: string; content: string; overwrite?: boolean } }
  | { type: "skills.uninstall"; payload: { projectDir: string; name: string } }
  | { type: "skills.revealFolder"; payload: { projectDir: string } };
