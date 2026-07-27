"use client";

import {
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { StatusBadge } from "@/components/cards/StatusBadge";
import { CopilotMessage } from "@/components/copilot/CopilotMessage";
import { CopilotSidebar } from "@/components/copilot/CopilotSidebar";
import { CopilotSuggestions } from "@/components/copilot/CopilotSuggestions";
import { ErrorState } from "@/components/layout/ErrorState";
import { Header } from "@/components/layout/Header";
import {
  COPILOT_HISTORY_STORAGE_KEY,
  createCopilotConversation,
  createCopilotMessage,
  normalizeCopilotHistory,
  titleFromQuestion,
} from "@/lib/copilot/copilotStorage";
import { loadCopilotKnowledge } from "@/lib/copilot/knowledgeContext";
import { getCopilotProvider } from "@/lib/copilot/providerFactory";
import { CME_BULLETIN_UPDATED_EVENT } from "@/lib/cmeBulletin";
import { formatTimestamp } from "@/lib/formatters";
import { readStoredJson, writeStoredJson } from "@/lib/storage";
import { useDialogFocus } from "@/lib/useDialogFocus";
import { useRemoteResource } from "@/lib/useRemoteResource";
import type { CopilotConversation } from "@/types/copilot";

const copilotProvider = getCopilotProvider();

export function CopilotWorkspace() {
  const {
    data: knowledge,
    error,
    loading,
    reload,
  } = useRemoteResource(loadCopilotKnowledge);
  const [conversations, setConversations] = useState<CopilotConversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [thinking, setThinking] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mobileDrawerRef = useRef<HTMLDivElement>(null);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);
  useDialogFocus(drawerOpen, mobileDrawerRef, closeDrawer);

  useEffect(() => {
    const hydrationTimer = window.setTimeout(() => {
      const stored = readStoredJson(
        window.localStorage,
        COPILOT_HISTORY_STORAGE_KEY,
        [],
        normalizeCopilotHistory,
      );
      const next = stored.length ? stored : [createCopilotConversation()];
      setConversations(next);
      setActiveId(next[0]?.id ?? null);
      setHydrated(true);
    }, 0);
    return () => window.clearTimeout(hydrationTimer);
  }, []);

  useEffect(() => {
    const refresh = () => void reload();
    window.addEventListener(CME_BULLETIN_UPDATED_EVENT, refresh);
    return () => window.removeEventListener(CME_BULLETIN_UPDATED_EVENT, refresh);
  }, [reload]);

  useEffect(() => {
    if (!hydrated) return;
    writeStoredJson(
      window.localStorage,
      COPILOT_HISTORY_STORAGE_KEY,
      conversations,
    );
  }, [conversations, hydrated]);

  const activeConversation = useMemo(
    () =>
      conversations.find((conversation) => conversation.id === activeId)
      ?? null,
    [activeId, conversations],
  );

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [activeConversation?.messages.length, thinking]);

  function createConversation() {
    const conversation = createCopilotConversation();
    setConversations((current) => [conversation, ...current].slice(0, 20));
    setActiveId(conversation.id);
    setQuestion("");
  }

  function deleteConversation(id: string) {
    setConversations((current) => {
      const remaining = current.filter((conversation) => conversation.id !== id);
      if (activeId === id) {
        if (remaining[0]) {
          setActiveId(remaining[0].id);
        } else {
          const replacement = createCopilotConversation();
          setActiveId(replacement.id);
          return [replacement];
        }
      }
      return remaining;
    });
  }

  function updateConversation(
    id: string,
    updater: (current: CopilotConversation) => CopilotConversation,
  ) {
    setConversations((current) =>
      current
        .map((conversation) =>
          conversation.id === id ? updater(conversation) : conversation,
        )
        .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt)),
    );
  }

  async function askCopilot(nextQuestion: string) {
    const normalized = nextQuestion.trim().slice(0, 500);
    if (!normalized || !knowledge || thinking) return;

    let conversationId = activeConversation?.id ?? null;
    if (!conversationId) {
      const conversation = createCopilotConversation();
      conversationId = conversation.id;
      setConversations((current) => [conversation, ...current]);
      setActiveId(conversationId);
    }

    const userMessage = createCopilotMessage("user", normalized);
    updateConversation(conversationId, (current) => ({
      ...current,
      title:
        current.messages.length === 0
          ? titleFromQuestion(normalized)
          : current.title,
      updatedAt: userMessage.createdAt,
      messages: [...current.messages, userMessage].slice(-100),
    }));
    setQuestion("");
    setThinking(true);

    try {
      const answer = await copilotProvider.answer({
        question: normalized,
        context: knowledge,
      });
      const assistantMessage = createCopilotMessage(
        "assistant",
        answer.summary,
        answer,
      );
      updateConversation(conversationId, (current) => ({
        ...current,
        updatedAt: assistantMessage.createdAt,
        messages: [...current.messages, assistantMessage].slice(-100),
      }));
    } finally {
      setThinking(false);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void askCopilot(question);
  }

  if (error && !knowledge) {
    return (
      <>
        <Header
          eyebrow="Knowledge Engine · Local"
          title="INSTITUTIONAL COPILOT"
          description="Pergunte sobre os indicadores internos do terminal, sem IA externa."
          online={false}
        />
        <ErrorState message={error} onRetry={() => void reload()} />
      </>
    );
  }

  return (
    <>
      <Header
        eyebrow="Knowledge Engine · Local"
        title="INSTITUTIONAL COPILOT"
        description="Respostas determinísticas baseadas exclusivamente nos indicadores, análises e snapshots disponíveis no terminal."
        online={!error}
      />

      {loading && !knowledge ? (
        <div className="grid min-h-[680px] gap-3 lg:grid-cols-[270px_minmax(0,1fr)]">
          <div className="loading-shimmer hidden rounded-xl lg:block" />
          <div className="loading-shimmer rounded-xl" />
        </div>
      ) : (
        <div className="relative flex min-h-[680px] overflow-hidden rounded-xl border border-terminal-border bg-terminal-bg/60 shadow-2xl">
          <CopilotSidebar
            conversations={conversations}
            activeId={activeId}
            onCreate={createConversation}
            onDelete={deleteConversation}
            onSelect={setActiveId}
          />

          {drawerOpen ? (
            <div className="fixed inset-0 z-[85] lg:hidden">
              <button
                type="button"
                aria-label="Fechar histórico"
                onClick={closeDrawer}
                className="absolute inset-0 h-full w-full bg-black/65 backdrop-blur-[2px]"
              />
              <div
                ref={mobileDrawerRef}
                role="dialog"
                aria-modal="true"
                aria-label="Histórico do Copilot"
                tabIndex={-1}
                className="workspace-slide relative z-10 h-full w-[min(88vw,320px)]"
              >
                <CopilotSidebar
                  mobile
                  conversations={conversations}
                  activeId={activeId}
                  onClose={closeDrawer}
                  onCreate={createConversation}
                  onDelete={deleteConversation}
                  onSelect={setActiveId}
                />
              </div>
            </div>
          ) : null}

          <section className="flex min-w-0 flex-1 flex-col">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-terminal-border bg-terminal-card/80 px-3 py-2.5 sm:px-4">
              <div className="flex min-w-0 items-center gap-2">
                <button
                  type="button"
                  onClick={() => setDrawerOpen(true)}
                  aria-label="Abrir histórico"
                  className="grid size-8 shrink-0 place-items-center rounded-md border border-terminal-border text-terminal-muted lg:hidden"
                >
                  ☰
                </button>
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-terminal-text">
                    {activeConversation?.title ?? "Nova conversa"}
                  </p>
                  <p className="truncate font-mono text-[9px] text-terminal-muted">
                    {knowledge?.metadata.sourceName ?? "Fonte indisponível"} ·{" "}
                    {formatTimestamp(knowledge?.metadata.generatedAt ?? null)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge label="Sem IA externa" tone="positive" />
                <button
                  type="button"
                  onClick={() => void reload()}
                  disabled={loading}
                  className="rounded-md border border-terminal-border px-2.5 py-1.5 text-[10px] text-terminal-muted transition-colors hover:text-terminal-text disabled:opacity-50"
                >
                  {loading ? "Atualizando…" : "Atualizar contexto"}
                </button>
              </div>
            </div>

            <div
              aria-live="polite"
              className="min-h-0 flex-1 overflow-y-auto px-3 py-5 sm:px-5"
            >
              {activeConversation?.messages.length ? (
                <div className="mx-auto space-y-5">
                  {activeConversation.messages.map((message) => (
                    <CopilotMessage key={message.id} message={message} />
                  ))}
                  {thinking ? (
                    <div className="flex items-center gap-3 text-xs text-terminal-muted">
                      <div className="grid size-8 place-items-center rounded-lg border border-terminal-accent/35 bg-terminal-accent/10 font-mono text-[10px] font-bold text-terminal-accent">
                        KE
                      </div>
                      <span className="loading-shimmer rounded-full px-4 py-2">
                        Consultando indicadores internos…
                      </span>
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="grid min-h-[390px] place-items-center text-center">
                  <div className="max-w-2xl">
                    <div className="mx-auto grid size-12 place-items-center rounded-xl border border-terminal-accent/35 bg-terminal-accent/10 font-mono text-sm font-bold text-terminal-accent">
                      KE
                    </div>
                    <h2 className="mt-4 text-lg font-semibold">
                      Como posso analisar o terminal?
                    </h2>
                    <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-terminal-muted">
                      Pergunte sobre Dealer Report, Replay, Heatmap, Analytics,
                      AI Summary, Open Interest, GEX, Gamma ou Volatility.
                      Números ausentes nunca são estimados.
                    </p>
                    <div className="mt-5">
                      <CopilotSuggestions
                        onSelect={(value) => void askCopilot(value)}
                      />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="border-t border-terminal-border bg-terminal-card/80 p-3 sm:p-4">
              {activeConversation?.messages.length ? (
                <div className="mx-auto mb-2">
                  <CopilotSuggestions
                    compact
                    onSelect={(value) => void askCopilot(value)}
                  />
                </div>
              ) : null}
              <form onSubmit={submit} className="mx-auto">
                <div className="flex items-end gap-2 rounded-xl border border-terminal-border bg-terminal-bg p-2 focus-within:border-terminal-accent/55">
                  <textarea
                    value={question}
                    onChange={(event) => setQuestion(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        void askCopilot(question);
                      }
                    }}
                    maxLength={500}
                    rows={2}
                    placeholder="Pergunte usando os dados internos…"
                    aria-label="Pergunta para o Institutional Copilot"
                    className="max-h-32 min-h-11 min-w-0 flex-1 resize-none bg-transparent px-2 py-2 text-sm leading-5 text-terminal-text placeholder:text-terminal-muted"
                  />
                  <button
                    type="submit"
                    disabled={!question.trim() || !knowledge || thinking}
                    className="grid size-10 shrink-0 place-items-center rounded-lg bg-terminal-accent font-bold text-terminal-bg transition hover:brightness-110 disabled:opacity-40"
                    aria-label="Enviar pergunta"
                  >
                    ↑
                  </button>
                </div>
                <p className="mt-2 text-center text-[10px] text-terminal-muted">
                  Enter envia · Shift+Enter quebra a linha · Respostas baseadas
                  somente nos indicadores citados.
                </p>
              </form>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
