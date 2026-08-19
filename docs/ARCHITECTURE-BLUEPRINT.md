# Fly GACA — Strategic Architecture & Technical Blueprint

> ⚠️ **Restored from `ay2m/FlyGACA-app` history, predating the Cloud Run rebuild.**
> Parts of this document still describe the retired Firebase / Firestore / App Check /
> Stripe stack. The live architecture is an Express service on **Cloud Run** backed by
> **Cloud SQL**, billed through **Moyasar** — see `CLAUDE.md`. Anything Firebase- or
> Stripe-specific below is history, not the system. The `apple/` tree it may reference
> was retired; the iOS family lives in `ay2m/FlyGACA-ios`.

The one-page-tall map of the whole platform: how the **brain**, the **web app +
backend**, and the **native iOS family** fit together, what we deliberately chose
(and rejected), and where it's going. This is the connective-tissue doc — every
section links to the deep design/runbook that owns the detail. When this and a
linked doc disagree, **the linked doc wins**; open a PR to fix this one.

> Fly GACA is an independent, educational platform for Saudi civil aviation. It
> is **not affiliated with GACA** — it helps you find and study the regulation
> and always cites the exact Part/section; it never replaces the regulator. That
> posture is load-bearing across every surface below.

**Canonical deep docs (the sources of truth this summarizes):**

- iOS family architecture → `ay2m/FlyGACA`'s `apple/ARCHITECTURE.md` (separate repo)
- Captain Adel RAG backend → [`docs/DESIGN-genkit-rag-backend.md`](./DESIGN-genkit-rag-backend.md)
- App family lineup → [`docs/APPS-FAMILY-ROADMAP.md`](./APPS-FAMILY-ROADMAP.md)
- App Store strategy & pricing → [`docs/STORE-SUITE.md`](./STORE-SUITE.md)
- Billing / entitlements → [`docs/BILLING.md`](./BILLING.md)
- Deploy / hosting → [`docs/RUNBOOK-deploy.md`](./RUNBOOK-deploy.md) · [`docs/DATA-HOSTING.md`](./DATA-HOSTING.md)
- The standalone brain (captadel.com + Fly GACA API) → the **Captain-Adel** repo

---

## 0. The whole platform on one screen

```
                         ┌────────────────────────────────────────────┐
   Regulatory corpus ───►│  CONTENT PIPELINE  (scripts/, docs-parser)  │
   (GACAR, charts)       │  sync:gaca → data:normalize → build:*       │
                         └───────────────┬────────────────────────────┘
                          public/data/*.json  (one schema, shipped everywhere)
             ┌───────────────────────────┼───────────────────────────┐
             ▼                           ▼                           ▼
   ┌──────────────────┐     ┌────────────────────────┐     ┌───────────────────┐
   │  WEB APP (React) │     │  BACKEND (functions/)  │     │  iOS FAMILY        │
   │  Vite + TS SPA   │◄───►│  Firebase Functions    │◄───►│  FlyGACAKit (Swift)│
   │  library, tools, │ /api│  · chat gateway (SSE)  │ /api│  ELPT · AIP        │
   │  study, chat,    │     │  · Captain Adel (Genkit│     │  App Store apps    │
   │  account, B2B    │     │    + Gemini RAG brain) │     │  apps (paid, offline)│
   └──────────────────┘     │  · Stripe · B2B org    │     └───────────────────┘
                            │  · Firestore (KSA)     │
                            └────────────────────────┘
```

**One corpus, one schema, three clients.** The regulatory JSON in `public/data/`
is decoded by the web app at runtime, retrieved by the backend brain for RAG, and
sliced per-module into each iOS app at build time. Field names never diverge —
that's what stops the three clients from drifting.

**One brain, server-owned.** Captain Adel is a backend concern. The web and iOS
clients are thin `/api/chat` SSE consumers; neither embeds a model, a vector
store, or retrieval logic. This is the single most important boundary in the
system — see §2.

