# Pricing & Revenue-Growth Strategy

> ⚠️ **The price points below are superseded.** This doc was restored from
> `ay2m/FlyGACA-app` history and predates the 2026-08-19 repricing. Current list prices:
> Pro **79/mo · 649/yr**, Exam Season Pass **299**, prep packs banded by content depth
> (**249 / 399 / 499**), All-Access bundle **1,499**, B2B cohort **12,000/yr**, API
> Starter/Growth/Scale **499 / 1,999 / 6,999 per month**. The **Student tier was removed**
> entirely — it granted an identical entitlement to Pro at a discount with no eligibility
> check. See `src/pages/pricing/Pricing.tsx`, `src/lib/prepCatalog.ts` and `.env.example`,
> which `tests/pricing-server-parity.test.ts` holds together. Read this file for the
> *reasoning*, not the numbers.

_Independent educational platform for Saudi civil aviation (flygaca.com / captadel.com)._
_Prices in SAR. Consumer prices VAT-inclusive; B2B seat invoices VAT-exclusive._

> This is a strategy doc, not the source of truth for live prices. Live prices are the
> `MOYASAR_PRICE_*_SAR` params (see `docs/BILLING.md`) and the display constants in
> `src/pages/pricing/Pricing.tsx` + `src/lib/prepCatalog.ts`.

---

## 1. Context & goal

Fly GACA is **built, live, and was pre-revenue by design** — every billing surface (Moyasar
web checkout, RevenueCat iOS IAP, entitlements, exam-prep packs, B2B seats) was wired and ready,
but a launch promo (`FREE_FOR_EVERYONE = true`) opened every paywall. Until this change, only two
things actually earned money: the Captain Adel free-quota top-ups and one-time pack purchases.

**Goal:** maximize revenue across all three lines — **B2B/schools, individuals, and new
products** — while protecting the growth/SEO moat (reading the regulation is never paywalled).

**Chosen posture: measured escalation.** Turn monetization on now and fix the underpriced /
cannibalizing SKUs, but start Pro at a founding discount and ratchet the list price up as reviews
and conversion data accumulate. The #1 leak was charging SAR 0 — not that Pro was too cheap.

---

## 2. Current pricing (after this change)

| SKU | Price (SAR) | Type | Notes |
| --- | --- | --- | --- |
| **Free** | 0 | forever | Full library + 55 tools + **5 Captain Adel Q/day** + ground school, quizzes, flashcards + 1 free pack |
| **Pro** | 59/mo · **449/yr** (founding **349/yr**) | subscription (token re-charge) | Unlimited Adel, mock exams, analytics, presets, exports, offline, bookmarks, change-alerts |
| **Student** | 39/mo · 299/yr | subscription (verified email) | Identical Pro entitlement |
| **Exam Season Pass** | 149 / 90 days | one-time → 90d Pro | "just until my checkride" |
| **Exam-prep pack** | **79** (certificate) · **49** (subject) | one-time, permanent | Was a flat 39; now tiered by pack kind |
| **All-Access Exam Bundle** | **199** | one-time, permanent | **New** — one payment unlocks every pack |
| **Captain Adel credits** | **19** / 50 Q | one-time top-up | Was unset (unsellable) — now fixed |
| **School (B2B)** | from 250/seat/yr | invoiced | Tiers below |

**B2B tiers (published "starting at"):** Cohort — up to 25 seats · from SAR 6,000 / 90-day intake ·
Academy — up to 100 seats · from SAR 22,000 / year · Institution — 100+ seats · custom from SAR
40,000. Design-partner programme: **50% off year one** for a logo + case study.

### What changed in this release
1. **Monetization turned on** — `FREE_FOR_EVERYONE = false`; the generous free tier stays intact.
2. **Credit pack price fixed** (0 → 19) — it was a wired SKU that threw `invalid-price` at checkout.
3. **Packs retiered** (flat 39 → 79 certificate / 49 subject) — closes the underpricing and reduces
   subscription cannibalization.
4. **All-Access Exam Bundle** (199) — a new one-time SKU that grants every pack permanently.
5. **Founding launch offer** — Pro annual shown at 349 (list 449 struck through), time-boxed.
6. **B2B tiers published** on `/pricing` to shorten the sales cycle for the smaller tiers.

