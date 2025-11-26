/**
 * 语音播放策略接口
 */
export interface SpeechStrategy {
  speak(text: string, lang: 'en-US' | 'zh-CN'): Promise<void>;
  cancel(): void;
  isAvailable(): boolean;
}

/**
 * 语音配置
 */
export interface SpeechConfig {
  rate?: number;
  pitch?: number;
  volume?: number;
}

/**
 * 语音事件回调
 */
export interface SpeechCallbacks {
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: Error) => void;
  onBoundary?: (word: string) => void;
}

