import React from 'react';
import { WordOption } from '../types';
import { DinoGuide } from './GameArea/DinoGuide';
import { OptionsGrid } from './GameArea/OptionsGrid';
import { PageComplete } from './GameArea/PageComplete';

/**
 * State Machine UI State
 * 从状态机传入的 UI 状态
 */
interface StateMachineUI {
  canInteract: boolean;      // 是否可以交互
  dinoEmoji: string;         // Dino 表情
  isLoading: boolean;        // 是否加载中
}

/**
 * Page State
 * 当前页面的状态
 */
interface PageState {
  isComplete: boolean;       // 页面是否完成
  isGeneratingImage: boolean; // 是否正在生成图片
  sentence: string;          // 当前句子
  image: string | null;      // 当前图片
}

/**
 * AI State
 * AI 相关状态
 */
interface AIState {
  comment: string;           // AI 评论
  isSpeaking: boolean;       // AI 是否在说话
  options: WordOption[];     // 可选词语
}

/**
 * Interaction Handlers
 * 交互回调
 */
interface InteractionHandlers {
  onOptionClick: (option: WordOption) => void;
  onContinue: () => void;
  onPlayComment: () => void;
  onPlaySentence?: () => void;
  onImageClick?: () => void;
}

/**
 * Game Options Props
 * 使用组合模式，清晰分组
 */
interface GameOptionsProps {
  stateMachineUI: StateMachineUI;
  pageState: PageState;
  aiState: AIState;
  handlers: InteractionHandlers;
  highlightedWord: string | null;
}

/**
 * Game Options - 游戏选项区域
 * 职责：根据状态组合子组件
 */
export const GameOptions: React.FC<GameOptionsProps> = ({
  stateMachineUI,
  pageState,
  aiState,
  handlers,
  highlightedWord
}) => {
  // 如果页面完成，显示完成状态
  if (pageState.isComplete) {
    return (
      <PageComplete
        sentence={pageState.sentence}
        image={pageState.image}
        isGeneratingImage={pageState.isGeneratingImage}
        onContinue={handlers.onContinue}
        onImageClick={handlers.onImageClick}
        onPlaySentence={handlers.onPlaySentence}
      />
    );
  }

  // 否则显示选项区域
  return (
    <div className="min-h-[140px] sm:min-h-[160px] md:min-h-[240px] flex flex-col gap-3">
      <DinoGuide
        emoji={stateMachineUI.dinoEmoji}
        comment={aiState.comment}
        isLoading={stateMachineUI.isLoading}
        isSpeaking={aiState.isSpeaking}
        onPlayComment={handlers.onPlayComment}
      />

      <OptionsGrid
        options={aiState.options}
        isLoading={stateMachineUI.isLoading}
        canInteract={stateMachineUI.canInteract}
        highlightedWord={highlightedWord}
        onOptionClick={handlers.onOptionClick}
      />
    </div>
  );
};

