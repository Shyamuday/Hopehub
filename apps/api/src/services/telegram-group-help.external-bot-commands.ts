/** Commands explicitly addressed to SangMata, using either supported Telegram syntax. */
export function isSangMataCommand(text: string | null | undefined) {
  const normalized = (text || '').normalize('NFKC').trim();
  return (
    /^@sangmata_bot(?:\s|$)/i.test(normalized) ||
    /^\/[a-z0-9_]+@sangmata_bot(?:\s|$)/i.test(normalized)
  );
}
