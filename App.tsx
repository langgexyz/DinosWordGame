import React, { useState, useEffect, useRef, useMemo } from 'react';
import { GameState, WordOption, StoryPage } from './types';
import { fetchGameStep, generateStoryImage } from './services/gemini';
import { createSpeechService } from './services/speech';
import { GameHeader } from './components/GameHeader';
import { DinoCompanion } from './components/DinoCompanion';
import { SentenceDisplay } from './components/SentenceDisplay';
import { GameOptions } from './components/GameOptions';
import { Button } from './components/Button';
import { RefreshCw } from 'lucide-react';
import { clsx } from 'clsx';

// Theme configurations for different scenes
const SCENE_THEMES: Record<string, string> = {
  forest: "bg-gradient-to-b from-green-50 to-emerald-100",
  ocean: "bg-gradient-to-b from-cyan-50 to-blue-100",
  space: "bg-gradient-to-b from-indigo-50 to-purple-100",
  city: "bg-gradient-to-b from-gray-50 to-slate-200",
  home: "bg-gradient-to-b from-orange-50 to-yellow-100",
  magic: "bg-gradient-to-b from-pink-50 to-rose-100",
  school: "bg-gradient-to-b from-yellow-50 to-amber-100",
  park: "bg-gradient-to-b from-green-50 to-lime-100",
  playground: "bg-gradient-to-b from-purple-50 to-pink-100",
  street: "bg-gradient-to-b from-gray-50 to-zinc-100",
  hospital: "bg-gradient-to-b from-blue-50 to-cyan-100",
  restaurant: "bg-gradient-to-b from-orange-50 to-red-100",
  library: "bg-gradient-to-b from-indigo-50 to-blue-100",
  shop: "bg-gradient-to-b from-pink-50 to-rose-100",
  default: "bg-gradient-to-b from-blue-50 to-slate-100"
};

