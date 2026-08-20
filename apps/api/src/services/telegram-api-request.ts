type TelegramApiResponse<T> = {
  ok?: boolean;
  description?: string;
  result?: T;
  parameters?: { retry_after?: number };
};

const MAX_ATTEMPTS = 3;

function requestTimeoutMs() {
  const configured = Number(process.env.TELEGRAM_API_TIMEOUT_MS || 10_000);
  return Number.isFinite(configured) ? Math.max(2_000, Math.min(30_000, configured)) : 10_000;
}

function pause(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Telegram Bot API transport shared by every Hope Hub bot. */
export async function callTelegramBotApi<T>(token: string, method: string, payload: unknown) {
  let lastError: unknown;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    try {
      const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(requestTimeoutMs())
      });
      const raw = await response.text();
      let body: TelegramApiResponse<T> = {};
      try {
        body = raw ? (JSON.parse(raw) as TelegramApiResponse<T>) : {};
      } catch {
        throw new Error(`Telegram ${method} returned an invalid response (${response.status}).`);
      }
      if (response.ok && body.ok) return body.result as T;

      const retryAfter = Number(body.parameters?.retry_after || 0);
      if (response.status === 429 && retryAfter > 0 && attempt < MAX_ATTEMPTS - 1) {
        // Keep webhook requests bounded. Longer waits are handled by the durable retry queue.
        if (retryAfter <= 5) {
          await pause((retryAfter + 1) * 1000);
          continue;
        }
      }
      if (response.status >= 500 && attempt < MAX_ATTEMPTS - 1) {
        await pause(250 * 2 ** attempt);
        continue;
      }
      const retryDetail = retryAfter ? ` Retry after ${retryAfter} seconds.` : '';
      throw new Error(
        `${body.description || `Telegram ${method} failed with status ${response.status}.`}${retryDetail}`
      );
    } catch (error) {
      lastError = error;
      const retryable =
        error instanceof TypeError ||
        (error instanceof Error && ['AbortError', 'TimeoutError'].includes(error.name));
      if (retryable && attempt < MAX_ATTEMPTS - 1) {
        await pause(250 * 2 ** attempt);
        continue;
      }
      throw error;
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error(`Telegram ${method} could not be completed.`);
}
