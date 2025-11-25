export interface WordOption {
  word: string;
  emoji: string;
  zh: string;
  color?: string;
}

export type SceneType = 'forest' | 'ocean' | 'space' | 'city' | 'home' | 'magic' | 'default';

export interface Scene {
  type: SceneType;
  backgroundEmoji: string;
  colorTheme: string; // Tailwind class prefix e.g. "from-green-400 to-blue-500"
}

export interface GameState {
  storyHistory: string[];
  currentSentence: WordOption[];
  aiComment: string;
  nextOptions: WordOption[];
  isComplete: boolean;
  englishTranslation?: string;
  scene: Scene;
  suggestedAddedWord?: WordOption; // For the AI to auto-add the first word
}

export interface ApiError {
  message: string;
}