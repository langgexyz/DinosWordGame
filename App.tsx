import React, { useState, useEffect, useRef } from 'react';
import { GameState, WordOption, SceneType } from './types';
import { fetchGameStep, generateStoryImage } from './services/gemini';
import { OptionCard } from './components/OptionCard';
import { Button } from './components/Button';
import { SpeakerButton } from './components/SpeakerButton';
import { Volume2, PlayCircle, Sparkles, BookOpen, Star, Music, ArrowRight, RefreshCw, AlertCircle } from 'lucide-react';
import { clsx } from 'clsx';

// Theme configurations for different scenes
const SCENE_THEMES: Record<string, string> = {
  forest: "bg-gradient-to-b from-green-50 to-emerald-100",
  ocean: "bg-gradient-to-b from-cyan-50 to-blue-100",
  space: "bg-gradient-to-b from-indigo-50 to-purple-100",
  city: "bg-gradient-to-b from-gray-50 to-slate-200",
  home: "bg-gradient-to-b from-orange-50 to-yellow-100",
  magic: "bg-gradient-to-b from-pink-50 to-rose-100",
  default: "bg-gradient-to-b from-blue-50 to-slate-100"
};

const SCENE_ELEMENTS: Record<string, string> = {
  forest: "🍃",
  ocean: "🫧",
  space: "✨",
  city: "🏙️",
  home: "🏠",
  magic: "🪄",
  default: "🎈"
};

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>({
    storyHistory: [],
    currentSentence: [],
    aiComment: "Rawr! Hi Xixi! Let's play!",
    nextOptions: [],
    isComplete: false,
    scene: { type: 'default', backgroundEmoji: '🦕', colorTheme: '' }
  });
  const [loading, setLoading] = useState(false);
  const [started, setStarted] = useState(false);
  const [autoAdvanceTimer, setAutoAdvanceTimer] = useState<number | null>(null);
  
  // Image Generation State
  const [storyImage, setStoryImage] = useState<string | null>(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);

  // Error State
  const [hasError, setHasError] = useState(false);

  // Audio State
  const [isPlayingFullSentence, setIsPlayingFullSentence] = useState(false);
  const [isDinoSpeaking, setIsDinoSpeaking] = useState(false);

  const themeClass = SCENE_THEMES[gameState.scene?.type] || SCENE_THEMES.default;
  const floatingEmoji = SCENE_ELEMENTS[gameState.scene?.type] || SCENE_ELEMENTS.default;

  const speak = (text: string, lang: 'en-US' | 'zh-CN' = 'zh-CN') => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang;
      utterance.rate = lang === 'en-US' ? 0.85 : 1.1;
      utterance.pitch = 1.2;
      const voices = window.speechSynthesis.getVoices();
      const preferredVoice = voices.find(v => v.lang.includes(lang));
      if (preferredVoice) utterance.voice = preferredVoice;
      
      if (lang === 'zh-CN') setIsDinoSpeaking(true);
      if (lang === 'en-US' && text.length > 20) setIsPlayingFullSentence(true); // Rough heuristic

      utterance.onend = () => {
        setIsDinoSpeaking(false);
        setIsPlayingFullSentence(false);
      };
      
      window.speechSynthesis.speak(utterance);
    }
  };

  const processGameStep = async (sentence: WordOption[], history: string[]) => {
    setLoading(true);
    setHasError(false); // Reset error
    try {
      const nextState = await fetchGameStep(sentence, history);
      
      // Handle AI Auto-Start Word (The AI plays first!)
      if (nextState.suggestedAddedWord) {
        const autoWord = nextState.suggestedAddedWord;
        // Optimistically add it to the state
        const updatedSentence = [...sentence, autoWord];
        
        // Update state with the word added, AND the options for the word AFTER that
        setGameState({
          ...nextState,
          currentSentence: updatedSentence,
          suggestedAddedWord: undefined // Consume it
        });
        speak(autoWord.word, "en-US");
      } else {
        setGameState(nextState);
      }
      
      // Don't speak comment immediately if it's the start, wait a tiny bit
      if (!nextState.isComplete) {
         setTimeout(() => speak(nextState.aiComment, "zh-CN"), 800);
      }

    } catch (error) {
      console.error("Game processing error:", error);
      setHasError(true);
    } finally {
      setLoading(false);
    }
  };

  const startGame = async () => {
    setLoading(true);
    setStarted(true);
    speak("吼吼！故事开始啦！", "zh-CN");
    await processGameStep([], []);
  };

  const retryLastAction = async () => {
    // Retry logic depends on context, but simplest is to re-send current state
    await processGameStep(gameState.currentSentence, gameState.storyHistory);
  };

  const handleOptionClick = async (option: WordOption) => {
    speak(option.word, "en-US");
    const newSentence = [...gameState.currentSentence, option];
    
    // Optimistic UI update
    setGameState(prev => ({
      ...prev,
      currentSentence: newSentence,
      nextOptions: [], // Clear options while loading
    }));

    await processGameStep(newSentence, gameState.storyHistory);
  };

  const handlePlayFullSentence = () => {
    if (isPlayingFullSentence) {
      window.speechSynthesis.cancel();
      setIsPlayingFullSentence(false);
    } else {
      const text = gameState.currentSentence.map(w => w.word).join(' ');
      speak(text, "en-US");
    }
  };

  const continueStory = async () => {
    const completedSentenceStr = gameState.currentSentence.map(w => w.word).join(' ') + ".";
    const newHistory = [...gameState.storyHistory, completedSentenceStr];

    setGameState(prev => ({
      ...prev,
      storyHistory: newHistory,
      currentSentence: [],
      isComplete: false,
      aiComment: "Thinking...",
      nextOptions: [],
    }));
    setStoryImage(null); // Clear image

    // Start next sentence (AI will provide first word again)
    await processGameStep([], newHistory);
  };

  // Completion & Image Generation Effect
  useEffect(() => {
    if (gameState.isComplete) {
      const text = gameState.currentSentence.map(w => w.word).join(' ');
      speak(text, "en-US");
      
      const generateAndAdvance = async () => {
        setIsGeneratingImage(true);
        // Attempt to generate image
        const img = await generateStoryImage(text, gameState.scene.type);
        setStoryImage(img);
        setIsGeneratingImage(false);

        // Start Auto Advance Timer AFTER image is ready (or failed)
        let timeLeft = 6000; // Give 6 seconds to look at image
        const startTime = Date.now();
        const interval = setInterval(() => {
           const elapsed = Date.now() - startTime;
           const remaining = Math.max(0, 6000 - elapsed);
           setAutoAdvanceTimer(remaining);
           if (remaining <= 0) {
             clearInterval(interval);
             setAutoAdvanceTimer(null);
             continueStory();
           }
        }, 50);
        return () => clearInterval(interval);
      };

      generateAndAdvance();
    }
  }, [gameState.isComplete]);

  const playWholeStory = () => {
    const history = gameState.storyHistory.join(' ');
    speak(history, "en-US");
  };

  // --- START SCREEN ---
  if (!started) {
    return (
      <div className="min-h-screen bg-sky-50 flex items-center justify-center p-8 relative overflow-hidden">
        <div className="blob bg-green-300 w-96 h-96 rounded-full top-0 left-0 mix-blend-multiply blur-3xl opacity-50"></div>
        <div className="blob bg-purple-300 w-96 h-96 rounded-full bottom-0 right-0 mix-blend-multiply blur-3xl opacity-50"></div>

        <div className="bg-white/90 backdrop-blur-xl p-10 md:p-16 rounded-[3rem] shadow-2xl text-center max-w-2xl w-full border-4 border-white/50 animate-fade-in-up">
          <div className="text-9xl mb-8 animate-bounce inline-block">🦖</div>
          <h1 className="text-5xl md:text-7xl font-black text-slate-800 mb-6 tracking-tight">
            Dino's <span className="text-green-500">Story</span>
          </h1>
          <p className="text-slate-500 text-xl md:text-2xl mb-10 font-medium leading-relaxed">
             Join Dino & Xixi to build a magical world!<br/>
             <span className="text-base text-slate-400 mt-2 block">Parent-Child English Adventure</span>
          </p>
          <Button onClick={startGame} size="lg" className="w-full text-2xl py-8 rounded-3xl shadow-lg bg-green-500 hover:bg-green-600 active:scale-95 transition-all">
             Start Adventure! 🚀
          </Button>
        </div>
      </div>
    );
  }

  // --- GAME UI ---
  return (
    <div className={clsx("min-h-screen flex flex-col transition-colors duration-1000", themeClass)}>
       
       {/* Error Overlay */}
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

       {/* Animated Background Elements */}
       <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
          {Array.from({ length: 6 }).map((_, i) => (
            <div 
              key={i}
              className="absolute text-4xl opacity-20 animate-float"
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

      <div className="w-full max-w-5xl mx-auto flex flex-col h-screen p-4 md:p-6 lg:p-8 relative z-10">
        
        {/* TOP BAR */}
        <div className="flex justify-between items-center mb-4 md:mb-6">
           <div className="bg-white/60 backdrop-blur-md px-4 py-2 rounded-full flex items-center gap-2 shadow-sm border border-white/50">
              <span className="text-xl">{gameState.scene?.backgroundEmoji}</span>
              <span className="font-bold text-slate-600 uppercase tracking-wider text-sm md:text-base">
                {gameState.scene?.type || 'Adventure'}
              </span>
           </div>
           
           {gameState.storyHistory.length > 0 && (
              <button onClick={playWholeStory} className="bg-white/80 hover:bg-white px-4 py-2 rounded-full font-bold text-sky-600 shadow-sm flex items-center gap-2 transition-colors">
                <BookOpen className="w-5 h-5" />
                <span className="hidden md:inline">Read Story</span>
              </button>
           )}
        </div>

        {/* DINO COMPANION AREA */}
        <div className="bg-white/90 backdrop-blur-xl p-4 md:p-6 rounded-[2.5rem] shadow-lg mb-6 flex items-center gap-4 md:gap-6 border-2 border-white">
          <div className="relative shrink-0">
             <div className="w-20 h-20 md:w-28 md:h-28 rounded-full bg-green-100 flex items-center justify-center text-5xl md:text-6xl shadow-inner border-4 border-white">
               🦖
             </div>
             {(loading || isGeneratingImage) && (
               <div className="absolute -top-2 -right-2 bg-yellow-400 p-2 rounded-full shadow-sm animate-bounce">
                 <Sparkles className="w-5 h-5 md:w-6 md:h-6 text-yellow-900" />
               </div>
             )}
          </div>
          
          <div className="flex-1">
             <div className="bg-slate-100 rounded-3xl p-4 md:p-6 relative rounded-tl-none pr-12 md:pr-16">
                <div className="absolute top-0 -left-3 w-6 h-6 bg-slate-100 clip-path-polygon"></div>
                <p className="text-slate-800 font-bold text-lg md:text-2xl leading-relaxed">
                   {isGeneratingImage ? "Painting a picture for you! 🎨" : gameState.aiComment}
                </p>
                <SpeakerButton 
                  onClick={() => speak(gameState.aiComment, "zh-CN")} 
                  isPlaying={isDinoSpeaking}
                />
             </div>
          </div>
        </div>

        {/* MAIN SENTENCE DISPLAY */}
        <div className="flex-1 bg-white/80 backdrop-blur-md rounded-[2.5rem] border-4 border-white shadow-xl p-6 md:p-10 mb-6 flex flex-col items-center justify-center relative overflow-hidden">
          
          <div className="flex flex-wrap items-center justify-center gap-3 md:gap-6 pb-12">
             {gameState.currentSentence.map((word, idx) => (
               <div key={idx} className="flex flex-col items-center animate-fly-in">
                  <span className="text-4xl md:text-6xl lg:text-7xl font-black text-slate-800 drop-shadow-sm tracking-tight mb-1 md:mb-2">{word.word}</span>
                  <span className="text-2xl md:text-4xl filter drop-shadow-md transform transition-transform hover:scale-125">{word.emoji}</span>
               </div>
             ))}

             {/* Cursor / Placeholder */}
             {!gameState.isComplete && (
               <div className="flex flex-col items-center justify-end h-full ml-2">
                 <div className="w-20 md:w-32 h-16 md:h-20 border-b-4 border-dashed border-slate-300 rounded-lg flex items-center justify-center opacity-50">
                    {/* Placeholder visual */}
                 </div>
               </div>
             )}
          </div>
          
          {/* Main Sentence Speaker Button - Bottom Right */}
          {gameState.currentSentence.length > 0 && (
             <SpeakerButton 
               onClick={handlePlayFullSentence} 
               isPlaying={isPlayingFullSentence}
             />
          )}

          {gameState.currentSentence.length === 0 && !loading && (
             <div className="text-slate-300 font-bold text-2xl md:text-4xl animate-pulse absolute inset-0 flex items-center justify-center">
                Building story...
             </div>
          )}
        </div>

        {/* INTERACTION AREA */}
        <div className="min-h-[160px] md:min-h-[240px] flex items-end">
           {gameState.isComplete ? (
              // COMPLETION CARD
              <div className="w-full bg-orange-100/90 backdrop-blur rounded-[2rem] p-4 md:p-6 flex flex-col items-center justify-center text-center animate-fade-in border-4 border-white shadow-lg relative overflow-hidden">
                 
                 {isGeneratingImage ? (
                    <div className="flex flex-col items-center justify-center py-8">
                       <span className="text-6xl mb-4 animate-bounce">🖌️</span>
                       <p className="text-orange-500 font-bold text-xl animate-pulse">Creating masterpiece...</p>
                    </div>
                 ) : (
                    <div className="w-full h-full flex flex-col md:flex-row items-center gap-6">
                        {storyImage && (
                          <div className="w-48 h-48 md:w-64 md:h-64 rounded-2xl overflow-hidden shadow-lg shrink-0 border-4 border-white rotate-[-2deg] bg-white">
                             <img src={storyImage} alt="Story illustration" className="w-full h-full object-cover" />
                          </div>
                        )}
                        <div className="flex-1 flex flex-col items-center md:items-start text-center md:text-left">
                            <div className="flex items-center gap-2 text-orange-600 mb-2">
                                <Star className="w-6 h-6 fill-orange-500" />
                                <h2 className="text-2xl font-black uppercase">Great Job!</h2>
                            </div>
                            <p className="text-slate-700 text-lg md:text-2xl font-bold mb-2">
                                "{gameState.englishTranslation}"
                            </p>
                             {/* Progress Bar for Auto Advance */}
                             <div className="w-full max-w-xs h-3 bg-white/50 rounded-full overflow-hidden shadow-inner mt-4">
                                <div 
                                className="h-full bg-orange-500 transition-all duration-100 ease-linear rounded-full"
                                style={{ width: `${((6000 - (autoAdvanceTimer || 6000)) / 6000) * 100}%` }}
                                />
                            </div>
                            <p className="mt-2 text-orange-400 font-bold text-sm flex items-center gap-2">
                                Next page <ArrowRight className="w-4 h-4 animate-pulse"/>
                            </p>
                        </div>
                    </div>
                 )}
                 
              </div>
           ) : (
              // OPTIONS GRID
              <div className="w-full grid grid-cols-2 gap-4 md:gap-8">
                {loading && gameState.nextOptions.length === 0 ? (
                  [1, 2].map(i => (
                    <div key={i} className="aspect-[16/9] md:aspect-video rounded-3xl bg-white/40 animate-pulse border-2 border-white/50"></div>
                  ))
                ) : (
                  gameState.nextOptions.map((option, idx) => (
                    <OptionCard 
                      key={idx}
                      option={option} 
                      onClick={() => handleOptionClick(option)} 
                    />
                  ))
                )}
              </div>
           )}
        </div>

      </div>
    </div>
  );
};

export default App;