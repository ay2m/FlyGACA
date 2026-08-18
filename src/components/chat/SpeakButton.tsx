import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ttsSupported, pickTtsLang, toSpeechText } from '@/calc/chat/textToSpeech';
import { pickVoice } from '@/calc/chat/voiceSelection';
import { Waveform } from './Waveform';
import styles from './SpeakButton.module.css';

/**
 * Reads a finalized Captain Adel answer aloud via the Web Speech Synthesis API.
 * Mirrors {@link VoiceButton}: it feature-detects support and renders nothing
 * when unavailable, so it never offers a control that can't work. Speaking
 * language tracks the active app language. Web-only for now — `speechSynthesis`
 * works in modern browsers and inside the native WebView; a Capacitor TTS plugin
 * can be added later behind the same control.
 */
export function SpeakButton({ text }: { text: string }) {
  const { t, i18n } = useTranslation();
  const [supported] = useState(ttsSupported);
  const [speaking, setSpeaking] = useState(false);
  // Cache the voice list: `getVoices()` is often empty until `voiceschanged`
  // fires, so we warm it on mount and refresh it when the engine populates.
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    if (!ttsSupported()) return;
    const synth = window.speechSynthesis;
    const load = () => {
      voicesRef.current = synth.getVoices();
    };
    load();
    synth.addEventListener?.('voiceschanged', load);
    return () => {
      synth.removeEventListener?.('voiceschanged', load);
      synth.cancel(); // stop any in-flight speech if the bubble unmounts (e.g. on regenerate)
    };
  }, []);

  if (!supported) return null;

  function toggle() {
    const synth = window.speechSynthesis;
    if (speaking) {
      synth.cancel();
      setSpeaking(false);
      return;
    }
    // Speak clean prose, not raw Markdown — otherwise the engine announces
    // every `**`, backtick, link and `§` symbol, which sounds letter-by-letter.
    const spoken = toSpeechText(text);
    if (!spoken) return;
    synth.cancel(); // clear anything queued from another message
    const utter = new SpeechSynthesisUtterance(spoken);
    utter.lang = pickTtsLang(i18n.language);
    // Pick the best natural voice for this language; without it the browser
    // falls back to a robotic default. Leave unset when nothing matches.
    const voices = voicesRef.current.length ? voicesRef.current : synth.getVoices();
    const voice = pickVoice(voices, utter.lang);
    if (voice) utter.voice = voice;
    utter.rate = 1; // natural, measured pace
    utter.pitch = 1;
    utter.onend = () => setSpeaking(false);
    utter.onerror = () => setSpeaking(false);
    setSpeaking(true);
    synth.speak(utter);
  }

  return (
    <button
      type="button"
      className={`${styles.speak} ${speaking ? styles.active : ''}`}
      onClick={toggle}
      aria-label={speaking ? t('chat.stopSpeaking') : t('chat.speak')}
      aria-pressed={speaking}
    >
      {speaking ? <Waveform /> : <span aria-hidden="true">🔊</span>}
      <span className={styles.label}>{speaking ? t('chat.stopSpeaking') : t('chat.speak')}</span>
    </button>
  );
}
