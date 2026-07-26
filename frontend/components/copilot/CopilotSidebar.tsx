"use client";

import { formatTimestamp } from "@/lib/formatters";
import type { CopilotConversation } from "@/types/copilot";

interface CopilotSidebarProps {
  conversations: CopilotConversation[];
  activeId: string | null;
  mobile?: boolean;
  onClose?: () => void;
  onCreate: () => void;
  onDelete: (id: string) => void;
  onSelect: (id: string) => void;
}

export function CopilotSidebar({
  conversations,
  activeId,
  mobile = false,
  onClose,
  onCreate,
  onDelete,
  onSelect,
}: CopilotSidebarProps) {
  return (
    <aside
      aria-label="Histórico do Copilot"
      className={`flex min-h-0 w-full flex-col border-terminal-border bg-terminal-sidebar ${
        mobile
          ? "h-full border-r"
          : "hidden min-h-[680px] max-w-[270px] rounded-l-xl border lg:flex"
      }`}
    >
      <div className="flex items-center justify-between gap-2 border-b border-terminal-border p-3">
        <div>
          <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-terminal-accent">
            Copilot
          </p>
          <p className="mt-0.5 text-xs font-semibold">Histórico</p>
        </div>
        {mobile ? (
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar histórico"
            className="grid size-8 place-items-center rounded-md border border-terminal-border text-terminal-muted"
          >
            ×
          </button>
        ) : null}
      </div>

      <div className="p-3">
        <button
          type="button"
          onClick={() => {
            onCreate();
            onClose?.();
          }}
          className="flex w-full items-center justify-center gap-2 rounded-md border border-terminal-accent/40 bg-terminal-accent/10 px-3 py-2 text-xs font-semibold text-terminal-accent transition-colors duration-150 hover:bg-terminal-accent/15"
        >
          <span aria-hidden>＋</span>
          Nova conversa
        </button>
      </div>

      <div className="min-h-0 flex-1 space-y-1 overflow-y-auto px-2 pb-3">
        {conversations.length ? (
          conversations.map((conversation) => {
            const active = conversation.id === activeId;
            return (
              <div
                key={conversation.id}
                className={`group flex items-start gap-1 rounded-md border p-1 ${
                  active
                    ? "border-terminal-accent/40 bg-terminal-accent/10"
                    : "border-transparent hover:bg-terminal-card"
                }`}
              >
                <button
                  type="button"
                  onClick={() => {
                    onSelect(conversation.id);
                    onClose?.();
                  }}
                  className="min-w-0 flex-1 px-2 py-1.5 text-left"
                  aria-current={active ? "page" : undefined}
                >
                  <span className="block truncate text-xs text-terminal-text">
                    {conversation.title}
                  </span>
                  <span className="mt-1 block font-mono text-[9px] text-terminal-muted">
                    {formatTimestamp(conversation.updatedAt)}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(conversation.id)}
                  aria-label={`Excluir conversa ${conversation.title}`}
                  className="grid size-7 shrink-0 place-items-center rounded text-terminal-muted opacity-70 transition-colors hover:bg-terminal-negative/10 hover:text-terminal-negative group-hover:opacity-100"
                >
                  ×
                </button>
              </div>
            );
          })
        ) : (
          <p className="px-3 py-6 text-center text-xs leading-5 text-terminal-muted">
            Suas conversas ficam salvas somente neste navegador.
          </p>
        )}
      </div>

      <div className="border-t border-terminal-border p-3">
        <p className="text-[10px] leading-4 text-terminal-muted">
          Knowledge Engine local · sem IA externa
        </p>
      </div>
    </aside>
  );
}
