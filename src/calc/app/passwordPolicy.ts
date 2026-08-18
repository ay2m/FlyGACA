/**
 * The sign-up password policy — the four rules and the strength score, in one
 * pure place so the sign-up form's validation and the `PasswordStrength` meter
 * can't drift apart (they each used to re-implement the same four regexes).
 * No DOM/i18n: the labels/colours live in the component.
 */

export type PasswordRuleId = 'length' | 'mixed' | 'number' | 'special';

/** The rules, in the order the strength meter lists them. */
export const PASSWORD_RULES: { id: PasswordRuleId; test: (v: string) => boolean }[] = [
  { id: 'length', test: (v) => v.length >= 8 },
  { id: 'mixed', test: (v) => /[a-z]/.test(v) && /[A-Z]/.test(v) },
  { id: 'number', test: (v) => /\d/.test(v) },
  { id: 'special', test: (v) => /[^A-Za-z0-9]/.test(v) },
];

/** Which rules a password meets, in display order. */
export function passwordRuleResults(password: string): { id: PasswordRuleId; met: boolean }[] {
  return PASSWORD_RULES.map((r) => ({ id: r.id, met: r.test(password) }));
}

/** True only when the password satisfies EVERY rule — the sign-up gate. */
export function meetsPasswordPolicy(password: string): boolean {
  return PASSWORD_RULES.every((r) => r.test(password));
}

/**
 * Strength score for the meter: `-1` empty, `0` when the length rule is unmet,
 * else graded by how many of the other three rules are met (0 → 1, 1–2 → 2,
 * 3 → 3). Preserves the exact banding the meter shipped with.
 */
export function passwordScore(password: string): number {
  if (!password) return -1;
  const results = passwordRuleResults(password);
  const lengthMet = results.find((r) => r.id === 'length')?.met;
  if (!lengthMet) return 0;
  const metCount = results.filter((r) => r.id !== 'length' && r.met).length;
  if (metCount === 0) return 1;
  if (metCount === 1 || metCount === 2) return 2;
  return 3;
}
