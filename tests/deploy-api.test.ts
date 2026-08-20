import { describe, expect, it } from 'vitest';
// @ts-expect-error — plain ESM script, no types; exercised for its pure planners.
import { buildPlan, describeArgv } from '../scripts/deploy-api.mjs';

/**
 * `scripts/deploy-api.mjs` shells out to gcloud, so only its pure parts are
 * testable here. Those are the parts that go wrong silently: an image tag the
 * build never produced, or a rollout that creates a service instead of updating
 * one. Both fail as a GREEN deploy serving nothing.
 */

type Step = { label: string; argv: string[] };


describe('buildPlan', () => {
  it('builds and rolls out the same image tag', () => {
    // The build step pushes a tag and the rollout points at one. If they drift,
    // `gcloud run deploy` fails on an image that does not exist — or worse,
    // succeeds against a stale `:latest` and ships the previous revision's code.
    const plan: Step[] = buildPlan('proj');
    const build = plan.find((s) => s.argv[1] === 'submit');
    const rollout = plan.find((s) => s.argv[1] === 'deploy');

    expect(build?.argv).toContain('--substitutions=_REGION=me-central2,_REPO=flygaca,_SERVICE=flygaca-api,_TAG=latest');
    expect(rollout?.argv).toContain(
      '--image=me-central2-docker.pkg.dev/proj/flygaca/flygaca-api:latest',
    );
  });

  it('builds from the repo root via cloudbuild.yaml, not --source', () => {
    // Cloud Run's source deploys only honour a Dockerfile at the source root, and
    // ours is server/Dockerfile because it COPYs the corpus from public/data.
    const plan: Step[] = buildPlan('proj');
    const build = plan.find((s) => s.argv[1] === 'submit');
    expect(build?.argv).toContain('--config=cloudbuild.yaml');
    expect(build?.argv.at(-1)).toBe('.');
    expect(plan.some((s) => s.argv.includes('--source'))).toBe(false);
  });

  it('passes no env vars or secrets, so a rollout cannot clobber revision config', () => {
    // Cloud Run carries env and secrets forward from the previous revision. If
    // this script named any of them, an omission here would land as a live config
    // change rather than an error — silently dropping a secret in production.
    const flat = (buildPlan('proj') as Step[]).flatMap((s) => s.argv).join(' ');
    expect(flat).not.toMatch(/--set-env-vars|--update-env-vars|--set-secrets/);
  });
});

describe('describeArgv', () => {
  it('scopes the existence check to the exact service, region and project', () => {
    // The preflight this feeds exists because `gcloud run deploy` CREATES a
    // missing service — in CI, non-interactively, with only --region and --image.
    // The result boots without DATABASE_URL and fails assertRequiredConfig(),
    // while the deploy step exits 0. A check scoped to the wrong project or
    // region would pass against the wrong service and defeat the point.
    expect(describeArgv('proj')).toEqual([
      'run',
      'services',
      'describe',
      'flygaca-api',
      '--region=me-central2',
      '--project=proj',
      '--format=value(name)',
    ]);
  });

  it('is a read-only describe — it must never mutate anything', () => {
    const argv: string[] = describeArgv('proj');
    expect(argv).toContain('describe');
    expect(argv).not.toContain('deploy');
    expect(argv).not.toContain('update');
  });
});
