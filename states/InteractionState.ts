/**
 * 交互状态机 - 状态模式实现
 * 
 * 核心思想：state2 = state1.handle(event)
 * 每个状态是一个对象，知道如何处理事件并转换到下一个状态
 */

import { WordOption } from '../types';
import { AIResponse } from '../services/gemini';

// ============================================
// 事件定义（使用多态替代类型判断）
// ============================================

export abstract class InteractionEvent {
  abstract accept(state: InteractionState, context: StateContext): InteractionState;
}

export class UserClickOptionEvent extends InteractionEvent {
  constructor(public option: WordOption) {
    super();
  }
  accept(state: InteractionState, context: StateContext): InteractionState {
    return state.onUserClickOption(this.option, context);
  }
}

export class AIResponseReceivedEvent extends InteractionEvent {
  constructor(public response: AIResponse) {
    super();
  }
  accept(state: InteractionState, context: StateContext): InteractionState {
    return state.onAIResponseReceived(this.response, context);
  }
}

export class AISpeechEndedEvent extends InteractionEvent {
  accept(state: InteractionState, context: StateContext): InteractionState {
    return state.onAISpeechEnded(context);
  }
}

export class ImageGenerationCompletedEvent extends InteractionEvent {
  constructor(public imageUrl: string) {
    super();
  }
  accept(state: InteractionState, context: StateContext): InteractionState {
    return state.onImageGenerationCompleted(this.imageUrl, context);
  }
}

export class ImageGenerationFailedEvent extends InteractionEvent {
  constructor(public error: Error) {
    super();
  }
  accept(state: InteractionState, context: StateContext): InteractionState {
    return state.onImageGenerationFailed(this.error, context);
  }
}

export class UserClickNextEvent extends InteractionEvent {
  accept(state: InteractionState, context: StateContext): InteractionState {
    return state.onUserClickNext(context);
  }
}

export class ErrorEvent extends InteractionEvent {
  constructor(public error: Error) {
    super();
  }
  accept(state: InteractionState, context: StateContext): InteractionState {
    return state.onError(this.error, context);
  }
}

// ============================================
// UI 配置
// ============================================

export interface StateUIConfig {
  canInteract: boolean;        // 是否可以交互（点击选项）
  statusMessage: string;        // 状态提示文字
  dinoEmoji: string;           // Dino 表情
  showLoading: boolean;        // 是否显示 loading
  disableOptions: boolean;     // 是否禁用选项卡片
}

// ============================================
// 抽象状态基类（使用多态，无 if-else）
// ============================================

export abstract class InteractionState {
  abstract readonly name: string;

  /**
   * 进入状态时执行
   */
  onEnter(context: StateContext): void {
    console.log(`[State] Enter: ${this.name}`);
  }

  /**
   * 离开状态时执行
   */
  onExit(context: StateContext): void {
    console.log(`[State] Exit: ${this.name}`);
  }

  /**
   * 获取 UI 配置
   */
  abstract getUI(): StateUIConfig;

  /**
   * 是否可以交互
   */
  canInteract(): boolean {
    return this.getUI().canInteract;
  }

  // ============================================
  // 事件处理方法（多态，每个状态重写自己关心的方法）
  // 默认实现：不处理，返回自己
  // ============================================

  onUserClickOption(option: WordOption, context: StateContext): InteractionState {
    console.warn(`[${this.name}] Ignoring USER_CLICK_OPTION event`);
    return this;
  }

  onAIResponseReceived(response: AIResponse, context: StateContext): InteractionState {
    console.warn(`[${this.name}] Ignoring AI_RESPONSE_RECEIVED event`);
    return this;
  }

  onAISpeechEnded(context: StateContext): InteractionState {
    console.warn(`[${this.name}] Ignoring AI_SPEECH_ENDED event`);
    return this;
  }

  onImageGenerationCompleted(imageUrl: string, context: StateContext): InteractionState {
    console.warn(`[${this.name}] Ignoring IMAGE_GENERATION_COMPLETED event`);
    return this;
  }

  onImageGenerationFailed(error: Error, context: StateContext): InteractionState {
    console.warn(`[${this.name}] Ignoring IMAGE_GENERATION_FAILED event`);
    return this;
  }

