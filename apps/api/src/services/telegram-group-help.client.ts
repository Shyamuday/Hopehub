export function groupHelpBotToken() {
  return (
    process.env.TELEGRAM_HOPEHUBBOT_TOKEN?.trim() ||
    process.env.TELEGRAM_GROUP_HELP_BOT_TOKEN?.trim() ||
    ''
  );
}

export async function callGroupHelpTelegramApi<T>(method: string, payload: unknown): Promise<T> {
  const token = groupHelpBotToken();
  if (!token) throw new Error('TELEGRAM_HOPEHUBBOT_TOKEN is not configured.');

  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const body = (await response.json()) as { ok?: boolean; description?: string; result?: T };
  if (!response.ok || !body.ok) {
    throw new Error(body.description || `Telegram ${method} failed.`);
  }
  return body.result as T;
}

export function groupHelpBotStatus() {
  return {
    kind: 'GROUP_HELP',
    slug: 'group-help',
    name: 'Hope Hub AI Group Help Bot',
    username: '@Hopehubaibot',
    configured: Boolean(groupHelpBotToken()),
    tokenEnv: 'TELEGRAM_HOPEHUBBOT_TOKEN',
    runtime: 'external-group-help' as const,
    externallyManaged: true
  };
}

export function getGroupHelpWebhookInfo() {
  return callGroupHelpTelegramApi('getWebhookInfo', {});
}
