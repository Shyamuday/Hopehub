import { describe, expect, it } from 'vitest';
import { authFailure } from './auth';

describe('authFailure', () => {
  it('shows the specific duplicate email failure and marks the email field', () => {
    const result = authFailure(
      {
        error: {
          code: 'EMAIL_IN_USE',
          message: 'This email is already connected to an account.',
        },
      },
      'Could not create provider account.',
    );

    expect(result.message).toBe('This email is already connected to an account.');
    expect(result.fieldErrors).toEqual({
      email: 'This email is already connected to an account. Sign in instead.',
    });
  });

  it('uses the helpful field message instead of the generic API validation message', () => {
    const result = authFailure(
      {
        error: {
          message: 'Validation failed',
          issues: [{ path: ['mobile'], message: 'Invalid mobile number' }],
        },
      },
      'Could not create provider account.',
    );

    expect(result.message).toBe('Enter a valid 10-digit Indian mobile number.');
    expect(result.fieldErrors['mobile']).toBe('Enter a valid 10-digit Indian mobile number.');
  });

  it('keeps a specific API failure when it is not tied to a field', () => {
    const result = authFailure(
      { error: { message: 'Signup is temporarily unavailable.' } },
      'Could not create provider account.',
    );

    expect(result.message).toBe('Signup is temporarily unavailable.');
    expect(result.fieldErrors).toEqual({});
  });

  it('uses the safe fallback when the API has no readable message', () => {
    const result = authFailure({}, 'Could not create provider account.');

    expect(result.message).toBe('Could not create provider account.');
    expect(result.fieldErrors).toEqual({});
  });
});