---

## 3. Competitor benchmark

USD→SAR ≈ ×3.75.

| Product | Model | Price | Note |
| --- | --- | --- | --- |
| **Rotate Pilot** (closest analog) | sub + one-time | $14.99/mo · **$99/yr** · $9.99 single-track/30d · $39 all-track/60d · AI tutor | **English FAA/EASA only** |
| Sheppard Air | one-time / test | ~$40–60 | memorization, ~99% pass |
| Gleim | one-time / test | $49–99 | |
| ASA Prepware | one-time / test | $59–69 | incl. 24-mo online |
| King Schools | full course | ~$269 | ground school |
| Sporty's | full course | ~$299 | ground school |

**Verdict.** Fly GACA is the **only Arabic-native, GACA-specific** player — no direct in-Kingdom
competitor. Pro annual 449 (~$120) sits just above Rotate's $99 and is justified by the full free
library + 55 tools + unlimited cited AI. Retiered packs (79/49) remain well under US one-time
prices, and the 199 bundle is priced to capture the "pay once for everything" buyer while keeping
Pro the better value for anyone sitting more than one exam or wanting unlimited AI + updates.

---

## 4. Revenue leaks — fixed vs. remaining

**Fixed in this release:** paywall was fully open · credit pack unsellable · flat pack undercut &
cannibalized Pro · no "pay once for everything" option.

**Remaining (roadmap, §6):**
- **No promo / discount codes** — can't run influencer codes, seasonal campaigns, or coded launch
  offers (today the founding offer is a page flag, not a coupon).
- **B2B is 100% "talk to us"** — no self-serve for the small Cohort tier, so instructors and small
  schools stall in the funnel.
- **Captain Adel API is given away** — the trusted `X-Adel-Api-Key` tier has no metered/paid product
  or embeddable widget, despite the roadmap envisioning a multi-tenant API.

---

## 5. Three revenue lines

### A. Individuals (B2C) — scale via SEO + free tier
The free library + tools + AI sampler is the top of the funnel and the SEO/AI-search moat. Convert
with: unlimited Captain Adel, mock exams + analytics, exports/offline, and the exam packs/bundle.
Levers: founding launch offer → reviews → ratchet Pro list up (449 → 499); stronger referral;
optional AI free-quota experiment (5 → 3 Q/day) measured against SEO/goodwill.

### B. Schools / B2B — the biggest deal sizes (Vision 2030 tailwind)
Seat licences to academies/ATOs/operators. Wedge = the **Saudi AIP exam-prep cohort** with an
exportable **readiness report** (the differentiator vs. "we train from PDFs"). Vision 2030, Riyadh
Air, and new academies are creating a GACA-licensing pipeline with real budgets. Land 3–5 design
partners at 50% year one → case studies → repeatable outbound. Target: **first SAR 100k B2B ARR in
H1**, 4 → 40 contracted schools over three years.

### C. New products — high-margin platform + range expansion
- **Captain Adel API + embeddable widget** — productize the RAG brain as a metered B2B API
  (indicative: Starter ~499/mo ≤5k answers · Growth ~1,999/mo ≤25k · Enterprise custom) and a
  drop-in widget for aviation sites / school LMSs / operators.
- **New exam lines** — ship CPL / IR / ATPL packs once they clear `docs/STUDY-CONTENT-REVIEW.md`
  (a real revenue gate); Wave 3 candidates: Instructor, Dispatcher, Drone/UAS, ATC.
- **Checkride / oral-exam prep** — a premium new line (~99 pack or Pro add-on); no Arabic competitor.
- **iOS app family** — per-certificate paid-up-front apps + the "Saudi Pilot Study Pack" bundle
  (RevenueCat), capturing App Store discovery and one-time buyers.

---

## 6. Phased plan & targets

**Phase 0 — now (this release).** Monetization on · packs retiered · All-Access bundle · credit
price fixed · founding offer · B2B tiers published. _Deploying is the go-live trigger._

