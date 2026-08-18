import { useUrlState } from './useUrlState';

/**
 * Layered on useUrlState: keeps a set of string inputs in the URL and also
 * exposes them parsed as numbers (NaN when blank/invalid) so calculators don't
 * repeat parseFloat everywhere.
 */
export function useNumericInputs<T extends Record<string, string>>(
  defaults: T,
): {
  inputs: T;
  set: (key: keyof T, value: string) => void;
  nums: Record<keyof T, number>;
} {
  const [inputs, set] = useUrlState(defaults);
  const nums = {} as Record<keyof T, number>;
  for (const key of Object.keys(inputs) as (keyof T)[]) {
    nums[key] = parseFloat(inputs[key]);
  }
  return { inputs, set, nums };
}
