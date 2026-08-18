export function isProviderDisplayName(value: string | null | undefined): boolean {
  const name = String(value || '').trim();
  return name.length >= 2 && name.length <= 80 && /[\p{L}]/u.test(name);
}

export function isStrongProviderPassword(value: string | null | undefined): boolean {
  const password = String(value || '');
  return (
    password.length >= 8 &&
    password.length <= 128 &&
    /[A-Za-z]/.test(password) &&
    /\d/.test(password)
  );
}
