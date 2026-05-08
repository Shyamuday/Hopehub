export function logAuthEvent(
  event:
    | 'staff_login_success'
    | 'staff_login_failure'
    | 'supabase_exchange'
    | 'patient_password_login_success'
    | 'patient_password_login_failure'
    | 'patient_password_login_fallback',
  details: Record<string, unknown>
) {
  console.info(`[auth] ${event}`, {
    at: new Date().toISOString(),
    ...details
  });
}
