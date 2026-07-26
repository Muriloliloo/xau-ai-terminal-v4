const SAFE_MESSAGE_LIMIT = 180;
const SENSITIVE_MESSAGE =
  /(?:[a-z]:[\\/]|\/(?:home|users|var|tmp)\/|traceback|stack trace|\bat\s+\S+\s*\(|[\r\n<>])/i;

export function safeErrorMessage(
  reason: unknown,
  fallback = "Não foi possível concluir a operação.",
): string {
  const candidate =
    typeof reason === "string"
      ? reason
      : reason instanceof Error
        ? reason.message
        : null;
  const message = candidate?.trim();

  if (
    !message
    || message.length > SAFE_MESSAGE_LIMIT
    || SENSITIVE_MESSAGE.test(message)
  ) {
    return fallback;
  }
  return message;
}
