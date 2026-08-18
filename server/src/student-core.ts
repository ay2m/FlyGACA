/**
 * Student-rate eligibility — pure, testable policy for the discounted Pro tier.
 * v1 verifies a student by a VERIFIED academic email (the same ownership proof the
 * staff grant uses); an ID / SheerID-style flow can layer on later. The email must
 * be verified so the discount can't be claimed with an address you don't control.
 */

/**
 * Whether `email` is an academic address eligible for the student rate. Requires
 * `emailVerified`. Accepts the common academic shapes — `.edu`, `.ac`, and their
 * country variants (`.edu.sa`, `.ac.sa`, `.ac.uk`, `.edu.au`, …) — so most Saudi
 * university and international student mailboxes qualify. Add bespoke institution
 * domains here if they don't fit the pattern.
 */
export function isStudentEmail(
  email: string | null | undefined,
  emailVerified: boolean | undefined,
): boolean {
  if (!emailVerified || !email) return false;
  const e = email.trim().toLowerCase();
  const at = e.lastIndexOf("@");
  if (at <= 0) return false;
  const domain = e.slice(at + 1);
  return /(^|\.)(edu|ac)(\.[a-z]{2})?$/.test(domain);
}
