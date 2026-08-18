/**
 * Dynamic hydroplaning speed from tyre pressure — the NASA/Horne relation for a
 * rotating tyre, Vp ≈ 9·√P (kt, P in psi). A rough planning aid; real hydroplaning
 * onset depends on water depth, tyre wear and surface.
 */
export function hydroplaningSpeed(tyrePsi: number): number | null {
  if (!Number.isFinite(tyrePsi) || tyrePsi <= 0) return null;
  return 9 * Math.sqrt(tyrePsi);
}
