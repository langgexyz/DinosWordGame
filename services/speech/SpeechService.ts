import { SpeechStrategy, SpeechConfig, SpeechCallbacks } from './SpeechStrategy';
import { WebSpeechStrategy } from './WebSpeechStrategy';

/**
 * 语音服务 - 管理语音播放策略
 */
export class SpeechService {
  private strategy: SpeechStrategy;

  constructor(strategy?: SpeechStrategy) {
    this.strategy = strategy || new WebSpeechStrategy();
  }

  /**
   * 切换语音策略（未来可以支持其他 TTS 服务）
   */
  setStrategy(strategy: SpeechStrategy): void {
    this.strategy.cancel();
    this.strategy = strategy;
  }

  /**
   * 播放语音
   */
  async speak(text: string, lang: 'en-US' | 'zh-CN' = 'zh-CN'): Promise<void> {
    if (!this.strategy.isAvailable()) {
      console.warn('Speech synthesis not available');
      return;
    }

    try {
      await this.strategy.speak(text, lang);
    } catch (error) {
      console.error('Speech error:', error);
    }
  }

  /**
   * 停止播放
   */
  cancel(): void {
    this.strategy.cancel();
  }

  /**
   * 检查是否可用
   */
  isAvailable(): boolean {
    return this.strategy.isAvailable();
  }
}

/**
 * 创建语音服务实例的工厂函数
 */
export function createSpeechService(
  config?: SpeechConfig,
  callbacks?: SpeechCallbacks
): SpeechService {
  const strategy = new WebSpeechStrategy(config, callbacks);
  return new SpeechService(strategy);
}

