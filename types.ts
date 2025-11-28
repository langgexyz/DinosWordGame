// ============================================
// 基础类型定义
// ============================================

export interface WordOption {
  word: string;           // Can be a single word OR a natural phrase (e.g., "a few", "ran quickly")
  emoji: string;
  explanation: string;    // Simple English explanation for young learners
  willComplete: boolean;  // Will choosing this option complete the sentence?
  color?: string;
}

export type SceneType = 
  | 'forest' | 'ocean' | 'space' | 'city' | 'home' | 'magic' 
  | 'school' | 'park' | 'playground' | 'street' | 'hospital' 
  | 'restaurant' | 'library' | 'shop' | 'default'
  | string; // Allow AI to create new scene types dynamically

export interface Scene {
  type: SceneType | string; // Support both predefined and AI-created scenes
  backgroundEmoji: string;
  colorTheme: string;
}

export interface TokenUsage {
  prompt: number;
  response: number;
  total: number;
}

// ============================================
// 故事数据结构
// ============================================

// AI 自由生成的角色信息
export interface CharacterInfo {
  name: string;              // 如 "little bear", "tiny fish", "brave dragon"
  type?: string;             // AI 可选描述类型，如 "bear", "fish"（非强制）
  description?: string;      // AI 对角色的描述
  emoji?: string;            // AI 选择的 emoji
  firstAppearance?: number;  // 首次出现时间戳
}

// 故事的一页
export interface StoryPage {
  id: number;                    // 页码
  sentence: string;              // 完整句子
  words: WordOption[];           // 构成句子的单词数组
  illustration: string | null;   // 配图
  scene: Scene;                  // 这一页的场景
  characters?: string[];         // 这一页出现的角色名（AI 识别）
  translation?: string;          // 中文翻译
  timestamp: number;             // 创建时间
}

// 故事封面
export interface StoryCover {
  previewImages: string[];       // 前3-5张图片用于堆叠显示
  pageCount: number;             // 总页数
  themeEmoji: string;            // 主题场景emoji
  colorTheme: string;            // 主题颜色
}

// 完整的故事（版本管理思维 - 所有故事都可继续编辑）
export interface Story {
  id: string;                    // 故事ID
  title: string;                 // 故事标题（AI生成或自动生成）
  cover: StoryCover;             // 封面信息
  pages: StoryPage[];            // 所有页面
  character?: CharacterInfo;     // 故事的主角（AI 自由创建）
  mainScene?: string;            // 故事的主要场景（AI 自动确定）
  createdAt: number;             // 创建时间
  updatedAt: number;             // 最后更新时间
}

// ============================================
// 创作阶段
// ============================================

export type CreationPhase = 
  | 'building'      // 构建句子中
  | 'generating'    // 生成图片中
  | 'completed';    // 完成，等待Next

// ============================================
// 游戏状态（创作会话状态）
// ============================================

export interface GameState {
  // 当前正在创作的故事ID（存储在 storyStore 中）
  currentStoryId: string | null;
  
  // 当前页创作状态
  currentPage: {
    words: WordOption[];            // 当前正在构建的单词
    scene: Scene;                   // 当前场景
    isComplete: boolean;            // 句子是否完成
    translation?: string;           // 中文翻译
  };
  
  // AI 引导状态
  ai: {
    comment: string;                // AI 评论
    nextOptions: WordOption[];      // 下一个词的选项
    phase: CreationPhase;           // 当前阶段
  };
  
  // UI 状态
  ui: {
    isGeneratingImage: boolean;     // 是否正在生成图片
    generatedImage: string | null;  // 生成的图片
    loading: boolean;               // 是否加载中
    error: string | null;           // 错误信息
  };
  
  // 统计信息
  stats?: {
    tokenUsage?: TokenUsage;
  };
}

export interface ApiError {
  message: string;
}

// ============================================
// 角色/场景使用统计（数据驱动）
// ============================================

// 角色使用统计
export interface CharacterUsage {
  characterName: string;     // 角色名字（如 "little bear"）
  totalStories: number;      // 作为主角的故事数
  totalAppearances: number;  // 总出场次数
  lastUsed: number;          // 最后使用时间
  favoriteScenes: string[];  // 这个角色常出现的场景（TOP 3）
  emoji?: string;            // 角色 emoji
  type?: string;             // 角色类型（如 "bear"）
}

// 场景使用记录
export interface SceneUsage {
  sceneType: string;         // 场景类型
  emoji: string;             // 场景 emoji
  usedCount: number;         // 使用次数
  lastUsed: number;          // 最后使用时间
  associatedCharacters: string[]; // 在这个场景出现过的角色
}

// 全局使用统计
export interface UsageStatistics {
  characters: Record<string, CharacterUsage>;  // 角色使用统计
  scenes: Record<string, SceneUsage>;          // 场景使用统计
  totalStories: number;                        // 总故事数
  totalPages: number;                          // 总页数
}
