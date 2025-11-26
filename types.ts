
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

export interface StoryPage {
  text: string;
  image: string | null;
  translation?: string;
}

export interface GameState {
  history: StoryPage[];
  currentSentence: WordOption[];
  aiComment: string;
  nextOptions: WordOption[];
  isComplete: boolean;
  englishTranslation?: string;
  scene: Scene;
}

export interface ApiError {
  message: string;
}
