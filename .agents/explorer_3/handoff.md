# Mathematical Specification & Architecture Report: 5-Factor Health Score (H) & Exam Pass Probability (P) Engine

## 1. Observation
- StudyState in `src/lib/studyProgress.ts` collects `quizBest`, `gsDone`, `fcSrs`, `streak`, `exam`, `examHistory`.
- `toProgressSummary()` exposes compact study projection for Firestore sync to `users/{uid}/progress/summary`.
- Leitner spaced repetition is implemented in `src/calc/study/srs.ts` (boxes 0..5, intervals [0, 1, 3, 7, 14, 30]) and `src/calc/study/glidePath.ts` (`glideProgress`, `masteredCount`).
- Existing backend in `functions/src/school-core.ts` has `schoolReadiness` (binary coveredBanks === totalBanks && examBest >= threshold).
- Current `getCohortReadiness` in `functions/src/org.ts` performs N+1$ Firestore document reads per invocation.
- GACA exam standard passing mark is 75%.

---

## 2. Logic Chain

### 2.1 Customer Health Score (H) Formulation
 \in [0, 100]$ is a weighted composite score designed for ATO Directors and Instructors:
17682H = 	ext{clamp}_{[0, 100]}\left( \sum_{i=1}^5 w_i \cdot F_i - \Pi ight)17682
with weights:
- $: Platform Engagement & Activity Recency ( = 0.20$)
  - {1,	ext{recency}} = 100 \cdot \exp(-\Delta t_{	ext{last}} / 7.0)$
  - {1,	ext{frequency}} = \min(100, (N_{	ext{days\_active\_30d}} / 15) 	imes 100)$
  -  = 0.60 \cdot F_{1,	ext{recency}} + 0.40 \cdot F_{1,	ext{frequency}}$
- $: Syllabus Completion Velocity ( = 0.25$)
  - {	ext{bank}} = (B_{	ext{covered}} / B_{	ext{total}}) 	imes 100$
  - {	ext{gs}} = (G_{	ext{done}} / G_{	ext{total}}) 	imes 100$
  - {	ext{srs}} = (M_{	ext{learned}} / M_{	ext{total}}) 	imes 100$
  -  = 0.50 \cdot S_{	ext{bank}} + 0.30 \cdot S_{	ext{gs}} + 0.20 \cdot S_{	ext{srs}}$
- $: Mock Exam Mastery & Score Quality ( = 0.25$)
  - Linear attempt weighting for last  \le 5$ attempts: $ar{E}_{	ext{weighted}} = rac{\sum_{k=1}^K k \cdot E_k}{\sum_{k=1}^K k}$
  -  = 	ext{clamp}_{[0, 100]}(0.40 \cdot E_{	ext{best}} + 0.40 \cdot ar{E}_{	ext{weighted}} + 0.20 \cdot (	ext{PassRate} 	imes 100))$
- $: Study Consistency & Habit Streak ( = 0.15$)
  - {4,	ext{streak}} = \min(100, rac{\ln(1 + L_{	ext{streak}})}{\ln(1 + 14)} 	imes 100)$
  - {4,	ext{discipline}} = 100 \cdot (1 - 0.70 \cdot R_{	ext{overdue\_ratio}})$
  -  = 0.70 \cdot F_{4,	ext{streak}} + 0.30 \cdot F_{4,	ext{discipline}}$
- $: Instructor Risk Assessment & Remediation ( = 0.15$)
  - Deductions: {	ext{flags}} = \min(30, Q_{	ext{flags}} 	imes 3)$, {	ext{fails}} = \min(40, N_{	ext{fails}} 	imes 15)$, {	ext{stag}} = \min(30, \max(0, \Delta t_{	ext{stag}} - 14) 	imes 2)$
  - {5,	ext{obj}} = \max(0, 100 - D_{	ext{flags}} - D_{	ext{fails}} - D_{	ext{stag}})$
  - Optional instructor rating  \in [1, 5]$:  = 0.60 \cdot F_{5,	ext{obj}} + 0.40 \cdot (R / 5 	imes 100)$

#### Health Tier Categorization:
- **Champion** ( \le H \le 100$): Green / Exam Ready.
- **Healthy** ( \le H < 80$): Blue / On Track.
- **At Risk** ( \le H < 60$): Amber / Remedial Nudge.
- **Critical** (zsh \le H < 40$): Red / Urgent CFI Intervention.

---

### 2.2 Cadet Mock Exam Pass Probability (P) Formulation
Multivariate calibrated logistic regression model:
17682P = \sigma(z) = rac{1}{1 + e^{-z}}17682
17682z = -0.30 + 1.45 \cdot x_{	ext{score}} + 1.10 \cdot x_{	ext{cov}} + 0.50 \cdot x_{	ext{trend}} + 0.60 \cdot x_{	ext{srs}} + 0.35 \cdot x_{	ext{time}} - 0.40 \cdot x_{	ext{vol}}17682
where:
- {	ext{score}} = (ar{S}_{	ext{EWMA}} - 75) / 10$ (EWMA $lpha = 0.40$)
- {	ext{cov}} = ((B_{	ext{covered}} / B_{	ext{total}}) - 0.80) / 0.20$
- {	ext{trend}} = 	ext{clamp}_{[-2, 2]}(	ext{slope} / 5.0)$
- {	ext{srs}} = (R_{	ext{mastery}} - 0.50) / 0.25$
- {	ext{time}} = 0.5 - 	ext{penalties for rushing/timing-out}$
- {	ext{vol}} = \min(2.0, \sigma_{	ext{scores}} / 15.0)$

Readiness Tiers:
- **Ready** ( \ge 0.85$): CFI Endorsement.
- **Near Ready** (zsh.70 \le P < 0.85$): Targeted Practice.
- **Not Ready** ( < 0.70$): Remedial Ground School.

---

### 2.3 Pre-Aggregated Cohort Summary Engine
- Location: `schools/{schoolId}/analytics/summary`
- Reduces Firestore reads from (N)$ (N+1$ reads) to (1)$ (1 read).
- Precomputes cohort health average $ar{H}$, average pass probability $ar{P}$, tier distributions, weak banks, and at-risk cadet UID alerts.

---

## 3. Implementation Layout & Files
1. `src/calc/analytics/healthScore.ts` (Pure calculation, client/shared)
2. `src/calc/analytics/passProbability.ts` (Pure calculation, client/shared)
3. `functions/src/analytics-core.ts` (Backend pure aggregation engine)
4. `tests/health-score.test.ts` & `tests/pass-probability.test.ts` (Vitest test suites)
5. `functions/tests/analytics-core.test.ts` (Backend unit test suite)

---

## 4. Caveats & Verification
- Non-finite numbers are guarded via `src/calc/guards.ts` (`fin`, `ok`).
- Cadet data without PDPL consent (`consent: false`) is masked in granular roster views while retained in aggregate statistics.
- Independent verification via `npx vitest run` and `npm run typecheck`.
