import { useCallback, useEffect, useRef, useState } from "react";
import type { PermissionResult } from "@anthropic-ai/claude-agent-sdk";
import { useIPC } from "./hooks/useIPC";
import { useAppStore } from "./store/useAppStore";
import type { ServerEvent } from "./types";
import { Sidebar } from "./components/Sidebar";
import { StartSessionModal } from "./components/StartSessionModal";
import { PromptInput, usePromptActions } from "./components/PromptInput";
import { MessageCard } from "./components/EventCard";
import { Skills } from "./components/Skills";
import MDContent from "./render/markdown";

function App() {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const partialMessageRef = useRef("");
  const [partialMessage, setPartialMessage] = useState("");
  const [showPartialMessage, setShowPartialMessage] = useState(false);

  const sessions = useAppStore((s) => s.sessions);
  const activeSessionId = useAppStore((s) => s.activeSessionId);
  const showStartModal = useAppStore((s) => s.showStartModal);
  const setShowStartModal = useAppStore((s) => s.setShowStartModal);
  const globalError = useAppStore((s) => s.globalError);
  const setGlobalError = useAppStore((s) => s.setGlobalError);
  const historyRequested = useAppStore((s) => s.historyRequested);
  const markHistoryRequested = useAppStore((s) => s.markHistoryRequested);
  const resolvePermissionRequest = useAppStore((s) => s.resolvePermissionRequest);
  const handleServerEvent = useAppStore((s) => s.handleServerEvent);
  const prompt = useAppStore((s) => s.prompt);
  const setPrompt = useAppStore((s) => s.setPrompt);
  const cwd = useAppStore((s) => s.cwd);
  const setCwd = useAppStore((s) => s.setCwd);
  const pendingStart = useAppStore((s) => s.pendingStart);
  const sidebarOpen = useAppStore((s) => s.sidebarOpen);
  const setSidebarOpen = useAppStore((s) => s.setSidebarOpen);
  const currentView = useAppStore((s) => s.currentView);
  const setCurrentView = useAppStore((s) => s.setCurrentView);
  const loadWorkspaces = useAppStore((s) => s.loadWorkspaces);

  // Load workspaces on mount
  useEffect(() => {
    loadWorkspaces();
  }, [loadWorkspaces]);

  // Helper function to extract partial message content
  const getPartialMessageContent = (eventMessage: { delta: { type: string; [key: string]: unknown } }) => {
    try {
      const realType = eventMessage.delta.type.split("_")[0];
      return eventMessage.delta[realType] as string;
    } catch (error) {
      console.error(error);
      return "";
    }
  };

  // Handle partial messages from stream events
  const handlePartialMessages = useCallback((partialEvent: ServerEvent) => {
    if (partialEvent.type !== "stream.message" || partialEvent.payload.message.type !== "stream_event") return;

    const message = partialEvent.payload.message as { event: { type: string; delta?: { type?: string; [key: string]: unknown } } };
    if (message.event.type === "content_block_start") {
      partialMessageRef.current = "";
      setPartialMessage(partialMessageRef.current);
      setShowPartialMessage(true);
    }

    if (message.event.type === "content_block_delta" && message.event.delta) {
      partialMessageRef.current += getPartialMessageContent(message.event as { delta: { type: string; [key: string]: unknown } }) || "";
      setPartialMessage(partialMessageRef.current);
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }

    if (message.event.type === "content_block_stop") {
      setShowPartialMessage(false);
      setTimeout(() => {
        partialMessageRef.current = "";
        setPartialMessage(partialMessageRef.current);
      }, 500);
    }
  }, []);

  // Combined event handler
  const onEvent = useCallback((event: ServerEvent) => {
    handleServerEvent(event);
    handlePartialMessages(event);
  }, [handleServerEvent, handlePartialMessages]);

  const { connected, sendEvent } = useIPC(onEvent);
  const { handleStartFromModal } = usePromptActions(sendEvent);

  const activeSession = activeSessionId ? sessions[activeSessionId] : undefined;
  const messages = activeSession?.messages ?? [];
  const permissionRequests = activeSession?.permissionRequests ?? [];
  const isRunning = activeSession?.status === "running";

  useEffect(() => {
    if (connected) sendEvent({ type: "session.list" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected, sendEvent]);

  useEffect(() => {
    if (!activeSessionId || !connected) return;
    const session = sessions[activeSessionId];
    if (session && !session.hydrated && !historyRequested.has(activeSessionId)) {
      markHistoryRequested(activeSessionId);
      sendEvent({ type: "session.history", payload: { sessionId: activeSessionId } });
    }
  }, [activeSessionId, connected, sessions, historyRequested, markHistoryRequested, sendEvent]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, partialMessage]);

  const handleNewSession = useCallback(() => {
    useAppStore.getState().setActiveSessionId(null);
    setShowStartModal(true);
  }, [setShowStartModal]);

  const handleDeleteSession = useCallback((sessionId: string) => {
    sendEvent({ type: "session.delete", payload: { sessionId } });
  }, [sendEvent]);

  const handlePermissionResult = useCallback((toolUseId: string, result: PermissionResult) => {
    if (!activeSessionId) return;
    sendEvent({ type: "permission.response", payload: { sessionId: activeSessionId, toolUseId, result } });
    resolvePermissionRequest(activeSessionId, toolUseId);
  }, [activeSessionId, sendEvent, resolvePermissionRequest]);

  return (
    <div className="flex h-screen bg-surface">
      <Sidebar
        connected={connected}
        onNewSession={handleNewSession}
        onDeleteSession={handleDeleteSession}
      />

      <main className={`flex flex-1 flex-col bg-surface-cream transition-all duration-300 ease-in-out ${sidebarOpen ? "ml-[280px]" : "ml-0"}`}>
        <div className="flex items-center justify-between h-12 border-b border-ink-900/10 bg-surface-cream px-4 select-none">
          <div className="flex items-center gap-2 flex-1">
            {!sidebarOpen && (
              <button
                className="rounded-lg p-1.5 text-ink-500 hover:bg-ink-900/10 transition-colors"
                onClick={() => setSidebarOpen(true)}
                aria-label="Open sidebar"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M13 19l7-7-7-7M6 19l7-7-7-7" />
                </svg>
              </button>
            )}
            <div className="flex items-center gap-1 bg-surface rounded-lg p-1">
              <button
                className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                  currentView === "chat"
                    ? "bg-white text-ink-800 shadow-sm"
                    : "text-ink-500 hover:bg-ink-900/5"
                }`}
                onClick={() => setCurrentView("chat")}
              >
                Chat
              </button>
              <button
                className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                  currentView === "skills"
                    ? "bg-white text-ink-800 shadow-sm"
                    : "text-ink-500 hover:bg-ink-900/5"
                }`}
                onClick={() => setCurrentView("skills")}
              >
                Skills
              </button>
            </div>
          </div>
          <div style={{ WebkitAppRegion: 'drag' } as React.CSSProperties} className="flex-1" />
        </div>

        <div className="flex-1 overflow-y-auto px-8 pb-40 pt-6">
          {currentView === "skills" ? (
            <div className="mx-auto max-w-3xl">
              <Skills sendEvent={sendEvent} />
            </div>
          ) : (
            <>
              <div className="mx-auto max-w-3xl">
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center">
                    <div className="text-lg font-medium text-ink-700">No messages yet</div>
                    <p className="mt-2 text-sm text-muted">Start a conversation with Claude Code</p>
                  </div>
                ) : (
                  messages.map((msg, idx) => (
                    <MessageCard
                      key={idx}
                      message={msg}
                      isLast={idx === messages.length - 1}
                      isRunning={isRunning}
                      permissionRequest={permissionRequests[0]}
                      onPermissionResult={handlePermissionResult}
                    />
                  ))
                )}

                {/* Partial message display with skeleton loading */}
                <div className="partial-message">
                  <MDContent text={partialMessage} />
                  {showPartialMessage && (
                    <div className="mt-3 flex flex-col gap-2 px-1">
                      <div className="relative h-3 w-2/12 overflow-hidden rounded-full bg-ink-900/10">
                        <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-ink-900/30 to-transparent animate-shimmer" />
                      </div>
                      <div className="relative h-3 w-full overflow-hidden rounded-full bg-ink-900/10">
                        <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-ink-900/30 to-transparent animate-shimmer" />
                      </div>
                      <div className="relative h-3 w-full overflow-hidden rounded-full bg-ink-900/10">
                        <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-ink-900/30 to-transparent animate-shimmer" />
                      </div>
                      <div className="relative h-3 w-full overflow-hidden rounded-full bg-ink-900/10">
                        <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-ink-900/30 to-transparent animate-shimmer" />
                      </div>
                      <div className="relative h-3 w-4/12 overflow-hidden rounded-full bg-ink-900/10">
                        <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-ink-900/30 to-transparent animate-shimmer" />
                      </div>
                    </div>
                  )}
                </div>

                <div ref={messagesEndRef} />
              </div>
            </>
          )}
        </div>

        <PromptInput sendEvent={sendEvent} />
      </main>

      {showStartModal && (
        <StartSessionModal
          cwd={cwd}
          prompt={prompt}
          pendingStart={pendingStart}
          onCwdChange={setCwd}
          onPromptChange={setPrompt}
          onStart={handleStartFromModal}
          onClose={() => setShowStartModal(false)}
        />
      )}

      {globalError && (
        <div className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-xl border border-error/20 bg-error-light px-4 py-3 shadow-lg">
          <div className="flex items-center gap-3">
            <span className="text-sm text-error">{globalError}</span>
            <button className="text-error hover:text-error/80" onClick={() => setGlobalError(null)}>
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
