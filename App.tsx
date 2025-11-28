import React, { useState, useEffect, useMemo } from 'react';
import { GameState, WordOption, StoryPage, Scene, CreationPhase, Story, CharacterInfo } from './types';
import { fetchGameStep, generateStoryImage, generateStoryTitle, AIResponse, StoryHistory, ChunkContext } from './services/gemini';
import { createSpeechService } from './services/speech';
import { GameHeader } from './components/GameHeader';
import { GameOptions } from './components/GameOptions';
import { StoryLibrary } from './components/StoryLibrary/StoryLibrary';
import { StoryReader } from './components/StoryReader/StoryReader';
import { CompletedPagesViewer } from './components/CompletedPagesViewer';
import { Button } from './components/Button';
import { RefreshCw } from 'lucide-react';
import { clsx } from 'clsx';
import { useStoryStore } from './stores/storyStore';
import { useUsageStore } from './stores/usageStore';
import { useChunkStore } from './stores/chunkStore';
import { generateStoryCover } from './data/storyCover';

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
  // 初始化游戏状态 - 基于新的数据模型
  const [gameState, setGameState] = useState<GameState>({
    currentStoryId: null,  // null 表示新故事
    currentPage: {
      words: [],
      scene: { type: 'default', backgroundEmoji: '🦕', colorTheme: '' },
      isComplete: false
    },
    ai: {
      comment: "Rawr! Let's play!",
    nextOptions: [],
      phase: 'building'
    },
    ui: {
      isGeneratingImage: false,
      generatedImage: null,
      loading: false,
      error: null
    }
  });
  
  // UI 路由状态
  type ViewMode = 'start' | 'game' | 'library' | 'reader';
  const [viewMode, setViewMode] = useState<ViewMode>('start');
  const [readingStory, setReadingStory] = useState<Story | null>(null);

  const [isDinoSpeaking, setIsDinoSpeaking] = useState(false);
  const [highlightedWord, setHighlightedWord] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  
  // 故事操作
  const { addStory, updateStory, getStory } = useStoryStore();
  
  // 使用统计操作
  const { 
    recordCharacter, 
    recordScene, 
    recordStory, 
    getMostUsedCharacters, 
    getMostUsedScenes 
  } = useUsageStore();
  
  // Chunk 学习操作
  const {
    recordChunk,
    getChunksByProficiency,
    suggestChunksForReview
  } = useChunkStore();
  
  // 当前故事的角色信息
  const [currentCharacter, setCurrentCharacter] = useState<CharacterInfo | null>(null);

  // 创建语音服务实例
  const speechService = useMemo(() => createSpeechService({}, {
    onStart: () => {},
    onEnd: () => {
      setIsDinoSpeaking(false);
      setHighlightedWord(null);
    },
    onBoundary: (word) => {
      const matchedOption = gameState.ai.nextOptions.find(
        opt => opt.word.toLowerCase() === word
            );
            if (matchedOption) {
        setHighlightedWord(word);
              setTimeout(() => setHighlightedWord(null), 1500);
            }
          }
  }), [gameState.ai.nextOptions]);

  // 获取当前故事（如果存在）
  const getCurrentStory = (): Story | undefined => {
    if (!gameState.currentStoryId) return undefined;
    return getStory(gameState.currentStoryId);
  };
  
  // 获取当前故事的所有已完成页面
  const getCompletedPages = (): StoryPage[] => {
    const story = getCurrentStory();
    return story?.pages || [];
  };
  
  const currentScene = gameState.currentPage.scene;
  const themeClass = SCENE_THEMES[currentScene?.type] || SCENE_THEMES.default;
  const floatingEmoji = SCENE_ELEMENTS[currentScene?.type] || SCENE_ELEMENTS.default;

  // ============================================
  // 核心业务逻辑
  // ============================================
  
  // 处理游戏步骤 - 请求 AI 获取下一步引导
  const processGameStep = async (currentWords: WordOption[]) => {
    setGameState(prev => ({
      ...prev,
      ui: { ...prev.ui, loading: true, error: null }
    }));
    
    try {
      // 获取已完成的页面历史
      const completedPages = getCompletedPages();
      
      // 准备使用历史数据（仅在新故事时传递）
      let usageHistory: StoryHistory | undefined;
      let chunkContext: ChunkContext | undefined;
      
      if (completedPages.length === 0 && currentWords.length === 0) {
        // 新故事开始，传递历史数据
        usageHistory = {
          characters: getMostUsedCharacters(5),
          scenes: getMostUsedScenes(5),
          totalStories: useUsageStore.getState().totalStories
        };
      }
      
      // 准备 Chunk 学习上下文（每次都传递）
      chunkContext = {
        masteredChunks: getChunksByProficiency('mastered').map(c => c.chunk),
        familiarChunks: getChunksByProficiency('familiar').map(c => c.chunk),
        learningChunks: getChunksByProficiency('learning').map(c => c.chunk),
        newChunks: getChunksByProficiency('new').map(c => c.chunk),
        chunksForReview: suggestChunksForReview()
      };
      
      const aiResponse: AIResponse = await fetchGameStep(
        currentWords,
        completedPages,
        usageHistory,
        chunkContext
      );
      
      // 如果 AI 返回了角色信息，记录它
      if (aiResponse.characterInfo && !currentCharacter) {
        setCurrentCharacter(aiResponse.characterInfo);
        console.log('[App] Character detected:', aiResponse.characterInfo.name);
      }

      // 更新状态
      setGameState(prev => ({
        ...prev,
        currentPage: {
          words: currentWords,
          scene: aiResponse.scene,
          isComplete: false  // Completion determined by user's option choice, not AI
        },
        ai: {
          comment: aiResponse.aiComment,
          nextOptions: aiResponse.nextOptions,
          phase: 'building'
        },
        ui: { ...prev.ui, loading: false }
      }));
      
      // 播放 AI 评论
      setTimeout(() => speechService.speak(aiResponse.aiComment, "en-US"), 800);
    } catch (error) {
      console.error("Game processing error:", error);
      setGameState(prev => ({
        ...prev,
        ui: { ...prev.ui, loading: false, error: 'AI encountered an error' }
      }));
    }
  };

  // 开始游戏
  const startGame = async () => {
    setViewMode('game');
    speechService.speak("Let's create a story together!", "en-US");
    
    // 重置角色信息（新故事）
    setCurrentCharacter(null);
    
    // 只创建临时会话ID，不立即保存到 store（防止空故事）
    const sessionId = `story-${Date.now()}`;
    
    // 设置为当前创作的故事ID（但还未创建实际 Story 对象）
    setGameState(prev => ({
      ...prev,
      currentStoryId: sessionId
    }));
    
    await processGameStep([]);
  };
  
  // 打开绘本库
  const openLibrary = () => {
    setViewMode('library');
  };
  
  // 打开阅读器
  const openReader = (story: Story) => {
    setReadingStory(story);
    setViewMode('reader');
  };
  
  // 继续创作故事
  const continueCreatingStory = async (story: Story) => {
    // 进入游戏模式
    setViewMode('game');
    speechService.speak("Let's continue our story!", "en-US");
    
    // 恢复故事的角色信息
    if (story.character) {
      setCurrentCharacter(story.character);
    }
    
    // 设置为当前创作的故事
    const lastPage = story.pages[story.pages.length - 1];
    setGameState(prev => ({
      ...prev,
      currentStoryId: story.id,
      currentPage: {
        words: [],
        scene: lastPage?.scene || { type: 'default', backgroundEmoji: '🦕', colorTheme: '' },
        isComplete: false
      }
    }));
    
    // 使用 story.pages 直接传递历史（避免状态延迟）
    try {
      const aiResponse: AIResponse = await fetchGameStep([], story.pages);
      
      setGameState(prev => ({
        ...prev,
        currentPage: {
          words: [],
          scene: aiResponse.scene,
          isComplete: false  // Completion determined by user's option choice
        },
        ai: {
          comment: aiResponse.aiComment,
          nextOptions: aiResponse.nextOptions,
          phase: 'building'
        },
        ui: { ...prev.ui, loading: false }
      }));
      
      // 播放 AI 评论
      setTimeout(() => speechService.speak(aiResponse.aiComment, "en-US"), 800);
    } catch (error) {
      console.error('Failed to continue story:', error);
      setGameState(prev => ({
        ...prev,
        ui: { ...prev.ui, error: 'Failed to load story context', loading: false }
      }));
    }
  };
  
  // 返回开始界面
  const backToStart = () => {
    setViewMode('start');
    setReadingStory(null);
  };

  // 重试
  const retryLastAction = async () => {
    await processGameStep(gameState.currentPage.words);
  };

  // 选择单词
  const handleOptionClick = async (option: WordOption) => {
    const newWords = [...gameState.currentPage.words, option];
    
    // 累加播放：读出从头开始的完整句子，增强记忆
    const fullText = newWords.map(w => w.word).join(' ');
    speechService.speak(fullText, "en-US");
    
    // 记录 Chunk 使用（核心学习功能）
    const allChunksInSentence = newWords.map(w => w.word);
    recordChunk(
      option.word,           // 当前选择的 chunk
      fullText,              // 完整句子上下文
      allChunksInSentence    // 同句子中的其他 chunks
    );

    // 关键：根据用户选择的 option 的 willComplete 来决定句子是否完成
    // 而不是等 AI 返回后再判断
    if (option.willComplete) {
      // 用户选择的这个词会让句子完成
      // 设置为 generating 状态，触发图片生成
      setGameState(prev => ({
        ...prev,
        currentPage: {
          ...prev.currentPage,
          words: newWords,
          isComplete: true,  // 标记为完成
          translation: fullText
        },
        ai: {
          ...prev.ai,
          nextOptions: [],
          phase: 'generating'  // 触发 useEffect 生成图片
        }
      }));
      // 不再调用 AI 获取下一步选项
    } else {
      // 用户选择的这个词不会完成句子，继续获取下一步选项
      await processGameStep(newWords);
    }
  };

  const handlePlayDinoComment = () => {
    if (isDinoSpeaking) {
      speechService.cancel();
      setIsDinoSpeaking(false);
    } else {
      setIsDinoSpeaking(true);
      speechService.speak(gameState.ai.comment, "en-US");
    }
  };

  // 播放完成句子的英文
  const playCompletedSentence = () => {
    const translation = gameState.currentPage.translation;
    if (translation) {
      speechService.speak(translation, "en-US");
    }
  };

  // 继续下一页（自动保存到 Story）
  const continueStory = async () => {
    console.log('[App] continueStory called, currentStoryId:', gameState.currentStoryId);
    
    if (!gameState.currentStoryId) {
      console.error('[App] No current story!');
      return;
    }
    
    const currentPage = gameState.currentPage;
    const existingStory = getCurrentStory();
    
    console.log('[App] existingStory:', existingStory);
    console.log('[App] currentPage:', currentPage);
    
    // 创建新的完成页
    const completedPage: StoryPage = {
      id: (existingStory?.pages.length || 0) + 1,
      sentence: currentPage.words.map(w => w.word).join(' '),
      words: currentPage.words,
      illustration: gameState.ui.generatedImage,
      scene: currentPage.scene,
      translation: currentPage.translation,
      timestamp: Date.now()
    };

    // 如果故事还不存在（第一页），创建新故事
    if (!existingStory) {
      console.log('[App] Creating new story (first page)');
      const newStory: Story = {
        id: gameState.currentStoryId,
        title: await generateStoryTitle([completedPage]), // 自动生成标题
        cover: generateStoryCover([completedPage]),
        pages: [completedPage],
        character: currentCharacter || undefined,  // 保存角色信息
        mainScene: completedPage.scene.type,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      console.log('[App] New story created:', newStory);
      addStory(newStory);
      console.log('[App] Story added to store');
      
      // 记录角色和场景统计
      console.log('[App] Recording character and scene stats...');
      if (currentCharacter) {
        console.log('[App] Recording character:', currentCharacter.name);
        recordCharacter(currentCharacter, completedPage.scene.type);
      } else {
        console.warn('[App] No currentCharacter to record!');
      }
      console.log('[App] Recording scene:', completedPage.scene.type);
      recordScene(completedPage.scene.type, completedPage.scene.backgroundEmoji, currentCharacter?.name || 'unknown');
      recordStory(1);  // 第一页
      console.log('[App] Stats recorded successfully');
      
    } else {
      // 更新现有故事
      console.log('[App] Updating existing story');
      const updatedPages = [...existingStory.pages, completedPage];
      updateStory(existingStory.id, {
        pages: updatedPages,
        cover: generateStoryCover(updatedPages),
        title: await generateStoryTitle(updatedPages), // 随着内容增加，更新标题
        updatedAt: Date.now()
      });
      console.log('[App] Story updated, total pages:', updatedPages.length);
      
      // 更新场景统计
      recordScene(completedPage.scene.type, completedPage.scene.backgroundEmoji, currentCharacter?.name || 'unknown');
    }

    // 清空当前页状态，开始新页
    setGameState(prev => ({
      ...prev,
      currentPage: {
        words: [],
        scene: prev.currentPage.scene,
        isComplete: false
      },
      ai: {
        comment: "Thinking...",
      nextOptions: [],
        phase: 'building'
      },
      ui: {
        isGeneratingImage: false,
        generatedImage: null,
        loading: false,
        error: null
      }
    }));

    // 请求下一页的开始
    await processGameStep([]);
  };
  
  // 返回故事库（会自动保存当前进度）
  const backToLibrary = () => {
    // 清空当前创作会话
    setGameState(prev => ({
      ...prev,
      currentStoryId: null
    }));
    setViewMode('library');
  };

  // 朗读整个故事
  const playWholeStory = () => {
    const story = getCurrentStory();
    if (story && story.pages.length > 0) {
      const fullStory = story.pages.map(p => p.sentence).join('. ');
      speechService.speak(fullStory, "en-US");
    }
  };

  // ============================================
  // 副作用 - 句子完成时生成图片
  // ============================================
  useEffect(() => {
    if (gameState.ai.phase === 'generating' && !gameState.ui.isGeneratingImage && !gameState.ui.generatedImage) {
      const text = gameState.currentPage.words.map(w => w.word).join(' ');
      
      // 播放完整句子
      speechService.speak(text, "en-US");
      
      // 生成图片（传入故事历史以保持视觉延续性）
      const generateImage = async () => {
        setGameState(prev => ({
          ...prev,
          ui: { ...prev.ui, isGeneratingImage: true },
          ai: { ...prev.ai, comment: "Great! Let me draw this scene...🎨" }
        }));
        
        // 获取已完成的页面作为历史上下文
        const completedPages = getCompletedPages();
        const img = await generateStoryImage(text, gameState.currentPage.scene.type, completedPages);
        
        setGameState(prev => ({
          ...prev,
          ui: { ...prev.ui, isGeneratingImage: false, generatedImage: img },
          ai: { ...prev.ai, comment: "Perfect! One more page done!🎉", phase: 'completed' }
        }));
      };

      generateImage();
    }
  }, [gameState.ai.phase]);

  // ============================================
  // 路由渲染
  // ============================================
  
  // 开始屏幕
  if (viewMode === 'start') {
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
          
          <div className="space-y-4">
            <Button 
              onClick={startGame} 
              size="lg" 
              className="w-full text-xl md:text-2xl py-6 md:py-8 rounded-2xl md:rounded-3xl shadow-lg bg-green-500 hover:bg-green-600 active:scale-95 transition-all"
            >
             Start Adventure! 🚀
          </Button>
            
            <Button
              onClick={openLibrary}
              size="lg"
              className="w-full text-xl md:text-2xl py-6 md:py-8 rounded-2xl md:rounded-3xl shadow-lg bg-purple-500 hover:bg-purple-600 active:scale-95 transition-all"
            >
              📚 My Story Library
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // 绘本库
  if (viewMode === 'library') {
    return (
      <StoryLibrary 
        onBack={backToStart}
        onOpenStory={openReader}
        onContinueStory={continueCreatingStory}
        onCreateNew={startGame}
      />
    );
  }
  
  // 阅读器
  if (viewMode === 'reader' && readingStory) {
    return (
      <StoryReader 
        story={readingStory}
        onClose={() => {
          setReadingStory(null);
          setViewMode('library');
        }}
        onContinueEdit={continueCreatingStory}
      />
    );
  }

  // 游戏界面
  return (
    <div className={clsx("min-h-screen flex flex-col transition-colors duration-1000", themeClass)}>
       
      {/* 错误弹窗 */}
      {gameState.ui.error && (
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
          scene={gameState.currentPage.scene}
          historyLength={getCompletedPages().length}
          onReadStory={playWholeStory}
          onOpenLibrary={backToLibrary}
        />

        {/* 主内容区域 - 绘本创作布局 */}
        <div className="flex-1 flex flex-col md:flex-row gap-4 min-h-0">
          
          {/* 左侧：故事页面区域（像书本一样，统一使用 PageView） */}
          <div className="flex-1 flex flex-col gap-4 min-h-0">
            
            {/* 所有页面（包括已完成 + 正在构建的） */}
            {(() => {
              const completedPages = getCompletedPages();
              const hasCurrentWords = gameState.currentPage.words.length > 0;
              
              // 如果有任何内容（已完成或正在构建）
              if (completedPages.length > 0 || hasCurrentWords) {
                // 构建所有页面数组（已完成 + 当前构建中）
                const allPages: StoryPage[] = [
                  ...completedPages,
                  ...(hasCurrentWords ? [{
                    id: completedPages.length + 1,
                    sentence: gameState.currentPage.words.map(w => w.word).join(' '),
                    words: gameState.currentPage.words,
                    illustration: gameState.ui.generatedImage || null,
                    scene: gameState.currentPage.scene,
                    timestamp: Date.now()
                  }] : [])
                ];
                
                return (
                  <div className="flex-1 min-h-[200px] md:min-h-0">
                    <CompletedPagesViewer 
                      pages={allPages}
                      buildingPageIndex={hasCurrentWords ? allPages.length - 1 : -1}
                      className="h-full"
                    />
                  </div>
                );
              }
              
              // 如果没有任何内容，显示欢迎界面
              return (
                <div className="flex-1 bg-white/80 backdrop-blur-md rounded-[2rem] md:rounded-[2.5rem] border-4 border-white shadow-xl flex flex-col items-center justify-center p-8">
                  <div className="text-8xl md:text-9xl mb-6 animate-bounce">📖</div>
                  <h2 className="text-2xl md:text-4xl font-black text-slate-700 text-center mb-4">
                    Let's Create a Story!
                  </h2>
                  <p className="text-lg md:text-xl text-slate-500 text-center max-w-md">
                    Choose words from the right to build your story page by page
                  </p>
                </div>
              );
            })()}
          </div>
          
          {/* 右侧：交互区域（选项卡片） */}
          <div className="flex-1 md:max-w-xl flex flex-col">
            <GameOptions 
              isComplete={gameState.currentPage.isComplete}
              isGeneratingImage={gameState.ui.isGeneratingImage}
              storyImage={gameState.ui.generatedImage}
              englishTranslation={gameState.currentPage.words.map(w => w.word).join(' ')}
              options={gameState.ai.nextOptions}
              loading={gameState.ui.loading}
              highlightedWord={highlightedWord}
              onOptionClick={handleOptionClick}
              onContinue={continueStory}
              onImageClick={() => gameState.ui.generatedImage && setImagePreview(gameState.ui.generatedImage)}
              onPlaySentence={playCompletedSentence}
              aiComment={gameState.ui.isGeneratingImage ? "Painting a picture for you! 🎨" : gameState.ai.comment}
              isDinoSpeaking={isDinoSpeaking}
              onPlayComment={handlePlayDinoComment}
            />
          </div>
        </div>

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
