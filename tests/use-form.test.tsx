/**
 * src/hooks/useForm.ts — form field state, validation timing, and submission.
 * Covers validate-on-blur, validate-after-touch, submit gating + focus-first-invalid,
 * the isSubmitting lifecycle, and resetForm. renderHook idiom per fetch-hooks.test.tsx.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useForm } from '@/hooks/useForm';

interface LoginValues extends Record<string, unknown> {
  email: string;
  password: string;
}

const initialValues: LoginValues = { email: '', password: '' };
const validate = (v: LoginValues) => {
  const errors: Partial<Record<keyof LoginValues, string>> = {};
  if (!v.email) errors.email = 'Email required';
  if (v.password.length < 6) errors.password = 'Too short';
  return errors;
};

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('useForm — field state', () => {
  it('seeds from initialValues', () => {
    const { result } = renderHook(() => useForm<LoginValues>({ initialValues, onSubmit: vi.fn() }));
    expect(result.current.values).toEqual({ email: '', password: '' });
    expect(result.current.errors).toEqual({});
    expect(result.current.isSubmitting).toBe(false);
  });

  it('setFieldValue updates a value without validating until the field is touched', () => {
    const { result } = renderHook(() =>
      useForm<LoginValues>({ initialValues, validate, onSubmit: vi.fn() }),
    );
    act(() => result.current.setFieldValue('password', 'ab'));
    expect(result.current.values.password).toBe('ab');
    // Not touched yet → no error surfaced.
    expect(result.current.errors.password).toBeUndefined();
  });
});

describe('useForm — validation timing', () => {
  it('handleBlur marks the field touched and surfaces its error', () => {
    const { result } = renderHook(() =>
      useForm<LoginValues>({ initialValues, validate, onSubmit: vi.fn() }),
    );
    act(() => result.current.handleBlur('email'));
    expect(result.current.touched.email).toBe(true);
    expect(result.current.errors.email).toBe('Email required');
  });

  it('re-validates a touched field on change and clears the error when fixed', () => {
    const { result } = renderHook(() =>
      useForm<LoginValues>({ initialValues, validate, onSubmit: vi.fn() }),
    );
    act(() => result.current.handleBlur('password'));
    expect(result.current.errors.password).toBe('Too short');
    act(() => result.current.setFieldValue('password', 'longenough'));
    expect(result.current.errors.password).toBeUndefined();
  });
});

describe('useForm — submission', () => {
  it('blocks submit while invalid, marks all fields touched, and focuses the first invalid input', async () => {
    const onSubmit = vi.fn();
    // The hook focuses document.getElementsByName(firstInvalid)[0] — provide one.
    const emailInput = document.createElement('input');
    emailInput.setAttribute('name', 'email');
    document.body.appendChild(emailInput);

    const { result } = renderHook(() =>
      useForm<LoginValues>({ initialValues, validate, onSubmit }),
    );
    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(onSubmit).not.toHaveBeenCalled();
    expect(result.current.touched).toEqual({ email: true, password: true });
    expect(result.current.errors.email).toBe('Email required');
    expect(document.activeElement).toBe(emailInput);
  });

  it('calls onSubmit with the values and toggles isSubmitting around an async submit', async () => {
    let resolve!: () => void;
    const onSubmit = vi.fn(() => new Promise<void>((r) => (resolve = r)));
    const valid: LoginValues = { email: 'a@b.com', password: 'longenough' };
    const { result } = renderHook(() =>
      useForm<LoginValues>({ initialValues: valid, validate, onSubmit }),
    );

    let submitPromise!: Promise<void>;
    act(() => {
      submitPromise = result.current.handleSubmit();
    });
    expect(result.current.isSubmitting).toBe(true);

    await act(async () => {
      resolve();
      await submitPromise;
    });
    expect(onSubmit).toHaveBeenCalledWith(valid);
    expect(result.current.isSubmitting).toBe(false);
  });

  it('preventDefault is called when a form event is passed', async () => {
    const onSubmit = vi.fn();
    const valid: LoginValues = { email: 'a@b.com', password: 'longenough' };
    const { result } = renderHook(() => useForm<LoginValues>({ initialValues: valid, onSubmit }));
    const preventDefault = vi.fn();
    await act(async () => {
      await result.current.handleSubmit({ preventDefault } as unknown as React.FormEvent);
    });
    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });
});

describe('useForm — resetForm', () => {
  it('restores initial values and clears errors/touched', () => {
    const { result } = renderHook(() =>
      useForm<LoginValues>({ initialValues, validate, onSubmit: vi.fn() }),
    );
    act(() => result.current.setFieldValue('email', 'x@y.com'));
    act(() => result.current.handleBlur('password'));
    expect(result.current.errors.password).toBe('Too short');

    act(() => result.current.resetForm());
    expect(result.current.values).toEqual(initialValues);
    expect(result.current.errors).toEqual({});
    expect(result.current.touched).toEqual({});
    expect(result.current.isSubmitting).toBe(false);
  });
});