---

## 1. The three clients

### 1a. Web app — the reference product (this repo, `src/`)

Vite + TypeScript (strict) SPA. `src/router.tsx` is the single route table; pages
are lazy-loaded one-per-folder. Aviation math is pure and DOM-free in `src/calc/*`
(unit-tested); services are typed and grouped in `src/lib/`; the corpus is fetched
at runtime (never bundled). Bilingual + RTL is first-class (`src/i18n/`), and the
disclaimer ships as one `<Disclaimer />` component that never drifts. It is
**local-first**: with no Firebase configured, every cloud-gated service degrades to
a no-op and the app stays fully usable offline. See the repo [`CLAUDE.md`](../CLAUDE.md).

### 1b. Backend — gateway + brain (this repo, `functions/`)

Firebase Cloud Functions, deployed to `me-central1`. Every business rule lives in a
pure, Firebase-free `*-core.ts` module (unit-testable); the Express/Firestore
wrappers stay thin. It owns: the `/api/chat` + `/api/feedback` gateway (auth, App
Check, rate limiting, free daily quota, SSE), the Captain Adel Genkit+Gemini RAG
flow, Stripe billing (`stripeWebhook`), and the B2B org callables. `entitlement` is
**server-owned** — written only by Cloud Functions via the Admin SDK, never by any
client. See §2 and [`docs/DESIGN-genkit-rag-backend.md`](./DESIGN-genkit-rag-backend.md).

### 1c. iOS family — one package, one app per certificate (`ay2m/FlyGACA`)

Swift 5.9+, SwiftUI, **SwiftData**, iOS 17+. MVVM with light Clean layering,
delivered as **one** local Swift package (`FlyGACAKit`) with six library targets in
a strict dependency direction:

```
CoreModels ← StudyEngines / ContentKit / AppServices ← PersistenceKit ← FeatureUI ← app shells
```

Engines do no IO (they take `now: Date` as a parameter, so `swift test` needs no
simulator and no SDK). Firebase/RevenueCat are quarantined in a future
`PlatformLive` target and never leak upstream; until then, offline mocks are the
shipping product. A new certificate app is **data, not code**: emit its content
slice (here, via `build-ios-content.mjs`) and duplicate a ~20-line shell (there) — zero new
views, zero new engine work. The native code lives in the separate `ay2m/FlyGACA` repo; this
monorepo generates its content. Full target graph, rules, and rationale in that repo's
`apple/ARCHITECTURE.md`.

---

## 2. Captain Adel — accuracy is the architecture

Aviation regulation is unforgiving: a hallucinated citation is a defect, not a
rough edge. The design makes accuracy a **property of the pipeline**, not a hope
about the model.

**The load-bearing boundary: the brain is server-owned; clients are thin.** The
Gemini-powered Genkit flow, retrieval, and grounding all live behind the `/api/chat`
gateway in `functions/`. The web app (`src/lib/api.ts`) and the iOS app
(`AppServices.ChatClient`) only open an SSE stream and render tokens. This is what
lets us fix retrieval, swap the model tier, or tighten grounding **once**, on the
server, and have every client inherit it — and it keeps user questions (personal
data under PDPL) inside the in-Kingdom backend.

**How accuracy is enforced** (see the design doc §D0–D3):

1. **Single vendor, tiered by turn.** One model family (Gemini). The request's
   `provider` field selects a *tier* — `flash` for normal turns, `pro` for
   hard/long-context — not a different vendor. No multi-vendor abstraction to rot.
2. **Retrieve-then-read over the shipped corpus.** v1 retrieval is a **lexical/BM25
   index over the corpus the app already ships** (`public/data/`), returning chunks
   that carry `{ part, section, url, verbatim, corpusVersion }` so every citation is
   exact and deterministic — no new infra. A managed vector store (Vertex AI Vector
   Search + Gemini embeddings) is the documented upgrade path **only if** lexical
   recall proves short; the retriever interface is the seam that swap hides behind.