const SCENE_ELEMENTS: Record<string, string> = {
  forest: "🍃",
  ocean: "🫧",
  space: "✨",
  city: "🏙️",
  home: "🏠",
  magic: "🪄",
  school: "📚",
  park: "🌳",
  playground: "🛝",
  street: "🚦",
  hospital: "🏥",
  restaurant: "🍽️",
  library: "📖",
  shop: "🛒",
  default: "🎈"
};

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>({
    history: [],
    currentSentence: [],
    aiComment: "Rawr! Let's play!",
    nextOptions: [],
    isComplete: false,
    englishTranslation: "",
    scene: { type: 'default', backgroundEmoji: '🦕', colorTheme: '' }
  });
  
  const [loading, setLoading] = useState(false);
  const [started, setStarted] = useState(false);
  const [storyImage, setStoryImage] = useState<string | null>(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isPlayingFullSentence, setIsPlayingFullSentence] = useState(false);
  const [isDinoSpeaking, setIsDinoSpeaking] = useState(false);
  const [highlightedWord, setHighlightedWord] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // 创建语音服务实例
  const speechService = useMemo(() => createSpeechService({}, {
    onStart: () => {},
    onEnd: () => {
      setIsDinoSpeaking(false);
      setIsPlayingFullSentence(false);
      setHighlightedWord(null);
    },
    onBoundary: (word) => {
      const matchedOption = gameState.nextOptions.find(
        opt => opt.word.toLowerCase() === word
      );
      if (matchedOption) {
        setHighlightedWord(word);
        setTimeout(() => setHighlightedWord(null), 1500);
      }
    }
  }), [gameState.nextOptions]);

  const themeClass = SCENE_THEMES[gameState.scene?.type] || SCENE_THEMES.default;
  const floatingEmoji = SCENE_ELEMENTS[gameState.scene?.type] || SCENE_ELEMENTS.default;

  // 处理游戏步骤
  const processGameStep = async (sentence: WordOption[], history: StoryPage[]) => {
    setLoading(true);
    setHasError(false);
    
    try {
      const nextState = await fetchGameStep(sentence, history);
      setGameState(nextState);
      
      if (!nextState.isComplete) {
        setTimeout(() => speechService.speak(nextState.aiComment, "zh-CN"), 800);
      }

      // Token usage logging
      if (nextState.tokenUsage) {
        console.log('[Token Usage]', nextState.tokenUsage);
      }
    } catch (error) {
      console.error("Game processing error:", error);
      setHasError(true);
    } finally {
      setLoading(false);
    }
  };

  // 开始游戏
  const startGame = async () => {
    setLoading(true);
    setStarted(true);
    speechService.speak("吼吼！故事开始啦！", "zh-CN");
    await processGameStep([], []);
  };

  // 重试
  const retryLastAction = async () => {
    await processGameStep(gameState.currentSentence, gameState.history);
  };

  // 选择单词
  const handleOptionClick = async (option: WordOption) => {
    const newSentence = [...gameState.currentSentence, option];
    
    // 累加播放：读出从头开始的完整句子，增强记忆
    const fullText = newSentence.map(w => w.word).join(' ');
    speechService.speak(fullText, "en-US");
    
    setGameState(prev => ({
      ...prev,
      currentSentence: newSentence,
      nextOptions: [],
    }));

    await processGameStep(newSentence, gameState.history);
  };

  // 播放完整句子
  const handlePlayFullSentence = () => {
    if (isPlayingFullSentence) {
      speechService.cancel();
      setIsPlayingFullSentence(false);
    } else {
      const text = gameState.currentSentence.map(w => w.word).join(' ');
      setIsPlayingFullSentence(true);
      speechService.speak(text, "en-US");
    }
  };

  // 继续故事
  const continueStory = async () => {
    const completedSentenceText = gameState.currentSentence.map(w => w.word).join(' ');
    const newPage: StoryPage = {
      text: completedSentenceText,
      image: storyImage || null,
      translation: gameState.englishTranslation
    };
    const newHistory = [...gameState.history, newPage];

    setGameState(prev => ({
      ...prev,
      history: newHistory,
      currentSentence: [],
      isComplete: false,
      aiComment: "Thinking...",
      nextOptions: [],
      englishTranslation: ""
    }));
    setStoryImage(null);

    await processGameStep([], newHistory);
  };

  // 朗读整个故事
  const playWholeStory = () => {
    const history = gameState.history.map(p => p.text).join('. ');
    speechService.speak(history, "en-US");
  };

  // 播放完成句子的英文
  const playCompletedSentence = () => {
    if (gameState.englishTranslation) {
      speechService.speak(gameState.englishTranslation, "en-US");
    }
  };

  // 完成时生成图片
  useEffect(() => {
    if (gameState.isComplete) {
      const text = gameState.currentSentence.map(w => w.word).join(' ');
      speechService.speak(text, "en-US");
      
      const generateAndAdvance = async () => {
        setIsGeneratingImage(true);
        const img = await generateStoryImage(text, gameState.scene.type);
        setStoryImage(img);
        setIsGeneratingImage(false);
      };

      generateAndAdvance();
    }
  }, [gameState.isComplete]);

  // 开始屏幕
  if (!started) {
    return (
      <div className="min-h-screen bg-sky-50 flex items-center justify-center p-6 md:p-8 relative overflow-hidden">
        <div className="blob bg-green-300 w-64 h-64 md:w-96 md:h-96 rounded-full top-0 left-0 mix-blend-multiply blur-3xl opacity-50"></div>
        <div className="blob bg-purple-300 w-64 h-64 md:w-96 md:h-96 rounded-full bottom-0 right-0 mix-blend-multiply blur-3xl opacity-50"></div>

        <div className="bg-white/90 backdrop-blur-xl p-8 md:p-16 rounded-[2rem] md:rounded-[3rem] shadow-2xl text-center max-w-2xl w-full border-4 border-white/50 animate-fade-in-up">
          <div className="text-7xl md:text-9xl mb-6 md:mb-8 animate-bounce inline-block">🦖</div>
          <h1 className="text-4xl sm:text-5xl md:text-7xl font-black text-slate-800 mb-4 md:mb-6 tracking-tight">
            Dino's <span className="text-green-500">Story</span>
          </h1>
          <p className="text-slate-500 text-lg md:text-2xl mb-8 md:mb-10 font-medium leading-relaxed">
            Listen, Speak, and Play!<br/>
            <span className="text-sm md:text-base text-slate-400 mt-2 block">Parent-Child English Adventure</span>
          </p>
          <Button onClick={startGame} size="lg" className="w-full text-xl md:text-2xl py-6 md:py-8 rounded-2xl md:rounded-3xl shadow-lg bg-green-500 hover:bg-green-600 active:scale-95 transition-all">
            Start Adventure! 🚀
          </Button>
        </div>
      </div>
    );
  }

  // 游戏界面
  return (
    <div className={clsx("min-h-screen flex flex-col transition-colors duration-1000", themeClass)}>
      
      {/* 错误弹窗 */}
      {hasError && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] p-8 max-w-md w-full text-center shadow-2xl animate-pop-in border-4 border-red-100">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-4xl">🤕</span>
            </div>
            <h3 className="text-2xl font-black text-slate-800 mb-2">Oops! Dino tripped!</h3>
            <p className="text-slate-500 mb-6 text-lg">We couldn't reach the magic cloud.</p>
            <Button onClick={retryLastAction} className="w-full bg-red-400 hover:bg-red-500 py-4 text-xl">
              <RefreshCw className="w-5 h-5 mr-2" /> Try Again
            </Button>
          </div>
        </div>
      )}

      {/* 背景动画元素 */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        {Array.from({ length: 6 }).map((_, i) => (
          <div 
            key={i}
            className="absolute text-2xl md:text-4xl opacity-20 animate-float"
            style={{
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              animationDelay: `${i * 2}s`,
              animationDuration: `${10 + Math.random() * 10}s`
            }}
          >
            {floatingEmoji}
          </div>
        ))}
      </div>

      <div className="w-full max-w-5xl mx-auto flex flex-col h-screen p-3 sm:p-4 md:p-6 lg:p-8 relative z-10">
        
        {/* 顶部栏 */}
        <GameHeader 
          scene={gameState.scene}
          historyLength={gameState.history.length}
          onReadStory={playWholeStory}
        />

        {/* 小恐龙伙伴区域 */}
        <DinoCompanion 
          comment={gameState.aiComment}
          isLoading={loading}
          isGeneratingImage={isGeneratingImage}
          isDinoSpeaking={isDinoSpeaking}
          onSpeak={() => speechService.speak(gameState.aiComment, "zh-CN")}
        />

        {/* 句子显示区域 */}
        <SentenceDisplay 
          words={gameState.currentSentence}
          isComplete={gameState.isComplete}
          isLoading={loading}
          isPlayingFullSentence={isPlayingFullSentence}
          onPlaySentence={handlePlayFullSentence}
        />

        {/* 交互区域 */}
        <GameOptions 
          isComplete={gameState.isComplete}
          isGeneratingImage={isGeneratingImage}
          storyImage={storyImage}
          englishTranslation={gameState.englishTranslation}
          options={gameState.nextOptions}
          loading={loading}
          highlightedWord={highlightedWord}
          onOptionClick={handleOptionClick}
          onContinue={continueStory}
          onImageClick={() => storyImage && setImagePreview(storyImage)}
          onPlaySentence={playCompletedSentence}
        />

      </div>

      {/* 图片预览弹窗 */}
      {imagePreview && (
        <div 
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setImagePreview(null)}
        >
          <div className="relative max-w-4xl w-full max-h-[90vh] animate-pop-in">
            <img 
              src={imagePreview} 
              alt="Story preview" 
              className="w-full h-full object-contain rounded-2xl shadow-2xl"
            />
            <button 
              onClick={() => setImagePreview(null)}
              className="absolute top-4 right-4 w-12 h-12 bg-white/90 hover:bg-white rounded-full flex items-center justify-center text-2xl font-bold text-slate-700 shadow-lg transition-all hover:scale-110 active:scale-95"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