  onUserClickNext(context: StateContext): InteractionState {
    console.warn(`[${this.name}] Ignoring USER_CLICK_NEXT event`);
    return this;
  }

  onError(error: Error, context: StateContext): InteractionState {
    console.error(`[${this.name}] Error:`, error);
    return new IdleState();
  }
}

// ============================================
// 状态上下文（提供给状态访问的数据和方法）
// ============================================

export interface StateContext {
  // 数据
  currentWords: WordOption[];
  selectedOption: WordOption | null;
  aiResponse: AIResponse | null;
  generatedImage: string | null;
  
  // 回调方法
  onStateChange: (newState: InteractionState) => void;
  onRequestAI: (words: WordOption[]) => Promise<AIResponse>;
  onPlayAIComment: (comment: string) => void;
  onGenerateImage: (sentence: string, scene: string, previousImage: string | null) => Promise<string>;
  onSavePage: () => Promise<void>;
}

// ============================================
// 具体状态类
// ============================================

/**
 * 空闲状态 - 等待用户选择
 */
export class IdleState extends InteractionState {
  readonly name = 'IDLE';

  getUI(): StateUIConfig {
    return {
      canInteract: true,
      statusMessage: '',
      dinoEmoji: '🦖',
      showLoading: false,
      disableOptions: false
    };
  }

  // 只重写自己关心的事件
  onUserClickOption(option: WordOption, context: StateContext): InteractionState {
    return new UserSelectingState(option);
  }
}

/**
 * 用户选择中 - 立即反馈
 */
export class UserSelectingState extends InteractionState {
  readonly name = 'USER_SELECTING';
  
  constructor(private selectedOption: WordOption) {
    super();
  }

  onEnter(context: StateContext): void {
    super.onEnter(context);
    context.selectedOption = this.selectedOption;
    
    // 立即转换到下一个状态
    setTimeout(() => {
      if (this.selectedOption.willComplete) {
        // 句子完成
        context.onStateChange(new SentenceCompleteState(this.selectedOption));
      } else {
        // 需要 AI 继续
        context.onStateChange(new AIThinkingState(this.selectedOption));
      }
    }, 100); // 100ms 视觉反馈
  }

  getUI(): StateUIConfig {
    return {
      canInteract: false,
      statusMessage: 'Selected!',
      dinoEmoji: '🦖',
      showLoading: false,
      disableOptions: true
    };
  }

  // 不需要重写任何事件处理方法，因为在 onEnter 中已经自动转换
}

/**
 * AI 思考中 - 等待 API 响应
 */
export class AIThinkingState extends InteractionState {
  readonly name = 'AI_THINKING';
  
  constructor(private selectedOption: WordOption) {
    super();
  }

  onEnter(context: StateContext): void {
    super.onEnter(context);
    
    // 发起 API 请求
    const newWords = [...context.currentWords, this.selectedOption];
    context.onRequestAI(newWords)
      .then(response => {
        context.aiResponse = response;
        context.onStateChange(new AISpeakingState(response));
      })
      .catch(error => {
        console.error('[AIThinkingState] API error:', error);
        context.onStateChange(new IdleState());
      });
  }

  getUI(): StateUIConfig {
    return {
      canInteract: false,
      statusMessage: 'Thinking...',
      dinoEmoji: '🤔',
      showLoading: true,
      disableOptions: true
    };
  }

  // 只重写自己关心的事件
  onAIResponseReceived(response: AIResponse, context: StateContext): InteractionState {
    return new AISpeakingState(response);
  }
}

/**
 * AI 说话中 - 播放 aiComment
 */
export class AISpeakingState extends InteractionState {
  readonly name = 'AI_SPEAKING';
  
  constructor(private aiResponse: AIResponse) {
    super();
  }

  onEnter(context: StateContext): void {
    super.onEnter(context);
    
    // 播放 AI 评论
    setTimeout(() => {
      context.onPlayAIComment(this.aiResponse.aiComment);
    }, 300);
  }

  getUI(): StateUIConfig {
    return {
      canInteract: false,
      statusMessage: this.aiResponse.aiComment,
      dinoEmoji: '🦖',
      showLoading: false,
      disableOptions: true
    };
  }

  // 只重写自己关心的事件
  onAISpeechEnded(context: StateContext): InteractionState {
    return new IdleState();
  }
}