3. **The grounding verdict is computed, not asked-for-politely.** A deterministic
   post-step classifies each answer: `grounded` (claims map to ≥1 retrieved
   passage), `partial` (some claims uncited), `refusal` (no adequate passage → the
   cite-the-rule refusal + `refusalClass`), or `na` (small-talk). The badge stays
   honest even when the model is over-confident.
4. **Refuse over guess.** No adequate passage ⇒ a structured refusal that points the
   pilot back to the exact rule / their CFI / GACA — never a speculative answer on
   safety-critical material.

The standalone **Captain-Adel** repo is the same brain packaged independently
(captadel.com + a server-to-server API); it and this backend share the retrieve →
ground → cite contract so answers can't diverge between products.

---

## 3. Data & offline strategy

The corpus is **small and read-only** — the whole 13-bank study corpus is ~158 KB,
and the regulatory library is static JSON. So the storage strategy is deliberately
plain, not a tiered document-sync engine:

- **Content is shipped, not synced from a mutable store.** Web fetches
  `public/data/*` at runtime (network-first in prod, service-worker cached);
  iOS bundles a per-module slice copied **verbatim** from the same JSON so the wire
  schema *is* the web schema. The one heavy asset — `library-search.json` (~19 MB) —
  stays lazy/streamed, as in the legacy app.
- **User state is client-first.** Web: `src/lib/studyProgress.ts` is the source of
  truth, with an upload-only backup feeding B2B readiness. iOS: **SwiftData** in an
  App Group container (`group.com.flygaca.study`) so streaks/SRS/attempts are shared
  by every family app on the device; a `StudyStore` `@ModelActor` is the single write
  path.
- **Cross-platform parity is a tested contract.** SRS (`src/calc/study/srs.ts` ⇄ the
  Swift `Leitner` port), exam scoring, and streaks are literal ports with parity
  vectors in the Swift test suite — if a vector fails, the platforms have diverged.
  Due dates are UTC day-strings on both sides to dodge timezone drift.

The corpus's one structural weakness — the web keys progress by array index, so it
has **no stable question ids** — is fixed at decode time on iOS: every `Question`
gets `id = sha256("bankID|prompt")[..16]`, which survives reordering and lets SRS
state reconcile across content refreshes.

---

## 4. Monetization & product tiers

Two products, two proven models — **neither is a monthly per-feature ladder**:

- **Web (flygaca.com):** free, local-first core; a one-time **exam-prep pack**
  (`PREP_PACK_PRICE` = **39 SAR**), plus Stripe subscription tiers and B2B org seats
  for schools. Entitlement is server-owned and read-only to the client; enforcement
  lives in the gateway (`functions/`), the app only gates UI. See
  [`docs/BILLING.md`](./BILLING.md).
- **iOS family:** **paid-up-front**, one app per certificate, priced at the web pack
  tier (39 SAR), sold together as an App Store **bundle**. Chosen deliberately:
  Apple bundles require paid apps (or free + auto-renewable subscription), and
  paid-up-front keeps each app **IAP-free, offline, and account-free** — buying the
  app *is* the entitlement (`FullAccess` is the shipping default, not a stub). A
  free + one-time-IAP model is documented as a **reversible fallback**, not built.
  See [`docs/STORE-SUITE.md`](./STORE-SUITE.md).

Pricing stays in lockstep across web and App Store — divergence invites support pain
and App Review questions. The App Review 4.3(b) ("app farm") defense is that each
app is genuinely distinct content for a distinct audience (distinct listing, icon,
screenshots, description), the same posture ASA/Gleim/Sporty's hold.

---

## 5. Production-grade Swift sample — study turn + Captain Adel

