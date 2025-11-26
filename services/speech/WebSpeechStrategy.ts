import { SpeechStrategy, SpeechConfig, SpeechCallbacks } from './SpeechStrategy';

/**
 * 基于 Web Speech API 的语音播放策略
 */
export class WebSpeechStrategy implements SpeechStrategy {
  private config: SpeechConfig;
  private callbacks: SpeechCallbacks;

  constructor(config: SpeechConfig = {}, callbacks: SpeechCallbacks = {}) {
    this.config = {
      rate: 1.0,
      pitch: 1.2,
      volume: 1.0,
      ...config
    };
    this.callbacks = callbacks;
  }

  isAvailable(): boolean {
    return 'speechSynthesis' in window;
  }

  async speak(text: string, lang: 'en-US' | 'zh-CN'): Promise<void> {
    if (!this.isAvailable()) {
      throw new Error('Web Speech API not available');
    }

    return new Promise((resolve, reject) => {
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang;
      utterance.rate = lang === 'en-US' 
        ? (this.config.rate || 1.0) * 0.85 
        : this.config.rate || 1.1;
      utterance.pitch = this.config.pitch || 1.2;
      utterance.volume = this.config.volume || 1.0;

      // 选择合适的语音
      const voices = window.speechSynthesis.getVoices();
      const preferredVoice = voices.find(v => v.lang.includes(lang));
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }

      // 事件处理
      utterance.onstart = () => {
        this.callbacks.onStart?.();
      };

      utterance.onboundary = (event) => {
        if (event.name === 'word') {
          const textFromIndex = utterance.text.slice(event.charIndex);
          const match = textFromIndex.match(/^[\w']+/);
          if (match) {
            this.callbacks.onBoundary?.(match[0].toLowerCase());
          }
        }
      };

      utterance.onend = () => {
        this.callbacks.onEnd?.();
        resolve();
      };

      utterance.onerror = (event) => {
        const error = new Error(`Speech synthesis error: ${event.error}`);
        this.callbacks.onError?.(error);
        reject(error);
      };

      window.speechSynthesis.speak(utterance);
    });
  }

  cancel(): void {
    if (this.isAvailable()) {
      window.speechSynthesis.cancel();
    }
  }
}