/**
 * 句子完成状态 - 准备生成图片
 */
export class SentenceCompleteState extends InteractionState {
  readonly name = 'SENTENCE_COMPLETE';
  
  constructor(private completingOption: WordOption) {
    super();
  }

  onEnter(context: StateContext): void {
    super.onEnter(context);
    
    // 短暂延迟后开始生成图片
    setTimeout(() => {
      context.onStateChange(new ImageGeneratingState());
    }, 800);
  }

  getUI(): StateUIConfig {
    return {
      canInteract: false,
      statusMessage: 'Great sentence!',
      dinoEmoji: '🎉',
      showLoading: false,
      disableOptions: true
    };
  }

  // 不需要重写任何事件处理方法，因为在 onEnter 中已经自动转换
}

/**
 * 图片生成中
 */
export class ImageGeneratingState extends InteractionState {
  readonly name = 'IMAGE_GENERATING';

  onEnter(context: StateContext): void {
    super.onEnter(context);
    
    // 触发图片生成
    const sentence = context.currentWords.map(w => w.word).join(' ');
    // scene 和 previousImage 需要从外部传入，这里简化处理
    // 实际实现中，context 应该包含这些信息
  }

  getUI(): StateUIConfig {
    return {
      canInteract: false,
      statusMessage: 'Painting your page... 🎨',
      dinoEmoji: '🎨',
      showLoading: true,
      disableOptions: true
    };
  }

  // 只重写自己关心的事件
  onImageGenerationCompleted(imageUrl: string, context: StateContext): InteractionState {
    context.generatedImage = imageUrl;
    return new PageCompleteState(imageUrl);
  }

  onImageGenerationFailed(error: Error, context: StateContext): InteractionState {
    console.error('[ImageGeneratingState] Image generation failed:', error);
    return new IdleState();
  }
}

/**
 * 页面完成 - 等待用户点击 Next
 */
export class PageCompleteState extends InteractionState {
  readonly name = 'PAGE_COMPLETE';
  
  constructor(private imageUrl: string) {
    super();
  }

  getUI(): StateUIConfig {
    return {
      canInteract: false, // 此时不能点击选项，只能点击 Next
      statusMessage: 'Perfect! One more page done!',
      dinoEmoji: '✨',
      showLoading: false,
      disableOptions: true
    };
  }

  // 只重写自己关心的事件
  onUserClickNext(context: StateContext): InteractionState {
    // 保存页面
    context.onSavePage().then(() => {
      context.onStateChange(new IdleState());
    });
    return this; // 保持当前状态，等待保存完成
  }

  onExit(context: StateContext): void {
    super.onExit(context);
    // 清理状态
    context.selectedOption = null;
    context.aiResponse = null;
    context.generatedImage = null;
  }
}

// ============================================
// 状态机管理器（使用访问者模式，无 if-else）
// ============================================

export class InteractionStateMachine {
  private currentState: InteractionState;
  private context: StateContext;

  constructor(context: StateContext) {
    this.context = context;
    this.currentState = new IdleState();
    this.currentState.onEnter(this.context);
  }

  /**
   * 处理事件（使用访问者模式，无 if-else）
   */
  handleEvent(event: InteractionEvent): void {
    console.log(`[StateMachine] Event: ${event.constructor.name} in state: ${this.currentState.name}`);
    
    // 使用访问者模式：event.accept(state) 会调用对应的 state.onXXX() 方法
    const newState = event.accept(this.currentState, this.context);
    
    if (newState !== this.currentState) {
      this.transitionTo(newState);
    }
  }

  /**
   * 转换到新状态
   */
  transitionTo(newState: InteractionState): void {
    console.log(`[StateMachine] Transition: ${this.currentState.name} → ${newState.name}`);
    
    this.currentState.onExit(this.context);
    this.currentState = newState;
    this.currentState.onEnter(this.context);
    
    // 通知外部状态变化
    this.context.onStateChange(newState);
  }

  /**
   * 获取当前状态
   */
  getCurrentState(): InteractionState {
    return this.currentState;
  }

  /**
   * 获取当前 UI 配置
   */
  getUI(): StateUIConfig {
    return this.currentState.getUI();
  }

  /**
   * 是否可以交互
   */
  canInteract(): boolean {
    return this.currentState.canInteract();
  }
}