**Phase 1 — 0–90 days.** Promo-code engine (`promoCodes/{code}` + `?promo=`) · B2B self-serve
Cohort checkout · sign 3–5 design-partner schools (50% year one) · founding launch campaign +
SEO/AI-search push · optional AI-quota A/B.

**Phase 2 — 90–180 days.** Captain Adel API + widget productization · new exam lines (CPL/IR/ATPL
after content review) · checkride/oral prep line · iOS app family + bundle · stronger referral +
win-back · ratchet Pro list price up on the strength of reviews.

**Targets (investor-deck Base case; top-down, to be validated):** Y1 **SAR 270k** → Y2 **980k** →
Y3 **3.0M**; 2–4% free→paid conversion; ~SAR 350 average annual revenue per paying subscriber;
85–90% gross margin; **first SAR 100k B2B ARR in H1**.

---

## 7. Guardrails
- **Never paywall reading the regulation** — the free library + tools + 5 AI Q/day are the moat.
- **The disclaimer never drifts** — independent, not affiliated with GACA, verify against the source.
- **Entitlement stays server-owned** — the app only reads it to gate UI; grants only upgrade.
- **Bilingual + RTL is first-class** — every new price string ships in both `en.json` and `ar.json`.

---

## 8. ملخص تنفيذي بالعربية (Arabic executive summary)

**الهدف:** زيادة الدخل عبر ثلاثة مسارات — المدارس/B2B، الأفراد، ومنتجات جديدة — مع الحفاظ على أن
قراءة الأنظمة تبقى **مجانية دائماً** (ميزة النمو والظهور في البحث).

**السياسة المعتمدة: تدرّج مدروس.** نشغّل التحصيل الآن ونصلح الأسعار المنخفضة/المتضاربة، لكن نبدأ Pro
بسعر تأسيسي ونرفعه بالتدريج مع تراكم التقييمات وبيانات التحويل. المشكلة الأولى كانت أننا نبيع بـ
**صفر** — لا أن Pro رخيص.

**أهم التغييرات في هذا الإصدار:**
1. **تشغيل التحصيل** (`FREE_FOR_EVERYONE = false`) مع بقاء الطبقة المجانية سخية (المكتبة + 55 أداة +
   5 أسئلة كابتن عادل يومياً + المدرسة الأرضية والاختبارات القصيرة + حزمة مجانية).
2. **إصلاح سعر حزمة الرصيد** (من غير محدد → 19 ريال / 50 سؤال) — كانت لا تُباع أصلاً.
3. **إعادة تسعير الحزم** (من 39 ثابت → 79 للشهادة / 49 للموضوع) — تغلق التسعير المنخفض وتقلّل التهام
   الحزم للاشتراك.
4. **باقة الوصول الكامل** (199 ريال) — دفعة واحدة تفتح كل الحزم للأبد.
5. **عرض التأسيس** — Pro السنوي بـ 349 (والقائمة 449 مشطوبة)، لفترة محدودة.
6. **نشر باقات المدارس** (Cohort من 6,000 · Academy من 22,000 · Institution من 40,000) لتسريع
   دورة المبيعات.

**المقارنة بالمنافسين:** أقرب منافس **Rotate** (‏99$/سنة، مساعد AI) لكنه إنجليزي FAA/EASA فقط. أنت
**الوحيد** بمحتوى عربي خاص بـ GACA — قوة تسعيرية تُستثمر بالتدريج.

**المسارات الثلاثة:** (أ) الأفراد عبر SEO والطبقة المجانية ثم التحويل؛ (ب) المدارس هي أكبر الصفقات
مدفوعة برؤية 2030 وطيران الرياض — الوتد هو دورة AIP مع تقرير الجاهزية؛ (ج) منتجات جديدة: ترخيص واجهة
كابتن عادل (API + ودجت)، خطوط اختبارات جديدة (CPL/IR/ATPL بعد مراجعة المحتوى)، وتحضير الاختبار
الشفهي/checkride، وعائلة تطبيقات iOS.

**الأهداف (السيناريو الأساسي):** السنة 1 ‏270 ألف → السنة 2 ‏980 ألف → السنة 3 ‏3 مليون ريال؛ أول
‏100 ألف من إيراد المدارس خلال النصف الأول.
