/**
 * Generate the bilingual "Saudi AIP — From Zero to Pass" study PDFs referenced
 * by the Study Sheets library (public/data/pdfs-index.json) and the AIP prep
 * pack (src/lib/prepCatalog.ts). One-shot, idempotent generator — run it
 * when the content or template changes (`npm run gen:aip-sheet`); the PDFs are
 * committed to public/study-sheets/ and Vite copies public/ into dist/ verbatim
 * (there is no build-time PDF step, matching scripts/build-og-images.mjs).
 *
 * Output:
 *   public/study-sheets/saudi-aip-study-sheet-en.pdf   (English, LTR)
 *   public/study-sheets/saudi-aip-study-sheet-ar.pdf   (Arabic, RTL)
 *
 * Content is drawn from the Saudi eAIP docs already in the corpus
 * (public/data/library/saudi-aip-*.html), the `aip-ais` quiz bank
 * (public/data/quiz.json) and ICAO Annex 15, and is cited to Part/section. The
 * guide helps you find and study the regulation — it never replaces it. Every
 * fact must be verified against the current official AIP.
 *
 * Fonts: Chromium renders with fontconfig and page.pdf() embeds font subsets, so
 * the committed PDFs are self-contained. Arabic needs a Naskh face — install one
 * once with `apt-get install -y fonts-hosny-amiri` (family "Amiri"); the script
 * warns if no Arabic font is found.
 */
import { chromium } from 'playwright';
import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(root, 'public/study-sheets');

// Falcon palette (mirrors src/styles/tokens.css / scripts/build-og-images.mjs),
// tuned for print: dark ink on paper white, teal/sage/gold accents.
const INK = '#0f1a24';
const TEAL = '#245b73';
const SAGE = '#3f7a56';
const GOLD = '#9a7415';
const MUTED = '#5a6773';
const LINE = '#d7dde2';
const WASH = '#f4f7f8';
const WASH2 = '#eef3f2';
const NIGHT = '#0a0e12';

// Currency banner carried by every Saudi eAIP doc in the corpus (verify at run
// time against public/data/library/saudi-aip-*.html).
const AIRAC = 'AIRAC AMDT 05/26 — effective 14 MAY 2026';

// The not-affiliated / verify-against-GACA notice — reproduced VERBATIM from the
// shared <Disclaimer /> copy (src/i18n/en.json + ar.json `disclaimer.*`). Do not
// reword: this is load-bearing product copy that must never drift.
const DISCLAIMER = {
  en: {
    strong: 'Fly GACA is an independent educational platform.',
    body: 'It is not affiliated with, endorsed by, or operated by the General Authority of Civil Aviation (GACA) or the Government of the Kingdom of Saudi Arabia. The official and authoritative source for all civil aviation regulations, publications, and aeronautical information is always GACA. Always verify against the latest official GACA publication at gaca.gov.sa.',
  },
  ar: {
    strong: 'فلاي جاكا منصة تعليمية مستقلة.',
    body: 'وهي غير تابعة للهيئة العامة للطيران المدني (GACA) ولا معتمدة منها ولا تُديرها، كما أنها لا تمثّل حكومة المملكة العربية السعودية. المصدر الرسمي والمعتمد لجميع لوائح الطيران المدني ومنشوراته ومعلوماته الجوية هو GACA دائمًا. تحقّق دائمًا من أحدث منشور رسمي صادر عن GACA على gaca.gov.sa.',
  },
};

// ── tiny HTML block helpers ────────────────────────────────────────────────
const esc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
// Allow a small inline vocabulary (**bold**, *italic*) without a markdown
// dependency. Bold is resolved before italic so `**x**` never leaves a stray `*`.
const inline = (s) =>
  esc(s)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>');

const p = (t) => `<p>${inline(t)}</p>`;
const lead = (t) => `<p class="lead">${inline(t)}</p>`;
const ul = (items) => `<ul>${items.map((i) => `<li>${inline(i)}</li>`).join('')}</ul>`;
const cite = (t) => `<p class="cite">${inline(t)}</p>`;
const h2 = (t) => `<h2>${inline(t)}</h2>`;
const h3 = (t) => `<h3>${inline(t)}</h3>`;

const callout = (title, items) =>
  `<div class="callout"><div class="callout-h">${inline(title)}</div>${ul(items)}</div>`;

