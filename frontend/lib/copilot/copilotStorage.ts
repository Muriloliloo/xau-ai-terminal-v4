import {
  KNOWLEDGE_INDICATORS,
  type CopilotAnswer,
  type CopilotAnswerSection,
  type CopilotConversation,
  type CopilotMessage,
  type KnowledgeCitation,
  type KnowledgeIndicator,
} from "@/types/copilot";

export const COPILOT_HISTORY_STORAGE_KEY = "xau-terminal.copilot-history.v1";
const MAX_CONVERSATIONS = 20;
const MAX_MESSAGES = 100;
const MAX_MESSAGE_LENGTH = 5_000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function safeText(value: unknown, maxLength = MAX_MESSAGE_LENGTH): string | null {
  return typeof value === "string" && value.trim()
    ? value.trim().slice(0, maxLength)
    : null;
}

function safeDate(value: unknown): string | null {
  const text = safeText(value, 64);
  if (!text || Number.isNaN(new Date(text).getTime())) return null;
  return text;
}

function normalizeCitation(value: unknown): KnowledgeCitation | null {
  if (!isRecord(value)) return null;
  const indicator = safeText(value.indicator, 64) as KnowledgeIndicator | null;
  const detail = safeText(value.detail, 300);
  if (
    !indicator
    || !KNOWLEDGE_INDICATORS.includes(indicator)
    || !detail
  ) {
    return null;
  }
  return { indicator, detail };
}

function normalizeSection(value: unknown): CopilotAnswerSection | null {
  if (!isRecord(value)) return null;
  const title = safeText(value.title, 100);
  const content = Array.isArray(value.content)
    ? value.content
        .map((item) => safeText(item, 1_000))
        .filter((item): item is string => item !== null)
        .slice(0, 20)
    : [];
  return title && content.length ? { title, content } : null;
}

function normalizeAnswer(value: unknown): CopilotAnswer | undefined {
  if (!isRecord(value)) return undefined;
  const summary = safeText(value.summary);
  const generatedAt = safeDate(value.generatedAt);
  const status =
    value.status === "answered" || value.status === "insufficient"
      ? value.status
      : null;
  if (!summary || !generatedAt || !status) return undefined;

  const sections = Array.isArray(value.sections)
    ? value.sections
        .map(normalizeSection)
        .filter((item): item is CopilotAnswerSection => item !== null)
        .slice(0, 12)
    : [];
  const citations = Array.isArray(value.citations)
    ? value.citations
        .map(normalizeCitation)
        .filter((item): item is KnowledgeCitation => item !== null)
        .slice(0, KNOWLEDGE_INDICATORS.length)
    : [];
  return { status, summary, sections, citations, generatedAt };
}

function normalizeMessage(value: unknown): CopilotMessage | null {
  if (!isRecord(value)) return null;
  const id = safeText(value.id, 100);
  const content = safeText(value.content);
  const createdAt = safeDate(value.createdAt);
  const role =
    value.role === "user" || value.role === "assistant" ? value.role : null;
  if (!id || !content || !createdAt || !role) return null;

  return {
    id,
    role,
    content,
    createdAt,
    answer: role === "assistant" ? normalizeAnswer(value.answer) : undefined,
  };
}

function normalizeConversation(value: unknown): CopilotConversation | null {
  if (!isRecord(value)) return null;
  const id = safeText(value.id, 100);
  const title = safeText(value.title, 80);
  const createdAt = safeDate(value.createdAt);
  const updatedAt = safeDate(value.updatedAt);
  if (!id || !title || !createdAt || !updatedAt) return null;

  const messages = Array.isArray(value.messages)
    ? value.messages
        .map(normalizeMessage)
        .filter((item): item is CopilotMessage => item !== null)
        .slice(-MAX_MESSAGES)
    : [];
  return { id, title, createdAt, updatedAt, messages };
}

export function normalizeCopilotHistory(
  value: unknown,
): CopilotConversation[] {
  if (!Array.isArray(value)) return [];
  const unique = new Map<string, CopilotConversation>();
  value
    .map(normalizeConversation)
    .filter((item): item is CopilotConversation => item !== null)
    .slice(-MAX_CONVERSATIONS)
    .forEach((conversation) => unique.set(conversation.id, conversation));
  return [...unique.values()].sort((left, right) =>
    right.updatedAt.localeCompare(left.updatedAt),
  );
}

function uniqueId(): string {
  return globalThis.crypto?.randomUUID?.()
    ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function createCopilotConversation(): CopilotConversation {
  const now = new Date().toISOString();
  return {
    id: uniqueId(),
    title: "Nova conversa",
    createdAt: now,
    updatedAt: now,
    messages: [],
  };
}

export function createCopilotMessage(
  role: CopilotMessage["role"],
  content: string,
  answer?: CopilotAnswer,
): CopilotMessage {
  return {
    id: uniqueId(),
    role,
    content: content.trim().slice(0, MAX_MESSAGE_LENGTH),
    createdAt: new Date().toISOString(),
    answer,
  };
}

export function titleFromQuestion(question: string): string {
  const normalized = question.trim().replace(/\s+/g, " ");
  return normalized.length > 46
    ? `${normalized.slice(0, 43)}…`
    : normalized || "Nova conversa";
}
