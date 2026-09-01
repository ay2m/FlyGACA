#!/usr/bin/env node
/**
 * Build and roll out the Cloud Run API.
 *
 * Two steps, because one is not available to us: `gcloud run deploy --source .`
 * only finds a Dockerfile at the source root and ours is `server/Dockerfile`
 * (see cloudbuild.yaml for why it has to stay there). So we build the image
 * explicitly, then point a new revision at it.
 *
 * This deliberately does NOT pass --set-env-vars or --set-secrets. Cloud Run
 * carries those forward from the previous revision, and re-specifying them here
 * would mean this script silently becomes the source of truth for prices and
 * secrets — with an omission landing as a live config change rather than an error.
 * Provisioning and config changes stay in docs/RUNBOOK-deploy.md §5.
 *
 *   PROJECT_ID=flygaca TAG=$(git rev-parse HEAD) node scripts/deploy-api.mjs [--dry-run]
 */
import { spawnSync } from 'node:child_process';
import { shellQuote } from './deploy-web.mjs';

// me-central2 (Dammam), never a US or me-central1 default: REGION picks the
// Artifact Registry host, the Cloud Build region and the Cloud Run region in one
// go, so an unset REGION would stand the API — and every request carrying learner
// data through it — up outside the Kingdom. Data residency is me-central2 only
// (CLAUDE.md, docs/RUNBOOK-golive.md §"Data residency"). deploy.yml passes REGION
// explicitly; this default is what a hand-run inherits.
const REGION = process.env.REGION ?? 'me-central2';
const REPO = process.env.ARTIFACT_REPO ?? 'flygaca';
const SERVICE = process.env.CLOUD_RUN_SERVICE ?? 'flygaca-api';
const TAG = process.env.TAG ?? 'latest';

/** Resolve the project id from the environment, falling back to the active gcloud config. */
function projectId() {
  if (process.env.PROJECT_ID) return process.env.PROJECT_ID;
  const res = spawnSync('gcloud', ['config', 'get-value', 'project'], { encoding: 'utf8' });
  const id = (res.stdout ?? '').trim();
  if (!id || id === '(unset)') {
    throw new Error('PROJECT_ID is unset and no active gcloud project is configured');
  }
  return id;
}

/** The ordered command plan. Pure given a project id, so it can be printed first. */
export function buildPlan(project) {
  const image = `${REGION}-docker.pkg.dev/${project}/${REPO}/${SERVICE}:${TAG}`;
  return [
    {
      label: `build ${image}`,
      argv: [
        'builds',
        'submit',
        '--config=cloudbuild.yaml',
        `--region=${REGION}`,
        `--substitutions=_REGION=${REGION},_REPO=${REPO},_SERVICE=${SERVICE},_TAG=${TAG}`,
        '.',
      ],
    },
    {
      label: `roll out ${SERVICE}`,
      argv: ['run', 'deploy', SERVICE, `--region=${REGION}`, `--image=${image}`],
    },
  ];
}

function main() {
  const dryRun = process.argv.includes('--dry-run');
  // In a dry run, never shell out just to discover the project id.
  const project = dryRun ? (process.env.PROJECT_ID ?? '<project>') : projectId();

  for (const { label, argv } of buildPlan(project)) {
    console.log(`\n▸ ${label}`);
    console.log(`  gcloud ${shellQuote(argv)}`);
    if (dryRun) continue;

    const res = spawnSync('gcloud', argv, { stdio: 'inherit' });
    if (res.error?.code === 'ENOENT') {
      console.error(
        '\ngcloud is not on PATH. Install the SDK: https://cloud.google.com/sdk/docs/install',
      );
      process.exit(1);
    }
    if (res.status !== 0) process.exit(res.status ?? 1);
  }

  console.log(dryRun ? '\nDry run — nothing was built or deployed.' : '\nDeployed.');
}

if (process.argv[1] && process.argv[1].endsWith('deploy-api.mjs')) main();