const table = (headers, rows) =>
  `<table><thead><tr>${headers
    .map((h) => `<th>${inline(h)}</th>`)
    .join('')}</tr></thead><tbody>${rows
    .map((r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join('')}</tr>`)
    .join('')}</tbody></table>`;

// A page/section. `break` forces a page break before it.
const section = (n, title, ...blocks) =>
  `<section class="sec${n ? '' : ' nobreak'}">${
    n ? `<div class="kicker">${inline(n)}</div>` : ''
  }${h2(title)}${blocks.join('')}</section>`;

// ── content model, per language ────────────────────────────────────────────
// Each language returns { lang, dir, title, subtitle, howto, sections:[…] }.
function content(L) {
  const t = STR[L];
  return t;
}

const STR = {
  en: {
    lang: 'en',
    dir: 'ltr',
    font: `"Liberation Sans", "DejaVu Sans", "Noto Sans", Arial, sans-serif`,
    kicker: 'Fly GACA · Study Guide',
    title: 'Saudi AIP — From Zero to Pass',
    subtitle:
      'A complete study guide to the Aeronautical Information Publication (AIP) and aeronautical information services for the Kingdom of Saudi Arabia.',
    currency: `Current as of ${AIRAC}. Aeronautical information changes every AIRAC cycle — always verify against the live AIP at aimss.sans.com.sa before any operational use.`,
    howtoH: 'How to use this guide',
    howto: [
      'Read the sections in order — each builds on the last, from what the AIP is up to the airspace and procedures an exam will test.',
      'The **Exam-focus key facts** page is your memorize list. Cover the right column and recall it.',
      'Then drill in the app: **Study → AIP pack** runs the *AIP & Aeronautical Information* question bank (28 questions) and the Mock Exam. Loop until you pass.',
    ],
    sourcesH: 'Sources',
    sources:
      'Built from the Saudi eAIP (GEN & ENR sections), ICAO Annex 15 — Aeronautical Information Services, and the Aeronautical Information Manual. Every fact is cited to its Part/section; verify against the current official AIP.',
    sections: [
      section(
        '01',
        'What the AIP is',
        lead(
          'The **Aeronautical Information Publication (AIP)** is the official reference manual of lasting aeronautical information a State needs for safe air navigation. For the Kingdom it is the **AIP-KSA**, published by the **General Authority of Civil Aviation (GACA)** through its Aeronautical Information Service (AIS).',
        ),
        p(
          'The AIP is the *permanent* record. Alongside it, aeronautical information reaches you through three linked products:',
        ),
        ul([
          '**AIP** — permanent information of long duration (structure, airspace, aerodromes, procedures).',
          '**AIP Amendment (AMDT)** — permanent changes folded into the AIP on an AIRAC date.',
          '**AIP Supplement (SUP)** — temporary changes of long duration (usually three months or more) or extensive text/graphics.',
          '**NOTAM** — time-critical, perishable notices (a closure, an unserviceability, a hazard) distributed by telecommunication and checked before every flight.',
          '**AIC (Aeronautical Information Circular)** — information that does not qualify for the AIP or a NOTAM but matters for safety, navigation or administration.',
        ]),
        p(
          'The whole system implements **ICAO Annex 15 — Aeronautical Information Services**, which defines how each State collects, publishes and updates aeronautical information.',
        ),
        callout('Remember', [
          'The AIP is published by **GACA (AIS)** — the official, authoritative source.',
          'Permanent change → **AIP Amendment**. Long temporary change → **AIP Supplement**. Perishable notice → **NOTAM**. Advisory → **AIC**.',
          'The framework is **ICAO Annex 15**.',
        ]),
        cite('Source: ICAO Annex 15; AIP-KSA GEN.'),
      ),
      section(
        '02',
        'The AIRAC system',
        lead(
          '**AIRAC — Aeronautical Information Regulation And Control** — is the system of common, pre-notified effective dates so that everyone (crews, charts, navigation databases) changes in step, worldwide.',
        ),
        ul([
          'One AIRAC cycle is **28 days**.',
          'AIRAC effective dates are 28 days apart and **always fall on a Thursday**.',
          'Cycles are numbered **YYNN** — two-digit year + ordinal cycle. So **2605** is the *fifth* cycle whose effective date falls in 2026.',
          'Charts and navigation databases update on the AIRAC cycle so the world changes together.',
          'A **Trigger NOTAM** announces, and gives a short reference for, a forthcoming AIRAC AIP Amendment or Supplement, so operators know a permanent change is about to take effect.',
        ]),
        callout('Remember', [
          'AIRAC cycle = **28 days**, effective on a **Thursday**.',
          '**2605** = 5th cycle of 2026.',
          'A **Trigger NOTAM** flags an incoming AIRAC amendment.',
        ]),
        cite('Source: ICAO Annex 15.'),
      ),
      section(
        '03',
        'How the AIP is structured — GEN · ENR · AD',
        lead('Every ICAO-format AIP is divided into three parts:'),
        table(
          ['Part', 'Name', 'What it contains'],
          [
            ['GEN', 'General', 'Authorities, units of measurement, abbreviations, and applicable regulations.'],
            ['ENR', 'En-route', 'Airways, significant points, ATS airspace, and en-route rules and procedures.'],
            ['AD', 'Aerodromes', 'Per-aerodrome data — runways, frequencies, procedures and charts (AD 2 per aerodrome).'],
          ],
        ),
        h3('The Saudi eAIP sections you should know'),
        table(
          ['Ref', 'Title'],
          [
            ['GEN 2.1', 'Measuring system, aircraft markings, holidays'],
            ['GEN 2.2', 'Abbreviations used in AIS publications'],
            ['GEN 3.3', 'Air Traffic Services'],
            ['GEN 3.4', 'Communication Services'],
            ['GEN 3.6', 'Search and Rescue'],
            ['ENR 1.1', 'General rules'],
            ['ENR 1.2', 'Visual Flight Rules (VFR)'],
            ['ENR 1.3', 'Instrument Flight Rules (IFR)'],
            ['ENR 1.4', 'ATS airspace classification and description'],
            ['ENR 1.5', 'Holding, approach and departure procedures'],
            ['ENR 1.6', 'ATS surveillance systems and procedures'],
            ['ENR 1.7', 'Altimeter setting procedures'],
            ['ENR 2.1', 'ATS airspace — FIR, TMA, CTR'],
            ['ENR 2.2', 'Other regulated airspace'],
          ],
        ),
        cite('Source: ICAO Annex 15; AIP-KSA GEN/ENR reference index.'),
      ),
      section(
        '04',
        'GEN — the general part',
        h3('GEN 2.1 — Units, time and position'),
        ul([
          'Horizontal distances for navigation: **nautical miles** (and tenths).',
          'Altitudes, elevations and heights: **feet (FT)**.',
          'Horizontal speed: **knots (KT)**. Vertical speed (rate of climb/descent): **feet per minute (FT/MIN)**.',
          'Altimeter setting (QNH): **hectopascals (hPa)**.',
          'Time is **Coordinated Universal Time (UTC)** on the Gregorian calendar; time is reported to the nearest minute.',
          'Geographical coordinates are published to the **WGS-84** horizontal reference system.',
        ]),
        h3('GEN 2.2 · 3.3 · 3.4 · 3.6'),
        ul([
          '**GEN 2.2** lists the abbreviations used across AIS publications — learn to decode them.',
          '**GEN 3.3 (Air Traffic Services)** describes the ATS units, e.g. **AFIS — Aerodrome Flight Information Service** at aerodromes with no control service.',
          '**GEN 3.4 (Communication Services)** covers the aeronautical communication and radio-navigation services.',
          '**GEN 3.6 (Search and Rescue)** covers the SAR organisation, responsibility and procedures.',
        ]),
        callout('Remember', [
          'Distance **NM**, height **FT**, speed **KT**, vertical speed **FT/MIN**, pressure **hPa**, time **UTC**, coordinates **WGS-84**.',
          '**AFIS** = Aerodrome Flight Information Service (information + alerting, no control).',
        ]),
        cite('Source: AIP-KSA GEN 2.1, GEN 2.2, GEN 3.3.'),
      ),
      section(
        '05',
        'ENR — general rules, VFR and IFR',
        h3('ENR 1.1 — General rules'),
        ul([
          'Below **10,000 FT** anywhere in the **Jeddah FIR**, do not exceed **250 KT** unless authorised to the contrary by the President or by ATC.',
          'A common **transition altitude (TA) of 13,000 FT** and a **fixed transition level (TL) of FL 150** apply across the Jeddah FIR.',
        ]),
        h3('ENR 1.2 — Visual Flight Rules (VFR)'),
        ul([
          'VFR flights must carry a functioning **Mode C SSR (4096-code) transponder** when operating in **Class B or Class C** airspace.',
          'No flight may begin under VFR unless reports/forecasts show it can be flown within the basic VFR weather minima.',
        ]),
        h3('ENR 1.3 — Instrument Flight Rules (IFR)'),
        p(
          'ENR 1.3 sets the IFR equipment, minimum levels and en-route procedures for flight by reference to instruments.',
        ),
        callout('Remember', [
          '**250 KT** max below **10,000 FT** in the Jeddah FIR (unless authorised).',
          'VFR in **Class B/C** needs a **Mode C** transponder.',
        ]),
        cite('Source: AIP-KSA ENR 1.1, ENR 1.2, ENR 1.3.'),
      ),
      section(
        '06',
        'ENR — airspace, surveillance and altimetry',
        h3('ENR 1.4 — ATS airspace classification'),
        table(
          ['Class', 'Permitted', 'Separation / service (summary)'],
          [
            ['A', 'IFR only', 'ATC service; all flights separated.'],
            ['B', 'IFR + VFR', 'ATC service; all flights separated from each other.'],
            ['C', 'IFR + VFR', 'IFR separated from IFR & VFR; VFR separated from IFR, traffic info on other VFR.'],
            ['D', 'IFR + VFR', 'IFR separated from IFR + traffic info on VFR; VFR gets traffic info on all.'],
            ['E', 'IFR + VFR', 'IFR separated from IFR; traffic info to all as far as practical.'],
            ['F', 'IFR + VFR', 'IFR get an advisory service; all get flight information on request.'],
            ['G', 'IFR + VFR', 'Flight information service only; no separation provided.'],
          ],
        ),
        h3('ENR 1.6 — Surveillance · ENR 1.7 — Altimeter setting'),
        ul([
          'Within Saudi controlled airspace, a serviceable SSR transponder must have **Mode C selected at all times unless ATC instructs otherwise**, so controllers receive pressure-altitude data.',
          'Altimeter setting follows ICAO PANS-OPS/PANS-ATM. **QNH is given in hectopascals (hPa)**, rounded down to the nearest whole unit.',
          'A common **TA 13,000 FT** and **fixed TL FL 150** apply across the Jeddah FIR (giving at least 1,000 FT of vertical separation above the TA).',
        ]),
        h3('ENR 2.1 / 2.2 — ATS airspace'),
        p(
          'ENR 2.1 describes the **FIR, TMA and CTR** structure (Jeddah FIR and its terminal/control areas); ENR 2.2 describes other regulated airspace (restricted, danger and prohibited areas).',
        ),
        callout('Remember', [
          'Classes **A–G** — know who is separated from whom (A = IFR only; G = information only).',
          '**Mode C at all times** unless told otherwise.',
          'QNH in **hPa**; **TA 13,000 FT / TL FL 150** in the Jeddah FIR.',
        ]),
        cite('Source: AIP-KSA ENR 1.4, ENR 1.6, ENR 1.7, ENR 2.1, ENR 2.2.'),
      ),
      section(
        '07',
        'AD — the aerodromes part',
        lead(
          'The **AD (Aerodromes)** part is where you find the entry for a specific aerodrome. **AD 2** carries one section per aerodrome.',
        ),
        ul([
          'Per-aerodrome data includes runways, frequencies, lighting, services and procedures.',
          'The **transition altitude** for an aerodrome is given on **AD 2.17**, on instrument approach charts and on ATC surveillance minimum-altitude charts.',
          'In the Fly GACA app the AD data surfaces as the **aerodrome directory** and the **VFR/visual charts** — use them to place the airspace you learned in ENR onto real fields.',
        ]),
        callout('Remember', [
          'Aerodrome-specific data → the **AD** part (**AD 2** per aerodrome).',
          'Runway & frequency data live in **AD**, not GEN or ENR.',
        ]),
        cite('Source: ICAO Annex 15; AIP-KSA AD 2.'),
      ),
      section(
        '08',
        'Exam-focus key facts',
        p('Cover the answers and recall each one. This is the minimum you must know cold.'),
        table(
          ['Prompt', 'Answer'],
          [
            ['AIRAC cycle length', '28 days'],
            ['AIRAC effective day', 'Thursday'],
            ['"AIRAC" stands for', 'Aeronautical Information Regulation And Control'],
            ['Cycle 2605 means', '5th cycle effective in 2026'],
            ['The three AIP parts', 'GEN, ENR, AD'],
            ['GEN contains', 'Authorities, units, abbreviations, regulations'],
            ['ENR contains', 'Airways, significant points, ATS airspace, en-route procedures'],
            ['AD contains', 'Per-aerodrome data (runways, frequencies) — AD 2'],
            ['AIP published in KSA by', 'GACA (Aeronautical Information Service)'],
            ['Standards document', 'ICAO Annex 15'],
            ['NOTAM is', 'Time-critical notice distributed by telecommunication'],
            ['AIC is', 'Aeronautical Information Circular'],
            ['AIP Supplement', 'Temporary change of long duration (≥ ~3 months)'],
            ['Trigger NOTAM', 'Announces a forthcoming AIRAC AMDT/SUP'],
            ['Speed below 10,000 FT (Jeddah FIR)', '250 KT (unless authorised)'],
            ['Transition altitude / level (Jeddah FIR)', 'TA 13,000 FT / TL FL 150'],
            ['VFR transponder in Class B/C', 'Mode C (4096-code)'],
            ['Transponder mode in controlled airspace', 'Mode C at all times unless told otherwise'],
            ['Navigation distance / height / speed units', 'NM / FT / KT (vertical FT/MIN)'],
            ['Altimeter setting unit', 'Hectopascals (hPa)'],
            ['Coordinate reference system', 'WGS-84'],
            ['AFIS', 'Aerodrome Flight Information Service'],
          ],
        ),
        cite('Source: aggregated from the sections above; verify against the current AIP.'),
      ),
      section(
        '09',
        'Your "0 to pass" study plan',
        lead('A four-step loop that takes you from nothing to a confident pass:'),
        ul([
          '**1 · Understand** — read sections 01–07 once. Do not memorize yet; build the map: AIP → AIRAC → GEN/ENR/AD.',
          '**2 · Memorize** — work the *Exam-focus key facts* (section 08). Cover the answers; recall aloud.',
          '**3 · Drill** — in the app, open **Study → AIP pack** and run the **AIP & Aeronautical Information** question bank (28 questions). Every answer cites its source; read the explanation on each miss.',
          '**4 · Test** — sit the **Mock Exam**. Score below the pass mark? Return to the sections behind your wrong answers, then re-test. Repeat until you clear it twice.',
        ]),
        p(
          'Keep the AIRAC currency habit: this guide is a snapshot. Before any real-world use, open the live AIP at **aimss.sans.com.sa** and confirm nothing has changed on the latest cycle.',
        ),
        callout('The loop', [
          'Understand → Memorize → Drill (AIP pack, 28 Qs) → Mock Exam → repeat.',
          'Always verify against the current official AIP.',
        ]),
      ),
    ],
  },

  ar: {
    lang: 'ar',
    dir: 'rtl',
    font: `"Amiri", "Noto Naskh Arabic", "Liberation Sans", serif`,
    kicker: 'فلاي جاكا · دليل دراسي',
    title: 'دليل الطيران السعودي (AIP) — من الصفر إلى النجاح',
    subtitle:
      'دليل دراسي شامل لمنشور معلومات الطيران (AIP) وخدمات معلومات الطيران في المملكة العربية السعودية.',
    currency: `محدَّث حتى ${AIRAC}. تتغيّر معلومات الطيران في كل دورة AIRAC — تحقّق دائمًا من منشور AIP الحيّ على aimss.sans.com.sa قبل أي استخدام تشغيلي.`,
    howtoH: 'كيف تستخدم هذا الدليل',
    howto: [
      'اقرأ الأقسام بالترتيب — يبني كل قسم على ما قبله، من تعريف الـ AIP حتى المجالات الجوية والإجراءات التي يختبرها الامتحان.',
      'صفحة **الحقائق الأساسية للامتحان** هي قائمة الحفظ لديك. غطِّ عمود الإجابات واسترجعها من ذاكرتك.',
      'ثم تدرّب في التطبيق: **الدراسة ← حزمة AIP** تشغّل بنك أسئلة *AIP ومعلومات الطيران* (28 سؤالًا) والامتحان التجريبي. كرّر حتى تنجح.',
    ],
    sourcesH: 'المصادر',
    sources:
      'مبني على منشور AIP السعودي (أقسام GEN وENR)، وملحق ICAO رقم 15 — خدمات معلومات الطيران، ودليل معلومات الطيران. كل معلومة موثّقة بجزئها/قسمها؛ تحقّق منها في منشور AIP الرسمي الحالي.',
    sections: [
      section(
        '٠١',
        'ما هو الـ AIP',
        lead(
          '**منشور معلومات الطيران (AIP)** هو المرجع الرسمي للمعلومات الجوية الدائمة التي تحتاجها الدولة للملاحة الجوية الآمنة. في المملكة هو **AIP-KSA**، وتصدره **الهيئة العامة للطيران المدني (GACA)** عبر خدمة معلومات الطيران (AIS) التابعة لها.',
        ),
        p('الـ AIP هو السجل *الدائم*. وإلى جانبه تصلك معلومات الطيران عبر منتجات مترابطة:'),
        ul([
          '**AIP** — معلومات دائمة طويلة الأمد (البنية، المجال الجوي، المطارات، الإجراءات).',
          '**تعديل AIP (AMDT)** — تغييرات دائمة تُدمج في الـ AIP في تاريخ AIRAC.',
          '**ملحق AIP (SUP)** — تغييرات مؤقتة طويلة الأمد (عادة ثلاثة أشهر فأكثر) أو نصوص/رسوم مطوّلة.',
          '**NOTAM** — إشعارات آنية سريعة التقادم (إغلاق، عطل، خطر) تُوزَّع عبر الاتصالات وتُراجَع قبل كل رحلة.',
          '**AIC (تعميم معلومات الطيران)** — معلومات لا تصلح للـ AIP ولا للـ NOTAM لكنها مهمة للسلامة أو الملاحة أو الإدارة.',
        ]),
        p(
          'يطبّق هذا النظام كله **ملحق ICAO رقم 15 — خدمات معلومات الطيران**، الذي يحدّد كيف تجمع كل دولة معلومات الطيران وتنشرها وتحدّثها.',
        ),
        callout('تذكّر', [
          'يصدر الـ AIP عن **GACA (AIS)** — المصدر الرسمي والمعتمد.',
          'تغيير دائم ← **تعديل AIP**. تغيير مؤقت طويل ← **ملحق AIP**. إشعار سريع التقادم ← **NOTAM**. إرشادي ← **AIC**.',
          'الإطار هو **ملحق ICAO رقم 15**.',
        ]),
        cite('المصدر: ملحق ICAO رقم 15؛ AIP-KSA GEN.'),
      ),
      section(
        '٠٢',
        'نظام AIRAC',
        lead(
          '**AIRAC — تنظيم وضبط معلومات الطيران** — هو نظام التواريخ الفعّالة المشتركة المُبلَّغ عنها مسبقًا، بحيث يتغيّر الجميع (الطواقم، الخرائط، قواعد بيانات الملاحة) بالتزامن حول العالم.',
        ),
        ul([
          'مدة دورة AIRAC الواحدة **28 يومًا**.',
          'تواريخ AIRAC الفعّالة تفصلها 28 يومًا و**تقع دائمًا يوم الخميس**.',
          'تُرقَّم الدورات بصيغة **YYNN** — رقم السنة المكوّن من خانتين + ترتيب الدورة. فـ **2605** هي *الدورة الخامسة* التي يقع تاريخها الفعّال في 2026.',
          'تُحدَّث الخرائط وقواعد بيانات الملاحة على دورة AIRAC ليتغيّر العالم معًا.',
          '**Trigger NOTAM** يُعلن عن تعديل أو ملحق AIP وشيك على دورة AIRAC ويعطي مرجعًا مختصرًا له.',
        ]),
        callout('تذكّر', [
          'دورة AIRAC = **28 يومًا**، فعّالة يوم **الخميس**.',
          '**2605** = الدورة الخامسة لعام 2026.',
          '**Trigger NOTAM** ينبّه إلى تعديل AIRAC قادم.',
        ]),
        cite('المصدر: ملحق ICAO رقم 15.'),
      ),
      section(
        '٠٣',
        'بنية الـ AIP — GEN · ENR · AD',
        lead('ينقسم كل AIP بصيغة ICAO إلى ثلاثة أجزاء:'),
        table(
          ['الجزء', 'الاسم', 'المحتوى'],
          [
            ['GEN', 'عام', 'الجهات، وحدات القياس، الاختصارات، واللوائح السارية.'],
            ['ENR', 'في الطريق', 'المسارات الجوية، النقاط المهمة، مجال ATS، وإجراءات الطريق.'],
            ['AD', 'المطارات', 'بيانات كل مطار — المدارج، الترددات، الإجراءات والخرائط (AD 2 لكل مطار).'],
          ],
        ),
        h3('أقسام AIP السعودي التي يجب أن تعرفها'),
        table(
          ['المرجع', 'العنوان'],
          [
            ['GEN 2.1', 'نظام القياس، علامات الطائرات، العطلات'],
            ['GEN 2.2', 'الاختصارات المستخدمة في منشورات AIS'],
            ['GEN 3.3', 'خدمات الحركة الجوية'],
            ['GEN 3.4', 'خدمات الاتصالات'],
            ['GEN 3.6', 'البحث والإنقاذ'],
            ['ENR 1.1', 'القواعد العامة'],
            ['ENR 1.2', 'قواعد الطيران البصري (VFR)'],
            ['ENR 1.3', 'قواعد الطيران الآلي (IFR)'],
            ['ENR 1.4', 'تصنيف ووصف مجال ATS'],
            ['ENR 1.5', 'إجراءات الانتظار والاقتراب والمغادرة'],
            ['ENR 1.6', 'أنظمة وإجراءات مراقبة ATS'],
            ['ENR 1.7', 'إجراءات ضبط مقياس الارتفاع'],
            ['ENR 2.1', 'مجال ATS — FIR وTMA وCTR'],
            ['ENR 2.2', 'المجال الجوي المنظَّم الآخر'],
          ],
        ),
        cite('المصدر: ملحق ICAO رقم 15؛ فهرس AIP-KSA GEN/ENR.'),
      ),
      section(
        '٠٤',
        'GEN — الجزء العام',
        h3('GEN 2.1 — الوحدات والزمن والموضع'),
        ul([
          'المسافات الأفقية للملاحة: **الأميال البحرية (NM)** وأعشارها.',
          'الارتفاعات والمناسيب: **الأقدام (FT)**.',
          'السرعة الأفقية: **العُقَد (KT)**. السرعة الرأسية (معدل الصعود/الهبوط): **قدم في الدقيقة (FT/MIN)**.',
          'ضبط مقياس الارتفاع (QNH): **الهكتوباسكال (hPa)**.',
          'الزمن بتوقيت **UTC** على التقويم الميلادي، ويُبلَّغ لأقرب دقيقة.',
          'تُنشَر الإحداثيات الجغرافية على النظام المرجعي الأفقي **WGS-84**.',
        ]),
        h3('GEN 2.2 · 3.3 · 3.4 · 3.6'),
        ul([
          '**GEN 2.2** يسرد الاختصارات المستخدمة في منشورات AIS — تعلّم فكّها.',
          '**GEN 3.3 (خدمات الحركة الجوية)** يصف وحدات ATS، مثل **AFIS — خدمة معلومات طيران المطار** في المطارات دون خدمة مراقبة.',
          '**GEN 3.4 (خدمات الاتصالات)** يغطي خدمات الاتصال الجوي والملاحة اللاسلكية.',
          '**GEN 3.6 (البحث والإنقاذ)** يغطي تنظيم SAR ومسؤولياته وإجراءاته.',
        ]),
        callout('تذكّر', [
          'المسافة **NM**، الارتفاع **FT**، السرعة **KT**، السرعة الرأسية **FT/MIN**، الضغط **hPa**، الزمن **UTC**، الإحداثيات **WGS-84**.',
          '**AFIS** = خدمة معلومات طيران المطار (معلومات وإنذار، دون مراقبة).',
        ]),
        cite('المصدر: AIP-KSA GEN 2.1 وGEN 2.2 وGEN 3.3.'),
      ),
      section(
        '٠٥',
        'ENR — القواعد العامة وVFR وIFR',
        h3('ENR 1.1 — القواعد العامة'),
        ul([
          'دون **10,000 قدم** في أي مكان داخل **Jeddah FIR**، لا تتجاوز **250 عقدة** ما لم يُصرَّح بخلاف ذلك من الرئيس أو من ATC.',
          'يُطبَّق **ارتفاع انتقالي (TA) موحّد قدره 13,000 قدم** و**مستوى انتقالي (TL) ثابت عند FL 150** في كامل Jeddah FIR.',
        ]),
        h3('ENR 1.2 — قواعد الطيران البصري (VFR)'),
        ul([
          'على رحلات VFR حمل **جهاز إرسال مجيب Mode C SSR (بترميز 4096)** عاملًا عند التشغيل في مجال **الفئة B أو الفئة C**.',
          'لا تبدأ أي رحلة تحت VFR ما لم تُظهر التقارير/التنبؤات إمكانية تنفيذها ضمن الحدّ الأدنى للأرصاد البصرية.',
        ]),
        h3('ENR 1.3 — قواعد الطيران الآلي (IFR)'),
        p('يحدّد ENR 1.3 معدّات IFR والمستويات الدنيا وإجراءات الطريق للطيران بالاعتماد على الأجهزة.'),
        callout('تذكّر', [
          'الحدّ الأقصى **250 عقدة** دون **10,000 قدم** في Jeddah FIR (ما لم يُصرَّح).',
          'VFR في **الفئة B/C** يتطلب جهاز إرسال مجيب **Mode C**.',
        ]),
        cite('المصدر: AIP-KSA ENR 1.1 وENR 1.2 وENR 1.3.'),
      ),
      section(
        '٠٦',
        'ENR — المجال الجوي والمراقبة والارتفاع',
        h3('ENR 1.4 — تصنيف مجال ATS'),
        table(
          ['الفئة', 'المسموح', 'الفصل / الخدمة (ملخّص)'],
          [
            ['A', 'IFR فقط', 'خدمة ATC؛ كل الرحلات مفصولة.'],
            ['B', 'IFR + VFR', 'خدمة ATC؛ كل الرحلات مفصولة عن بعضها.'],
            ['C', 'IFR + VFR', 'IFR مفصولة عن IFR وVFR؛ VFR مفصولة عن IFR ومعلومات حركة عن VFR الأخرى.'],
            ['D', 'IFR + VFR', 'IFR مفصولة عن IFR + معلومات حركة عن VFR؛ VFR معلومات حركة عن الجميع.'],
            ['E', 'IFR + VFR', 'IFR مفصولة عن IFR؛ معلومات حركة للجميع قدر الإمكان.'],
            ['F', 'IFR + VFR', 'IFR تتلقى خدمة استشارية؛ الجميع معلومات طيران عند الطلب.'],
            ['G', 'IFR + VFR', 'خدمة معلومات طيران فقط؛ لا فصل.'],
          ],
        ),
        h3('ENR 1.6 — المراقبة · ENR 1.7 — ضبط مقياس الارتفاع'),
        ul([
          'داخل المجال الجوي السعودي المراقَب، يجب أن يكون جهاز الإرسال المجيب العامل على **Mode C في كل الأوقات ما لم يوجّه ATC بغير ذلك**، ليتلقى المراقبون بيانات ارتفاع الضغط.',
          'يتبع ضبط الارتفاع إجراءات ICAO PANS-OPS/PANS-ATM. **يُعطى QNH بالهكتوباسكال (hPa)** مقرَّبًا للأسفل لأقرب وحدة صحيحة.',
          'يُطبَّق **TA موحّد 13,000 قدم** و**TL ثابت FL 150** في كامل Jeddah FIR (بما يوفّر فصلًا رأسيًا لا يقل عن 1,000 قدم فوق الـ TA).',
        ]),
        h3('ENR 2.1 / 2.2 — مجال ATS'),
        p(
          'يصف ENR 2.1 بنية **FIR وTMA وCTR** (Jeddah FIR ومناطقه الطرفية/المراقَبة)؛ ويصف ENR 2.2 المجال المنظَّم الآخر (المناطق المقيّدة والخطرة والمحظورة).',
        ),
        callout('تذكّر', [
          'الفئات **A–G** — اعرف مَن يُفصَل عن مَن (A = IFR فقط؛ G = معلومات فقط).',
          '**Mode C دائمًا** ما لم يُوجَّه بغير ذلك.',
          'QNH بالـ **hPa**؛ **TA 13,000 قدم / TL FL 150** في Jeddah FIR.',
        ]),
        cite('المصدر: AIP-KSA ENR 1.4 وENR 1.6 وENR 1.7 وENR 2.1 وENR 2.2.'),
      ),
      section(
        '٠٧',
        'AD — جزء المطارات',
        lead(
          'جزء **المطارات (AD)** هو حيث تجد بيانات مطار محدّد. يحمل **AD 2** قسمًا واحدًا لكل مطار.',
        ),
        ul([
          'تشمل بيانات كل مطار المدارج والترددات والإضاءة والخدمات والإجراءات.',
          '**الارتفاع الانتقالي** للمطار يُعطى في **AD 2.17** وعلى خرائط الاقتراب الآلي وخرائط الحد الأدنى للارتفاع لمراقبة ATC.',
          'في تطبيق فلاي جاكا تظهر بيانات AD على هيئة **دليل المطارات** و**خرائط VFR/البصرية** — استخدمها لربط ما تعلّمته عن المجال الجوي في ENR بمطارات حقيقية.',
        ]),
        callout('تذكّر', [
          'بيانات المطار المحدّدة ← جزء **AD** (**AD 2** لكل مطار).',
          'بيانات المدارج والترددات في **AD**، لا في GEN أو ENR.',
        ]),
        cite('المصدر: ملحق ICAO رقم 15؛ AIP-KSA AD 2.'),
      ),
      section(
        '٠٨',
        'الحقائق الأساسية للامتحان',
        p('غطِّ الإجابات واسترجع كل واحدة. هذا الحد الأدنى الذي يجب أن تعرفه عن ظهر قلب.'),
        table(
          ['السؤال', 'الإجابة'],
          [
            ['مدة دورة AIRAC', '28 يومًا'],
            ['يوم AIRAC الفعّال', 'الخميس'],
            ['معنى «AIRAC»', 'تنظيم وضبط معلومات الطيران'],
            ['معنى الدورة 2605', 'الدورة الخامسة الفعّالة في 2026'],
            ['أجزاء AIP الثلاثة', 'GEN وENR وAD'],
            ['محتوى GEN', 'الجهات، الوحدات، الاختصارات، اللوائح'],
            ['محتوى ENR', 'المسارات، النقاط المهمة، مجال ATS، إجراءات الطريق'],
            ['محتوى AD', 'بيانات كل مطار (المدارج، الترددات) — AD 2'],
            ['يصدر AIP في المملكة عن', 'GACA (خدمة معلومات الطيران)'],
            ['وثيقة المعايير', 'ملحق ICAO رقم 15'],
            ['ما هو NOTAM', 'إشعار آنيّ يُوزَّع عبر الاتصالات'],
            ['ما هو AIC', 'تعميم معلومات الطيران'],
            ['ملحق AIP', 'تغيير مؤقت طويل الأمد (≈ 3 أشهر فأكثر)'],
            ['Trigger NOTAM', 'يُعلن عن تعديل/ملحق AIP على AIRAC'],
            ['السرعة دون 10,000 قدم (Jeddah FIR)', '250 عقدة (ما لم يُصرَّح)'],
            ['الارتفاع/المستوى الانتقالي (Jeddah FIR)', 'TA 13,000 قدم / TL FL 150'],
            ['مجيب VFR في الفئة B/C', 'Mode C (ترميز 4096)'],
            ['وضع المجيب في المجال المراقَب', 'Mode C دائمًا ما لم يُوجَّه بغيره'],
            ['وحدات المسافة/الارتفاع/السرعة', 'NM / FT / KT (الرأسية FT/MIN)'],
            ['وحدة ضبط الارتفاع', 'الهكتوباسكال (hPa)'],
            ['النظام المرجعي للإحداثيات', 'WGS-84'],
            ['AFIS', 'خدمة معلومات طيران المطار'],
          ],
        ),
        cite('المصدر: مجمَّع من الأقسام أعلاه؛ تحقّق منه في الـ AIP الحالي.'),
      ),
      section(
        '٠٩',
        'خطة دراستك «من الصفر إلى النجاح»',
        lead('حلقة من أربع خطوات تنقلك من لا شيء إلى نجاح واثق:'),
        ul([
          '**1 · افهم** — اقرأ الأقسام 01–07 مرة واحدة. لا تحفظ بعد؛ اِبنِ الخريطة: AIP ← AIRAC ← GEN/ENR/AD.',
          '**2 · احفظ** — اشتغل على *الحقائق الأساسية للامتحان* (القسم 08). غطِّ الإجابات واسترجعها بصوت عالٍ.',
          '**3 · تدرّب** — في التطبيق افتح **الدراسة ← حزمة AIP** وشغّل بنك **AIP ومعلومات الطيران** (28 سؤالًا). كل إجابة موثّقة بمصدرها؛ اقرأ التفسير عند كل خطأ.',
          '**4 · اختبر** — اجلس للـ **الامتحان التجريبي**. نتيجتك دون درجة النجاح؟ عُد إلى الأقسام خلف إجاباتك الخاطئة ثم أعِد الاختبار. كرّر حتى تجتازه مرتين.',
        ]),
        p(
          'حافظ على عادة تحديث AIRAC: هذا الدليل لقطة زمنية. قبل أي استخدام واقعي، افتح الـ AIP الحيّ على **aimss.sans.com.sa** وتأكّد أن لا شيء تغيّر في أحدث دورة.',
        ),
        callout('الحلقة', [
          'افهم ← احفظ ← تدرّب (حزمة AIP، 28 سؤالًا) ← الامتحان التجريبي ← كرّر.',
          'تحقّق دائمًا من الـ AIP الرسمي الحالي.',
        ]),
      ),
    ],
  },
};

// ── page template ──────────────────────────────────────────────────────────
function html(d) {
  const dis = DISCLAIMER[d.lang];
  return `<!doctype html><html lang="${d.lang}" dir="${d.dir}"><head><meta charset="utf-8">
