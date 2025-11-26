# 架构说明

## 项目结构

\`\`\`
DinosWordGame/
├── components/           # UI 组件
│   ├── Button.tsx       # 通用按钮
│   ├── OptionCard.tsx   # 单词选项卡片
│   ├── SpeakerButton.tsx # 语音播放按钮
│   ├── GameHeader.tsx   # 游戏顶部栏（场景显示、历史按钮）
│   ├── DinoCompanion.tsx # 小恐龙伙伴区域（AI 评论）
│   ├── SentenceDisplay.tsx # 句子显示区域
│   └── GameOptions.tsx  # 游戏选项区域（单词选择/完成卡片）
│
├── services/
│   ├── gemini.ts        # Gemini AI 服务
│   └── speech/          # 语音服务（策略模式）
│       ├── SpeechStrategy.ts      # 策略接口
│       ├── WebSpeechStrategy.ts   # Web Speech API 实现
│       ├── SpeechService.ts       # 语音服务管理
│       └── index.ts
│
├── test/
│   └── gemini.test.ts   # 单元测试
│
├── App.tsx              # 主应用（组合式结构）
├── types.ts             # TypeScript 类型定义
└── vite.config.ts       # Vite 配置
\`\`\`

## 架构设计原则

### 1. 组件化设计
- **单一职责**: 每个组件只负责一个功能区域
- **可组合**: App.tsx 通过组合组件构建完整界面
- **可复用**: 组件独立，易于测试和维护

### 2. 策略模式 - 语音服务
\`\`\`typescript
// 接口定义
interface SpeechStrategy {
  speak(text: string, lang: 'en-US' | 'zh-CN'): Promise<void>;
  cancel(): void;
  isAvailable(): boolean;
}

// 当前实现: Web Speech API
class WebSpeechStrategy implements SpeechStrategy { ... }

// 未来可扩展: Google TTS, Azure TTS 等
class GoogleTTSStrategy implements SpeechStrategy { ... }
\`\`\`

### 3. App.tsx 结构

\`\`\`typescript
App.tsx (311 行)
├── 状态管理 (50 行)
│   ├── gameState
│   ├── loading/error states
│   └── speech service (useMemo)
│
├── 业务逻辑 (80 行)
│   ├── processGameStep()
│   ├── handleOptionClick()
│   └── continueStory()
│
└── UI 渲染 (180 行)
    ├── StartScreen (开始界面)
    └── GameScreen (游戏界面)
        ├── <GameHeader />
        ├── <DinoCompanion />
        ├── <SentenceDisplay />
        └── <GameOptions />
\`\`\`

## 组件说明

### GameHeader
- **职责**: 显示当前场景、历史按钮
- **Props**: scene, historyLength, onReadStory
- **样式**: 顶部浮动卡片

### DinoCompanion
- **职责**: 显示小恐龙和 AI 评论
- **Props**: comment, isLoading, isDinoSpeaking, onSpeak
- **特性**: 支持语音播放、加载动画

### SentenceDisplay
- **职责**: 展示当前构建的句子
- **Props**: words, isComplete, isPlayingFullSentence, onPlaySentence
- **特性**: 单词动画、语音播放

### GameOptions
- **职责**: 显示单词选项或完成卡片
- **Props**: isComplete, options, storyImage, onOptionClick, onContinue
- **特性**: 自动切换显示模式

## 数据流

\`\`\`
User Click
    ↓
handleOptionClick()
    ↓
processGameStep()
    ↓
fetchGameStep() (Gemini AI)
    ↓
Update GameState
    ↓
Components Re-render
\`\`\`

## 环境变量

\`\`\`bash
# .env.local
GEMINI_API_KEY=your_api_key_here
\`\`\`

## Token 优化策略

- 系统指令: 150 tokens (精简 70%)
- 空历史: < 500 tokens
- 30 页历史: < 1500 tokens
- 100 页历史: < 650 tokens (摘要压缩)

## 扩展性

### 添加新的语音服务
\`\`\`typescript
// 1. 实现策略接口
class AzureTTSStrategy implements SpeechStrategy { ... }

// 2. 在 App.tsx 中切换
const speechService = useMemo(() => 
  createSpeechService({}, {}, new AzureTTSStrategy())
, []);
\`\`\`

### 添加新的教育场景
\`\`\`typescript
// 1. 更新 types.ts
type SceneType = '...' | 'museum';

// 2. 更新 App.tsx 主题配置
const SCENE_THEMES = {
  museum: "bg-gradient-to-b from-brown-50 to-amber-100"
};

// 3. 更新 services/gemini.ts 系统指令
// 无需修改，AI 会自动适应
\`\`\`