This compiles against the **real** `FlyGACAKit` seams (`AppServices.ChatClient` /
`ChatTurn`, the `StudyStore` actor write-path), not a generic template. It shows the
two load-bearing rules in practice: the engine takes an injected clock and does no
IO, and the chat client is a thin SSE stream the view just renders.

```swift
import SwiftUI
import CoreModels      // Question, ModuleManifest, SessionConfig, SessionResult
import StudyEngines    // StudySession (pure state machine; no IO)
import AppServices     // ChatClient, ChatTurn — the /api/chat seam

// MARK: - View model (MVVM; the app injects the seams at its composition root)

@MainActor
final class StudyTurnModel: ObservableObject {
    @Published private(set) var session: StudySession
    @Published var selected: Int?
    @Published var showExplanation = false

    // Captain Adel streaming state
    @Published private(set) var adelText = ""
    @Published private(set) var isStreaming = false

    private let store: StudyStore          // the @ModelActor single write-path
    private let chat: ChatClient           // CannedChat (offline) or the SSE gateway (PlatformLive)

    init(config: SessionConfig, questions: [Question], store: StudyStore, chat: ChatClient) {
        self.session = StudySession(config: config, questions: questions)
        self.store = store
        self.chat = chat
    }

    var current: Question? { session.current }

    // Engines are pure: the answer is recorded in-memory, then persisted through
    // the single write path. No Date() is read here — the session owns no clock.
    func submit(_ index: Int, now: Date) async {
        guard let q = current else { return }
        selected = index
        session.answer(index, at: now)          // pure state transition
        showExplanation = true
        try? await store.recordAttempt(question: q, chosen: index, at: now)
    }

    func next() {
        session.advance()
        selected = nil
        showExplanation = false
        adelText = ""
    }

    // Thin SSE consumer — identical shape on web (drainSse) and iOS. The brain,
    // retrieval and grounding all live server-side behind /api/chat.
    func askAdel(_ prompt: String) async {
        guard let q = current else { return }
        isStreaming = true; adelText = ""
        defer { isStreaming = false }

        let history = [ChatTurn(role: "system",
                                text: "Studying \(q.gacaReference). Cite the exact Part/section; refuse if unsure.")]
        do {
            let stream = try await chat.send(prompt, history: history)
            for try await token in stream { adelText += token }
        } catch {
            adelText = "Captain Adel is unavailable offline. Your study progress is saved."
        }
    }
}

// MARK: - View

struct StudyTurnView: View {
    @StateObject var model: StudyTurnModel

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            if let q = model.current {
                Text(q.gacaReference).font(.caption).monospaced()      // exact citation, always visible
                Text(q.prompt).font(.title3)

                ForEach(Array(q.options.enumerated()), id: \.offset) { i, option in
                    Button(option) { Task { await model.submit(i, now: .now) } }
                        .buttonStyle(AnswerStyle(state: model.optionState(i)))
                        .disabled(model.showExplanation)
                }

                if model.showExplanation {
                    ExplanationCard(text: q.explanation, reference: q.gacaReference)
                    Button("Next") { model.next() }
                }
            }
        }
        .padding()
        // The Disclaimer is a shared component; never inline or reword it.
        .safeAreaInset(edge: .bottom) { Disclaimer() }
    }
}
```

Why this is correct where a generic sample would be wrong: it uses **SwiftData via
the store actor** (not `NSPersistentContainer`), imports at file scope only, keeps
the model out of IO, and treats Captain Adel as a **remote SSE stream** rather than
an on-device pipeline. Those aren't stylistic choices — they're the boundaries §1–2
depend on.

---

## 6. Generic advice vs. what Fly GACA chose (and why)

The common "definitive aviation-app architecture" recommendations are reasonable
defaults for a *greenfield, document-heavy, single-app* product. Fly GACA is none of
those, so several are actively wrong here. Recording the reconciliation so the next
person who meets the same "obvious" advice knows why we went the other way:

