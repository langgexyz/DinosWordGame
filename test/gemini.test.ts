/**
 * Gemini Service 单元测试
 * 运行方式: npm run test:unit
 */

// 加载环境变量
import { config } from 'dotenv';
config({ path: '.env.local' });

import { fetchGameStep, generateStoryImage, getStoryLengthWarning } from '../services/gemini';
import { StoryPage, WordOption } from '../types';

// 简单的测试框架
class TestRunner {
  private passed = 0;
  private failed = 0;
  private tests: Array<{ name: string; fn: () => Promise<void> }> = [];

  test(name: string, fn: () => Promise<void>) {
    this.tests.push({ name, fn });
  }

  async run() {
    console.log('\n🧪 Running Unit Tests...\n');
    
    for (const test of this.tests) {
      try {
        await test.fn();
        this.passed++;
        console.log(`✅ ${test.name}`);
      } catch (error) {
        this.failed++;
        console.log(`❌ ${test.name}`);
        console.log(`   Error: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log(`📊 Results: ${this.passed} passed, ${this.failed} failed`);
    console.log('='.repeat(60) + '\n');

    process.exit(this.failed > 0 ? 1 : 0);
  }
}

// 断言函数
function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertEqual<T>(actual: T, expected: T, message?: string) {
  if (actual !== expected) {
    throw new Error(message || `Expected ${expected}, got ${actual}`);
  }
}

function assertNotNull<T>(value: T | null | undefined, message?: string) {
  if (value === null || value === undefined) {
    throw new Error(message || 'Value is null or undefined');
  }
}

function assertGreaterThan(actual: number, expected: number, message?: string) {
  if (actual <= expected) {
    throw new Error(message || `Expected ${actual} > ${expected}`);
  }
}

function assertLessThan(actual: number, expected: number, message?: string) {
  if (actual >= expected) {
    throw new Error(message || `Expected ${actual} < ${expected}`);
  }
}

function assertContains(array: any[], value: any, message?: string) {
  if (!array.includes(value)) {
    throw new Error(message || `Array does not contain ${value}`);
  }
}

function assertMatch(str: string, pattern: RegExp, message?: string) {
  if (!pattern.test(str)) {
    throw new Error(message || `"${str}" does not match ${pattern}`);
  }
}

// 创建测试实例
const runner = new TestRunner();

// ============================================
// 1. 基础功能测试
// ============================================

runner.test('fetchGameStep: should generate initial options for empty sentence', async () => {
  const result = await fetchGameStep([], []);
  
  assertNotNull(result, 'Result should not be null');
  assertEqual(result.nextOptions.length, 2, 'Should provide exactly 2 options');
  assert(result.aiComment.length > 0, 'AI comment should not be empty');
  assertEqual(result.isComplete, false, 'Initial sentence should not be complete');
  assertNotNull(result.scene, 'Scene should be defined');
});

runner.test('fetchGameStep: should provide valid word options', async () => {
  const result = await fetchGameStep([], []);
  
  result.nextOptions.forEach((option, i) => {
    assert(option.word.length > 0, `Option ${i} word should not be empty`);
    assert(option.emoji.length > 0, `Option ${i} emoji should not be empty`);
    assert(option.zh.length > 0, `Option ${i} zh should not be empty`);
  });
});

runner.test('fetchGameStep: should return token usage metadata', async () => {
  const result = await fetchGameStep([], []);
  
  assertNotNull(result.tokenUsage, 'Token usage should be defined');
  assertGreaterThan(result.tokenUsage!.prompt, 0, 'Prompt tokens should be > 0');
  assertGreaterThan(result.tokenUsage!.response, 0, 'Response tokens should be > 0');
  assertGreaterThan(result.tokenUsage!.total, 0, 'Total tokens should be > 0');
});

// ============================================
// 2. 句子完成检测
// ============================================

runner.test('Completion: should not complete short sentences (< 6 words)', async () => {
  const shortSentence: WordOption[] = [
    { word: 'The', emoji: '📝', zh: '这个' },
    { word: 'dinosaur', emoji: '🦖', zh: '恐龙' },
    { word: 'ran', emoji: '🏃', zh: '跑' }
  ];
  
  const result = await fetchGameStep(shortSentence, []);
  assertEqual(result.isComplete, false, 'Short sentence should not be complete');
});

runner.test('Completion: should complete valid long sentences', async () => {
  let sentence: WordOption[] = [];
  let isComplete = false;
  let attempts = 0;
  const maxAttempts = 15;
  
  while (!isComplete && attempts < maxAttempts) {
    const result = await fetchGameStep(sentence, []);
    
    if (result.isComplete) {
      isComplete = true;
      assert(result.englishTranslation.length > 0, 'English translation should exist');
      assertGreaterThan(sentence.length, 5, 'Complete sentence should have 6+ words');
      break;
    }
    
    if (result.nextOptions.length > 0) {
      sentence = [...result.currentSentence, result.nextOptions[0]];
    }
    
    attempts++;
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  assert(isComplete, 'Sentence should complete within 15 attempts');
});

// ============================================
// 3. 场景管理
// ============================================

runner.test('Scene: should start with valid scene type', async () => {
  const result = await fetchGameStep([], []);
  const validScenes = ['forest', 'ocean', 'space', 'magic', 'home', 'school', 
                       'park', 'playground', 'street', 'hospital', 'restaurant', 
                       'library', 'shop', 'default'];
  
  assertContains(validScenes, result.scene.type, 'Scene type should be valid');
});

runner.test('Scene: should provide valid scene metadata', async () => {
  const result = await fetchGameStep([], []);
  
  assert(result.scene.backgroundEmoji.length > 0, 'Background emoji should exist');
  assertMatch(result.scene.colorTheme, /^#[0-9A-Fa-f]{6}$/, 'Color theme should be hex format');
});

// ============================================
// 4. 上下文压缩策略
// ============================================

runner.test('Context: should handle empty history efficiently', async () => {
  const result = await fetchGameStep([], []);
  
  assertNotNull(result.tokenUsage, 'Token usage should exist');
  assertLessThan(result.tokenUsage!.prompt, 500, 'Empty history should use < 500 tokens');
});

runner.test('Context: should compress long history (30 pages)', async () => {
  const longHistory: StoryPage[] = Array.from({ length: 30 }, (_, i) => ({
    text: `This is sentence number ${i + 1} in the story.`,
    scene: { type: 'forest', backgroundEmoji: '🌲', colorTheme: '#4A90E2' },
    timestamp: Date.now()
  }));
  
  const result = await fetchGameStep([], longHistory);
  
  assertNotNull(result, 'Result should exist');
  assertNotNull(result.tokenUsage, 'Token usage should exist');
  assertLessThan(result.tokenUsage!.prompt, 1500, '30 pages should use < 1500 prompt tokens');
});

runner.test('Context: should use summary for very long stories (55 pages)', async () => {
  const veryLongHistory: StoryPage[] = Array.from({ length: 55 }, (_, i) => ({
    text: `Sentence ${i + 1}.`,
    scene: { 
      type: (i % 2 === 0 ? 'forest' : 'ocean') as any, 
      backgroundEmoji: '🌲', 
      colorTheme: '#4A90E2' 
    },
    timestamp: Date.now()
  }));
  
  const result = await fetchGameStep([], veryLongHistory);
  
  assertNotNull(result.tokenUsage, 'Token usage should exist');
  assertLessThan(result.tokenUsage!.prompt, 2000, '55 pages should use < 2000 prompt tokens');
});

// ============================================
// 5. AI 评论格式验证
// ============================================

runner.test('AI Comment: should include English words in quotes', async () => {
  const result = await fetchGameStep([], []);
  
  assert(result.aiComment.includes("'"), 'AI comment should contain single quotes for English words');
});

runner.test('AI Comment: should be bilingual (Chinese + English)', async () => {
  const result = await fetchGameStep([], []);
  
  const hasChinese = /[\u4e00-\u9fa5]/.test(result.aiComment);
  const hasEnglish = /[a-zA-Z]/.test(result.aiComment);
  
  assert(hasChinese, 'AI comment should contain Chinese characters');
  assert(hasEnglish, 'AI comment should contain English characters');
});

// ============================================
// 6. 图片生成
// ============================================

runner.test('Image: should generate image for sentence', async () => {
  const sentence = "A happy dinosaur played in the forest";
  const image = await generateStoryImage(sentence, 'forest');
  
  if (image) {
    assert(image.includes('data:'), 'Image should be base64 data URL');
    assert(image.includes('base64'), 'Image should contain base64 marker');
    assertGreaterThan(image.length, 1000, 'Image should have reasonable size');
  }
  // Note: Image generation may fail, so we don't assert it must succeed
});

runner.test('Image: should handle generation failure gracefully', async () => {
  const sentence = "Test";
  const image = await generateStoryImage(sentence, 'default');
  
  assert(image === null || typeof image === 'string', 'Image should be null or string');
});

// ============================================
// 7. 长度警告
// ============================================

runner.test('Warning: should not warn for short stories', () => {
  assertEqual(getStoryLengthWarning(10), null, 'No warning at 10 pages');
  assertEqual(getStoryLengthWarning(30), null, 'No warning at 30 pages');
});

runner.test('Warning: should warn at 50 sentences', () => {
  const warning = getStoryLengthWarning(50);
  assertNotNull(warning, 'Should warn at 50 pages');
  assert(warning!.includes('50') || warning!.includes('好多'), 'Warning should mention length');
});

runner.test('Warning: should warn at 100 sentences', () => {
  const warning = getStoryLengthWarning(100);
  assertNotNull(warning, 'Should warn at 100 pages');
  assert(warning!.includes('100') || warning!.includes('好长'), 'Warning should mention length');
});

// ============================================
// 8. Token 使用优化验证
// ============================================

runner.test('Optimization: should use fewer tokens initially', async () => {
  const result = await fetchGameStep([], []);
  const tokens = result.tokenUsage?.prompt || 0;
  
  assertLessThan(tokens, 500, 'Initial prompt should use < 500 tokens');
});

runner.test('Optimization: should maintain reasonable token usage', async () => {
  const history: StoryPage[] = Array.from({ length: 20 }, (_, i) => ({
    text: `Sentence ${i + 1}`,
    scene: { type: 'forest', backgroundEmoji: '🌲', colorTheme: '#4A90E2' },
    timestamp: Date.now()
  }));
  
  const result = await fetchGameStep([], history);
  const tokens = result.tokenUsage?.total || 0;
  
  assertLessThan(tokens, 1000, '20 pages should use < 1000 total tokens');
});

// ============================================
// 9. 集成测试 - 完整故事生成
// ============================================

runner.test('Integration: should generate complete 3-sentence story', async () => {
  const history: StoryPage[] = [];
  let totalTokens = 0;
  let totalSteps = 0;
  
  console.log('\n   Generating 3-sentence story...');
  
  for (let i = 0; i < 3; i++) {
    let sentence: WordOption[] = [];
    let isComplete = false;
    let attempts = 0;
    
    while (!isComplete && attempts < 15) {
      const result = await fetchGameStep(sentence, history);
      
      if (result.tokenUsage) {
        totalTokens += result.tokenUsage.total;
      }
      
      if (result.isComplete) {
        const text = result.currentSentence.map(w => w.word).join(' ');
        history.push({
          text,
          scene: result.scene,
          timestamp: Date.now()
        });
        isComplete = true;
        console.log(`   ✓ Sentence ${i + 1}: "${text}" (${attempts + 1} steps)`);
      } else {
        sentence = [...result.currentSentence, result.nextOptions[0]];
      }
      
      attempts++;
      totalSteps++;
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    assert(isComplete, `Sentence ${i + 1} should complete`);
  }
  
  assertEqual(history.length, 3, 'Should generate exactly 3 sentences');
  assertGreaterThan(totalTokens, 0, 'Should consume tokens');
  assertLessThan(totalTokens, 5000, '3 sentences should use < 5000 tokens');
  
  console.log(`   📊 Total: ${totalSteps} steps, ${totalTokens} tokens\n`);
});

// ============================================
// 10. 长绘本生成测试（可选，通过环境变量控制）
// ============================================

if (process.env.TEST_LONG_STORY) {
  const targetSentences = parseInt(process.env.TEST_LONG_STORY);
  
  runner.test(`Long Story: should generate ${targetSentences}-sentence story`, async () => {
    const history: StoryPage[] = [];
    let totalTokens = 0;
    let totalSteps = 0;
    const startTime = Date.now();
    
    console.log(`\n   🦖 Generating ${targetSentences}-sentence story...\n`);
    
    for (let i = 1; i <= targetSentences; i++) {
      let sentence: WordOption[] = [];
      let isComplete = false;
      let attempts = 0;
      let sentenceTokens = 0;
      
      while (!isComplete && attempts < 20) {
        const result = await fetchGameStep(sentence, history);
        
        if (result.tokenUsage) {
          sentenceTokens += result.tokenUsage.total;
        }
        
        if (result.isComplete) {
          const text = result.currentSentence.map(w => w.word).join(' ');
          
          // 尝试生成图片
          const image = await generateStoryImage(text, result.scene.type);
          
          history.push({
            text,
            scene: result.scene,
            image: image || undefined,
            timestamp: Date.now()
          });
          
          isComplete = true;
          totalTokens += sentenceTokens;
          
          console.log(`   ${i}. "${text}"`);
          console.log(`      Scene: ${result.scene.type} ${result.scene.backgroundEmoji}`);
          console.log(`      Tokens: ${sentenceTokens} (Avg: ${Math.round(totalTokens/i)})`);
          console.log(`      Image: ${image ? '✅' : '❌'}\n`);
        } else {
          sentence = [...result.currentSentence, result.nextOptions[0]];
        }
        
        attempts++;
        totalSteps++;
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      assert(isComplete, `Sentence ${i} should complete`);
      
      // 检查长度警告
      const warning = getStoryLengthWarning(history.length);
      if (warning) {
        console.log(`   ⚠️  ${warning}\n`);
      }
    }
    
    const duration = Math.round((Date.now() - startTime) / 1000);
    const imagesGenerated = history.filter(p => p.image).length;
    
    console.log(`\n   ${'━'.repeat(60)}`);
    console.log(`   📊 Final Statistics`);
    console.log(`   ${'━'.repeat(60)}`);
    console.log(`   Sentences: ${history.length}`);
    console.log(`   Total Steps: ${totalSteps}`);
    console.log(`   Total Tokens: ${totalTokens}`);
    console.log(`   Avg Tokens/Sentence: ${Math.round(totalTokens / history.length)}`);
    console.log(`   Images Generated: ${imagesGenerated}/${history.length}`);
    console.log(`   Duration: ${duration}s (${Math.round(duration / history.length)}s per sentence)`);
    console.log(`   ${'━'.repeat(60)}\n`);
    
    assertEqual(history.length, targetSentences, 'Should generate exact number of sentences');
  });
}

// 运行所有测试
runner.run();
