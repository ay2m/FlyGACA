/**
 * The Arabic Readex Pro faces, split out of main.tsx so an English session never
 * blocks first paint on their CSS. `bootI18n`/`switchLanguage` await this import
 * before rendering Arabic, so the @font-face rules always exist by the time
 * Arabic text paints (the woff2 files themselves were already gated behind
 * `unicode-range`; `font-display: swap` covers the download window, as before).
 */
import '@fontsource/readex-pro/arabic-400.css';
import '@fontsource/readex-pro/arabic-500.css';
import '@fontsource/readex-pro/arabic-600.css';
import '@fontsource/readex-pro/arabic-700.css';
