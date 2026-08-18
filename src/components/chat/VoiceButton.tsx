import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { pickSpeechLang } from '@/calc/chat/speech';
import { Waveform } from './Waveform';
import styles from './VoiceButton.module.css';

/**
 * A mic button that dictates into the composer via the Web Speech API. It
 * feature-detects `SpeechRecognition` and renders nothing when unavailable (most
 * non-Chromium engines), so it never offers a control that can't work. The
 * recognised transcript is handed back through `onTranscript`; recognition
 * language tracks the active app language.
 */

// Minimal shape of the slice of the Web Speech API we touch (it isn't in lib.dom).
interface RecognitionLike {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start(): void;
  stop(): void;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
}

type RecognitionCtor = new () => RecognitionLike;

function getRecognitionCtor(): RecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    SpeechRecognition?: RecognitionCtor;
    webkitSpeechRecognition?: RecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function VoiceButton({ onTranscript }: { onTranscript: (text: string) => void }) {
  const { t, i18n } = useTranslation();
  const [supported] = useState(() => getRecognitionCtor() !== null);
  const [listening, setListening] = useState(false);
  const recRef = useRef<RecognitionLike | null>(null);

  // Tear the recogniser down on unmount so the mic is released.
  useEffect(() => () => recRef.current?.stop(), []);

  if (!supported) return null;

  function toggle() {
    if (listening) {
      recRef.current?.stop();
      return;
    }
    const Ctor = getRecognitionCtor();
    if (!Ctor) return;
    const rec = new Ctor();
    rec.lang = pickSpeechLang(i18n.language);
    rec.interimResults = false;
    rec.continuous = false;
    rec.onresult = (event) => {
      const said = event.results?.[0]?.[0]?.transcript;
      if (said) onTranscript(said);
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recRef.current = rec;
    setListening(true);
    rec.start();
  }

  return (
    <button
      type="button"
      className={`${styles.mic} ${listening ? styles.listening : ''}`}
      onClick={toggle}
      aria-label={listening ? t('chat.voice.stop') : t('chat.voice.start')}
      aria-pressed={listening}
      title={listening ? t('chat.voice.listening') : t('chat.voice.start')}
    >
      {listening ? <Waveform /> : <span aria-hidden="true">🎤</span>}
    </button>
  );
}
