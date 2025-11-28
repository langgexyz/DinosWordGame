/**
 * 交互状态机 Hook
 * 
 * 用法：
 * const { stateMachine, stateUI, handleUserClick, handleAIResponse, ... } = useInteractionStateMachine({
 *   onRequestAI: async (words) => { ... },
 *   onPlayAIComment: (comment) => { ... },
 *   ...
 * });
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  InteractionStateMachine,
  InteractionState,
  StateContext,
  StateUIConfig,
  IdleState,
  UserClickOptionEvent,
  AIResponseReceivedEvent,
  AISpeechEndedEvent,
  ImageGenerationCompletedEvent,
  ImageGenerationFailedEvent,
  UserClickNextEvent,
  ErrorEvent
} from '../states/InteractionState';
import { WordOption } from '../types';
import { AIResponse } from '../services/gemini';

interface UseInteractionStateMachineProps {
  currentWords: WordOption[];
  onRequestAI: (words: WordOption[]) => Promise<AIResponse>;
  onPlayAIComment: (comment: string) => void;
  onGenerateImage: (sentence: string, scene: string, previousImage: string | null) => Promise<string>;
  onSavePage: () => Promise<void>;
}

export const useInteractionStateMachine = (props: UseInteractionStateMachineProps) => {
  const {
    currentWords,
    onRequestAI,
    onPlayAIComment,
    onGenerateImage,
    onSavePage
  } = props;

  // 状态数据
  const [selectedOption, setSelectedOption] = useState<WordOption | null>(null);
  const [aiResponse, setAIResponse] = useState<AIResponse | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [currentState, setCurrentState] = useState<InteractionState>(new IdleState());
  const [stateUI, setStateUI] = useState<StateUIConfig>(new IdleState().getUI());

  // 状态机实例（使用 ref 保持引用稳定）
  const stateMachineRef = useRef<InteractionStateMachine | null>(null);

  // 初始化状态机
  useEffect(() => {
    const context: StateContext = {
      currentWords,
      selectedOption,
      aiResponse,
      generatedImage,
      onStateChange: (newState: InteractionState) => {
        setCurrentState(newState);
        setStateUI(newState.getUI());
      },
      onRequestAI,
      onPlayAIComment,
      onGenerateImage,
      onSavePage
    };

    stateMachineRef.current = new InteractionStateMachine(context);
    setCurrentState(stateMachineRef.current.getCurrentState());
    setStateUI(stateMachineRef.current.getUI());
  }, []); // 只初始化一次

  // 更新 context（当依赖变化时）
  useEffect(() => {
    if (stateMachineRef.current) {
      const machine = stateMachineRef.current as any;
      machine.context.currentWords = currentWords;
      machine.context.selectedOption = selectedOption;
      machine.context.aiResponse = aiResponse;
      machine.context.generatedImage = generatedImage;
    }
  }, [currentWords, selectedOption, aiResponse, generatedImage]);

  // ============================================
  // 事件处理方法
  // ============================================

  const handleUserClickOption = useCallback((option: WordOption) => {
    if (!stateMachineRef.current) return;
    
    console.log('[Hook] User clicked option:', option.word);
    setSelectedOption(option);
    
    stateMachineRef.current.handleEvent(new UserClickOptionEvent(option));
  }, []);

  const handleAIResponseReceived = useCallback((response: AIResponse) => {
    if (!stateMachineRef.current) return;
    
    console.log('[Hook] AI response received');
    setAIResponse(response);
    
    stateMachineRef.current.handleEvent(new AIResponseReceivedEvent(response));
  }, []);

  const handleAISpeechEnded = useCallback(() => {
    if (!stateMachineRef.current) return;
    
    console.log('[Hook] AI speech ended');
    
    stateMachineRef.current.handleEvent(new AISpeechEndedEvent());
  }, []);

  const handleImageGenerationCompleted = useCallback((imageUrl: string) => {
    if (!stateMachineRef.current) return;
    
    console.log('[Hook] Image generation completed');
    setGeneratedImage(imageUrl);
    
    stateMachineRef.current.handleEvent(new ImageGenerationCompletedEvent(imageUrl));
  }, []);

  const handleImageGenerationFailed = useCallback((error: Error) => {
    if (!stateMachineRef.current) return;
    
    console.error('[Hook] Image generation failed:', error);
    
    stateMachineRef.current.handleEvent(new ImageGenerationFailedEvent(error));
  }, []);

  const handleUserClickNext = useCallback(() => {
    if (!stateMachineRef.current) return;
    
    console.log('[Hook] User clicked Next');
    
    stateMachineRef.current.handleEvent(new UserClickNextEvent());
  }, []);

  const handleError = useCallback((error: Error) => {
    if (!stateMachineRef.current) return;
    
    console.error('[Hook] Error occurred:', error);
    
    stateMachineRef.current.handleEvent(new ErrorEvent(error));
  }, []);

  // ============================================
  // 返回值
  // ============================================

  return {
    // 状态机实例
    stateMachine: stateMachineRef.current,
    
    // 当前状态
    currentState,
    
    // UI 配置
    stateUI,
    
    // 状态数据
    selectedOption,
    aiResponse,
    generatedImage,
    
    // 事件处理方法
    handleUserClickOption,
    handleAIResponseReceived,
    handleAISpeechEnded,
    handleImageGenerationCompleted,
    handleImageGenerationFailed,
    handleUserClickNext,
    handleError,
    
    // 便捷方法
    canInteract: stateUI.canInteract,
    isLoading: stateUI.showLoading
  };
};