| Generic recommendation | What Fly GACA does | Why |
|---|---|---|
| **TCA** for state | **MVVM + light Clean** | Deterministic state already lives in the pure `StudySession` engine (fully testable without a store framework). TCA's boilerplate/dependency weight isn't earned by these screens; the win it sells is already ours. |
| **8 separate SPM packages** | **One package (`FlyGACAKit`), 6 library targets** | Same strict dependency direction, none of the multi-package version/resolve overhead. `swift build`/`swift test` stay instant. |
| **Core Data + CloudKit** | **SwiftData + App Group** | iOS 17 floor makes SwiftData the modern default; App Group gives cross-app continuity. Core Data is the documented fallback *only* if the deployment floor ever drops below iOS 17. |
| **Tiered hot/warm/cold caching of 500 MB–2 GB of PDFs** | **Ship ~158 KB JSON; stream the one 19 MB search index** | There is no multi-GB document store. A caching tier for 158 KB is pure overhead; content is shipped, not synced from a mutable store. |
| **App runs its own Pinecone/Weaviate vector DB + `text-embedding-3-large` + cross-encoder** | **Server-owned Gemini RAG behind `/api/chat`; lexical/BM25 v1** | The brain is a backend concern (PDPL, single-fix surface, thin clients). v1 retrieval is deterministic lexical over the shipped corpus; a vector store is the *documented* upgrade only if recall falls short. |
| **Subscription ladder (SAR 29 / 79 per month)** | **Paid-up-front 39 SAR apps + App Store bundle; free + one-time pack on web** | Apple bundles require paid (or subscription) apps; paid-up-front keeps the family IAP-free, offline, account-free and price-locked to the web pack. |
| **DistilBERT intent classifier + curated non-LLM emergency answers** | **One grounded flow; refuse-over-guess** | A study/reference tool answers regulatory questions from cited passages; it is explicitly **not** an operational/emergency advisor. Correct grounding + honest refusal beats a routing layer that implies operational authority. |

None of this diminishes the strategic framing the generic blueprint gets right —
accuracy-first RAG, offline capability, a phased rollout, MENA-first hosting. It just
grounds each one in the product that actually exists.

---

## 7. Roadmap & success metrics

**Platform horizons** (see [`ROADMAP.md`](../ROADMAP.md) for web,
`ay2m/FlyGACA`'s `apple/ARCHITECTURE.md` §5 for iOS,
[`docs/APPS-FAMILY-ROADMAP.md`](./APPS-FAMILY-ROADMAP.md) for the app lineup):

- **Now:** web app shipped and live (all tools, library+search, chat, study, account,
  B2B); Captain Adel Genkit+Gemini brain in `functions/`.
- **Next:** iOS Phases 1–3 — `FlyGACAKit` engines + shared UI, durable SRS/streaks,
  the content bundler in CI, and the ELPT + AIP targets reaching TestFlight.
- **Later:** iOS Phase 4 (`PlatformLive`: Firebase Auth + App Check, progress upload,
  Captain Adel SSE, remote content refresh + SRS reconcile) and the App Store bundle.
  The licence-exam apps (PPL, CPL, IR, ATPL) are paused — their packs stay live on the web.

**Success metrics that gate quality** (measured, not aspirational):

- **Grounding honesty:** the computed `grounded`/`partial`/`refusal` verdict matches
  human-CFI review; refusals fire rather than speculative answers on
  unretrievable questions — tracked by the brain's eval suite.
- **Cross-platform parity:** iOS scores a mock exam identically to the web for the
  same answer set; SRS parity vectors stay green (a failure means divergence).
- **Offline integrity:** the full study loop (study → quiz → cards → mock → exam →
  analytics) works with no network on every family app.
- **Performance:** cold launch < 2 s; question load effectively instant (bundled
  JSON); first Captain Adel token fast enough to feel live over the SSE stream.

---

*Not affiliated with GACA. This platform cites and defers to GACA as the authority.*
