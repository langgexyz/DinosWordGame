
import React, { useState, useEffect, useRef } from 'react';
import { GameState, WordOption, SceneType, StoryPage } from './types';
import { fetchGameStep, generateStoryImage } from './services/gemini';
import { OptionCard } from './components/OptionCard';
import { Button } from './components/Button';
import { SpeakerButton } from './components/SpeakerButton';
import { Volume2, PlayCircle, Sparkles, BookOpen, Star, Music, ArrowRight, RefreshCw, AlertCircle, X, ZoomIn } from 'lucide-react';
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

// Helper to format sentence with proper punctuation spacing
const formatSentence = (words: WordOption[], addPeriod = false) => {
  const rawString = words.map(w => w.word).join(' ');
  // Remove space before punctuation
  let formatted = rawString.replace(/\s+([,.;?!])/g, '$1');
  if (addPeriod && !/[.?!]$/.test(formatted)) {
    formatted += ".";
  }
  return formatted;
};

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>({
    history: [],
    currentSentence: [],
    aiComment: "Rawr! Let's play!",
    nextOptions: [],
    isComplete: false,
    scene: { type: 'default', backgroundEmoji: '🦕', colorTheme: '' }
  });
  const [loading, setLoading] = useState(false);
  const [started, setStarted] = useState(false);
  
  // Image Generation State
  const [storyImage, setStoryImage] = useState<string | null>(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);

  // Error State
  const [hasError, setHasError] = useState(false);

  // Audio State
  const [isPlayingFullSentence, setIsPlayingFullSentence] = useState(false);
  const [isDinoSpeaking, setIsDinoSpeaking] = useState(false);
  
  // Voice Sync Animation State
  const [highlightedWord, setHighlightedWord] = useState<string | null>(null);
  
  // UI States for History and Zoom
  const [showHistory, setShowHistory] = useState(false);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);

  // Scroll Ref
  const sentenceContainerRef = useRef<HTMLDivElement>(null);

  const themeClass = SCENE_THEMES[gameState.scene?.type] || SCENE_THEMES.default;
  const floatingEmoji = SCENE_ELEMENTS[gameState.scene?.type] || SCENE_ELEMENTS.default;

  // Auto-scroll when sentence updates
  useEffect(() => {
    if (sentenceContainerRef.current) {
      sentenceContainerRef.current.scrollTo({
        top: sentenceContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [gameState.currentSentence, gameState.nextOptions]);

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

      // Voice Boundary Event for Highlighting
      utterance.onboundary = (event) => {
        if (event.name === 'word') {
          const textFromIndex = utterance.text.slice(event.charIndex);
          const match = textFromIndex.match(/^[\w']+/);
          
          if (match) {
            const currentSpokenWord = match[0].toLowerCase();
            const matchedOption = gameState.nextOptions.find(
              opt => opt.word.toLowerCase() === currentSpokenWord
            );
            
            if (matchedOption) {
              setHighlightedWord(matchedOption.word.toLowerCase());
              setTimeout(() => setHighlightedWord(null), 1500);
            }
          }
        }
      };

      utterance.onend = () => {
        setIsDinoSpeaking(false);
        setIsPlayingFullSentence(false);
        setHighlightedWord(null);
      };
      
      window.speechSynthesis.speak(utterance);
    }
  };

  const processGameStep = async (sentence: WordOption[], history: StoryPage[]) => {
    setLoading(true);
    setHasError(false); // Reset error
    try {
      const nextState = await fetchGameStep(sentence, history);
      setGameState(nextState);
      
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
    await processGameStep(gameState.currentSentence, gameState.history);
  };

  const handleOptionClick = async (option: WordOption) => {
    // Clean punctuation from spoken word (speak "Suddenly" not "Suddenly,")
    const cleanWord = option.word.replace(/[,.!?;:]/g, '');
    speak(cleanWord, "en-US");
    
    const newSentence = [...gameState.currentSentence, option];
    
    // Optimistic UI update
    setGameState(prev => ({
      ...prev,
      currentSentence: newSentence,
      nextOptions: [], // Clear options while loading
    }));

    await processGameStep(newSentence, gameState.history);
  };

  const handlePlayFullSentence = () => {
    if (isPlayingFullSentence) {
      window.speechSynthesis.cancel();
      setIsPlayingFullSentence(false);
    } else {
      const text = formatSentence(gameState.currentSentence, false);
      speak(text, "en-US");
    }
  };

  const continueStory = async () => {
    const completedSentenceStr = formatSentence(gameState.currentSentence, true);
    
    // Create new page entry with image if available
    const newPage: StoryPage = {
      text: completedSentenceStr,
      image: storyImage,
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
    }));
    setStoryImage(null); // Clear image

    // Start next sentence
    await processGameStep([], newHistory);
  };

  // Completion & Image Generation Effect
  useEffect(() => {
    if (gameState.isComplete) {
      const text = formatSentence(gameState.currentSentence, true);
      speak(text, "en-US");
      
      const generateAndAdvance = async () => {
        setIsGeneratingImage(true);
        const img = await generateStoryImage(text, gameState.scene.type);
        setStoryImage(img);
        setIsGeneratingImage(false);
      };

      generateAndAdvance();
    }
  }, [gameState.isComplete]);

  const readPage = (text: string) => {
    speak(text, "en-US");
  };

  // --- START SCREEN ---
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

       {/* Zoom Modal */}
       {zoomedImage && (
         <div 
           className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4 cursor-zoom-out animate-fade-in"
           onClick={() => setZoomedImage(null)}
         >
           <img 
              src={zoomedImage} 
              alt="Zoomed illustration" 
              className="max-w-full max-h-full rounded-2xl shadow-2xl animate-pop-in" 
           />
           <button className="absolute top-6 right-6 text-white bg-white/20 hover:bg-white/40 rounded-full p-2">
             <X className="w-8 h-8" />
           </button>
         </div>
       )}

       {/* History Modal */}
       {showHistory && (
         <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-6">
           <div className="bg-white w-full max-w-2xl h-[90vh] sm:h-[80vh] rounded-t-[2rem] sm:rounded-[2rem] shadow-2xl flex flex-col overflow-hidden animate-slide-up sm:animate-pop-in">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white z-10">
                 <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                    <BookOpen className="w-8 h-8 text-orange-400" />
                    Story Book
                 </h2>
                 <button onClick={() => setShowHistory(false)} className="p-2 hover:bg-slate-100 rounded-full">
                    <X className="w-6 h-6 text-slate-400" />
                 </button>
              </div>
              <div className="flex-1 overflow-y-auto p-6 space-y-8">
                 {gameState.history.length === 0 ? (
                    <div className="text-center text-slate-400 py-12">
                       <BookOpen className="w-16 h-16 mx-auto mb-4 opacity-30" />
                       <p className="text-xl">Your story hasn't started yet!</p>
                    </div>
                 ) : (
                    gameState.history.map((page, idx) => (
                      <div key={idx} className="flex gap-4 items-start border-b border-slate-100 last:border-0 pb-6 last:pb-0">
                         <div className="w-10 h-10 rounded-full bg-orange-100 text-orange-500 flex items-center justify-center font-bold shrink-0">
                           {idx + 1}
                         </div>
                         <div className="flex-1">
                            {page.image && (
                               <img src={page.image} alt={`Page ${idx + 1}`} className="w-full max-w-xs rounded-xl mb-4 border-4 border-slate-50 shadow-sm" />
                            )}
                            <p className="text-xl font-bold text-slate-800 mb-2 leading-relaxed">{page.text}</p>
                            {page.translation && (
                               <p className="text-slate-500 text-base mb-3">{page.translation}</p>
                            )}
                            <button onClick={() => readPage(page.text)} className="flex items-center gap-2 text-sky-500 font-bold text-sm hover:underline">
                               <Volume2 className="w-4 h-4" /> Read Page
                            </button>
                         </div>
                      </div>
                    ))
                 )}
              </div>
           </div>
         </div>
       )}

       {/* Animated Background Elements */}
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
        
        {/* TOP BAR */}
        <div className="flex justify-between items-center mb-3 md:mb-6 shrink-0">
           <div className="bg-white/60 backdrop-blur-md px-3 py-1.5 md:px-4 md:py-2 rounded-full flex items-center gap-2 shadow-sm border border-white/50">
              <span className="text-lg md:text-xl">{gameState.scene?.backgroundEmoji}</span>
              <span className="font-bold text-slate-600 uppercase tracking-wider text-xs md:text-base">
                {gameState.scene?.type || 'Adventure'}
              </span>
           </div>
           
           <button 
             onClick={() => setShowHistory(true)} 
             className="bg-white/80 hover:bg-white px-3 py-1.5 md:px-4 md:py-2 rounded-full font-bold text-orange-500 shadow-sm flex items-center gap-2 transition-colors text-sm md:text-base"
           >
              <BookOpen className="w-4 h-4 md:w-5 md:h-5" />
              <span className="hidden sm:inline">Story History</span>
           </button>
        </div>

        {/* DINO COMPANION AREA */}
        <div className="bg-white/90 backdrop-blur-xl p-3 md:p-6 rounded-[2rem] md:rounded-[2.5rem] shadow-lg mb-4 md:mb-6 flex items-center gap-3 md:gap-6 border-2 border-white shrink-0">
          <div className="relative shrink-0">
             <div className="w-16 h-16 md:w-28 md:h-28 rounded-full bg-green-100 flex items-center justify-center text-4xl md:text-6xl shadow-inner border-4 border-white">
               🦖
             </div>
             {(loading || isGeneratingImage) && (
               <div className="absolute -top-1 -right-1 md:-top-2 md:-right-2 bg-yellow-400 p-1.5 md:p-2 rounded-full shadow-sm animate-bounce">
                 <Sparkles className="w-4 h-4 md:w-6 md:h-6 text-yellow-900" />
               </div>
             )}
          </div>
          
          <div className="flex-1">
             <div className="bg-slate-100 rounded-2xl md:rounded-3xl p-3 md:p-6 relative rounded-tl-none pr-10 md:pr-16">
                <div className="absolute top-0 -left-2 md:-left-3 w-4 h-4 md:w-6 md:h-6 bg-slate-100 clip-path-polygon"></div>
                <p className="text-slate-800 font-bold text-base sm:text-lg md:text-2xl leading-relaxed">
                   {isGeneratingImage ? "Painting a picture for you! 🎨" : gameState.aiComment}
                </p>
                <SpeakerButton 
                  onClick={() => speak(gameState.aiComment, "zh-CN")} 
                  isPlaying={isDinoSpeaking}
                />
             </div>
          </div>
        </div>

        {/* MAIN SENTENCE DISPLAY - SCROLLABLE */}
        <div 
          ref={sentenceContainerRef}
          className="flex-1 bg-white/80 backdrop-blur-md rounded-[2rem] md:rounded-[2.5rem] border-4 border-white shadow-xl p-4 md:p-10 mb-4 md:mb-6 flex flex-col relative overflow-y-auto min-h-[160px]"
        >
          
          <div className="flex flex-wrap items-end justify-center gap-2 md:gap-4 lg:gap-6 pb-12 w-full min-h-full content-center">
             {gameState.currentSentence.map((word, idx) => (
               <div key={idx} className="flex flex-col items-center animate-fly-in">
                  <span className="text-xl sm:text-2xl md:text-4xl filter drop-shadow-md transform transition-transform hover:scale-125 mb-1">{word.emoji}</span>
                  <span className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-black text-slate-800 drop-shadow-sm tracking-tight">{word.word}</span>
               </div>
             ))}

             {/* Cursor / Placeholder */}
             {!gameState.isComplete && (
               <div className="flex flex-col items-center justify-end h-full ml-1 md:ml-2 pb-2">
                 {gameState.currentSentence.length === 0 ? (
                    <span className="text-slate-300 font-bold text-xl md:text-3xl animate-pulse">Start story...</span>
                 ) : (
                    <div className="w-16 sm:w-20 md:w-32 h-2 border-b-4 md:border-b-8 border-dashed border-slate-300 rounded-full opacity-50"></div>
                 )}
               </div>
             )}
          </div>
          
          {/* Main Sentence Speaker Button */}
          {gameState.currentSentence.length > 0 && (
            <div className="sticky bottom-0 right-0 w-full flex justify-end pointer-events-none">
              <div className="pointer-events-auto">
                 <SpeakerButton 
                   onClick={handlePlayFullSentence} 
                   isPlaying={isPlayingFullSentence}
                   className="!static !m-2" 
                 />
              </div>
            </div>
          )}
        </div>

        {/* INTERACTION AREA */}
        <div className="min-h-[140px] sm:min-h-[160px] md:min-h-[240px] flex items-end shrink-0">
           {gameState.isComplete ? (
              // COMPLETION CARD
              <div className="w-full bg-orange-100/90 backdrop-blur rounded-[2rem] p-4 md:p-6 flex flex-col items-center justify-center text-center animate-fade-in border-4 border-white shadow-lg relative overflow-hidden">
                 
                 {isGeneratingImage ? (
                    <div className="flex flex-col items-center justify-center py-4 md:py-8">
                       <span className="text-4xl md:text-6xl mb-4 animate-bounce">🖌️</span>
                       <p className="text-orange-500 font-bold text-lg md:text-xl animate-pulse">Creating masterpiece...</p>
                    </div>
                 ) : (
                    <div className="w-full h-full flex flex-col md:flex-row items-center gap-4 md:gap-6">
                        {storyImage && (
                          <div 
                             className="group relative w-32 h-32 sm:w-48 sm:h-48 md:w-64 md:h-64 rounded-2xl overflow-hidden shadow-lg shrink-0 border-4 border-white rotate-[-2deg] bg-white transform transition-transform hover:scale-105 cursor-zoom-in"
                             onClick={() => setZoomedImage(storyImage)}
                          >
                             <img src={storyImage} alt="Story illustration" className="w-full h-full object-cover" />
                             <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <ZoomIn className="text-white w-8 h-8 drop-shadow-md" />
                             </div>
                          </div>
                        )}
                        <div className="flex-1 flex flex-col items-center md:items-start text-center md:text-left h-full justify-center">
                            <div className="flex items-center gap-2 text-orange-600 mb-1 md:mb-2">
                                <Star className="w-5 h-5 md:w-6 md:h-6 fill-orange-500" />
                                <h2 className="text-xl md:text-2xl font-black uppercase">Great Job!</h2>
                            </div>
                            <p className="text-slate-700 text-lg md:text-2xl font-bold mb-4 leading-snug">
                                "{gameState.englishTranslation}"
                            </p>
                            
                            <Button onClick={continueStory} size="lg" className="w-full md:w-auto bg-orange-500 hover:bg-orange-600 shadow-lg text-xl px-8 rounded-full animate-bounce-subtle">
                                Next <ArrowRight className="w-6 h-6 ml-2" />
                            </Button>
                        </div>
                    </div>
                 )}
                 
              </div>
           ) : (
              // OPTIONS GRID
              <div className="w-full grid grid-cols-2 gap-3 md:gap-8 h-full">
                {loading && gameState.nextOptions.length === 0 ? (
                  [1, 2].map(i => (
                    <div key={i} className="aspect-[16/9] md:aspect-video rounded-3xl bg-white/40 animate-shimmer border-2 border-white/50 relative overflow-hidden flex items-center justify-center">
                       <div className="text-4xl md:text-6xl opacity-30 animate-bounce">🐾</div>
                    </div>
                  ))
                ) : (
                  gameState.nextOptions.map((option, idx) => (
                    <OptionCard 
                      key={idx}
                      option={option} 
                      onClick={() => handleOptionClick(option)}
                      isHighlighted={highlightedWord === option.word.toLowerCase()}
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