<style>
  @page { size: A4; margin: 16mm 15mm 18mm; }
  * { box-sizing: border-box; }
  html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { margin: 0; font-family: ${d.font}; color: ${INK}; font-size: 10.5pt; line-height: 1.5; }
  .cover { min-height: 246mm; display: flex; flex-direction: column; justify-content: space-between;
           background: ${NIGHT}; color: #eef3f5; padding: 22mm 18mm; margin: -16mm -15mm 0; }
  .cover .kicker { color: ${'#8fc9a8'}; letter-spacing: .18em; text-transform: uppercase; font-size: 9pt; font-weight: 700; }
  .cover h1 { font-size: 27pt; line-height: 1.15; margin: 6mm 0 4mm; font-weight: 800; }
  .cover .sub { font-size: 12pt; color: #c4d0d6; max-width: 150mm; }
  .cover .currency { border-inline-start: 3px solid ${'#c8a04a'}; padding-inline-start: 5mm; color: #d8e0e4;
                     font-size: 9.5pt; margin-top: 10mm; }
  .cover .howto { margin-top: 9mm; }
  .cover .howto h2 { color: #fff; font-size: 12pt; margin: 0 0 3mm; }
  .cover .howto ul { margin: 0; padding-inline-start: 6mm; color: #cfd9de; font-size: 10pt; }
  .cover .howto li { margin-bottom: 2mm; }
  .cover .brand { color: #9fb0b8; font-size: 9pt; }

  .sec { break-before: page; padding-top: 2mm; }
  .sec.nobreak { break-before: auto; }
  .kicker { color: ${TEAL}; font-weight: 800; letter-spacing: .12em; font-size: 9pt; }
  h2 { font-size: 17pt; margin: 1mm 0 4mm; color: ${INK}; border-bottom: 2px solid ${TEAL}; padding-bottom: 2mm; }
  h3 { font-size: 11.5pt; margin: 5mm 0 2mm; color: ${TEAL}; }
  p { margin: 0 0 3mm; }
  p.lead { font-size: 11.5pt; color: ${INK}; }
  ul { margin: 0 0 3mm; padding-inline-start: 6mm; }
  li { margin-bottom: 1.6mm; }
  strong { color: ${INK}; }

  table { width: 100%; border-collapse: collapse; margin: 2mm 0 4mm; font-size: 9.5pt; break-inside: auto; }
  th { background: ${TEAL}; color: #fff; text-align: start; padding: 2mm 3mm; font-weight: 700; }
  td { border: 1px solid ${LINE}; padding: 1.8mm 3mm; vertical-align: top; }
  tbody tr:nth-child(even) td { background: ${WASH}; }
  tr { break-inside: avoid; }

  .callout { background: ${WASH2}; border: 1px solid ${LINE}; border-inline-start: 4px solid ${SAGE};
             border-radius: 2mm; padding: 3mm 4mm; margin: 4mm 0 3mm; break-inside: avoid; }
  .callout-h { font-weight: 800; color: ${SAGE}; text-transform: uppercase; letter-spacing: .08em; font-size: 8.5pt; margin-bottom: 1.5mm; }
  .callout ul { margin: 0; }

  .cite { color: ${MUTED}; font-size: 8.5pt; font-style: italic; margin-top: 2mm; }

  .disclaimer { break-before: page; margin-top: 4mm; padding: 5mm; border: 1px solid ${LINE};
                border-radius: 2mm; background: ${WASH}; font-size: 9.5pt; color: ${INK}; }
  .disclaimer .strong { font-weight: 800; color: ${GOLD}; }
  .disclaimer h2 { border: none; font-size: 12pt; margin: 0 0 3mm; }
  .sources { margin-top: 4mm; color: ${MUTED}; font-size: 9pt; }
</style></head><body>
  <div class="cover">
    <div>
      <div class="kicker">${esc(d.kicker)}</div>
      <h1>${esc(d.title)}</h1>
      <div class="sub">${esc(d.subtitle)}</div>
    </div>
    <div>
      <div class="howto"><h2>${esc(d.howtoH)}</h2>${ul(d.howto)}</div>
      <div class="currency">${inline(d.currency)}</div>
    </div>
    <div class="brand">Fly GACA · flygaca.com</div>
  </div>

  ${d.sections.join('\n')}

  <div class="disclaimer">
    <h2>${d.lang === 'ar' ? 'إخلاء المسؤولية' : 'Disclaimer'}</h2>
    <p><span class="strong">${esc(dis.strong)}</span> ${esc(dis.body)}</p>
    <div class="sources"><strong>${esc(d.sourcesH)}:</strong> ${esc(d.sources)}</div>
  </div>
</body></html>`;
}

// ── render ─────────────────────────────────────────────────────────────────
function hasArabicFont() {
  try {
    return /amiri|naskh|noto sans arabic|arabic/i.test(
      execSync('fc-list : family', { encoding: 'utf8' }),
    );
  } catch {
    return false;
  }
}

async function main() {
  await mkdir(OUT, { recursive: true });
  if (!hasArabicFont()) {
    console.warn(
      '⚠  No Arabic font detected — the Arabic PDF may render tofu.\n' +
        '   Install one first:  apt-get install -y fonts-hosny-amiri',
    );
  }

  // Prefer the environment's pre-installed Chromium when the pinned Playwright
  // browser build isn't downloaded (matches the sandbox note about
  // /opt/pw-browsers); fall back to Playwright's own resolution otherwise.
  const preinstalled = '/opt/pw-browsers/chromium';
  const browser = await chromium.launch(
    existsSync(preinstalled) ? { executablePath: preinstalled } : {},
  );
  try {
    const page = await browser.newPage();
    for (const lang of ['en', 'ar']) {
      const doc = content(lang);
      await page.setContent(html(doc), { waitUntil: 'networkidle' });
      await page.evaluateHandle('document.fonts.ready');
      const file = join(OUT, `saudi-aip-study-sheet-${lang}.pdf`);
      await page.pdf({
        path: file,
        format: 'A4',
        printBackground: true,
        preferCSSPageSize: true,
      });
      console.log(`✓ ${file}`);
    }
  } finally {
    await browser.close();
  }
}

// Exported for the verification harness (screenshotting the rendered HTML).
export { html, content };

// Only generate when run directly (`node scripts/build-aip-study-sheet.mjs`),
// not when imported for its exports.
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
