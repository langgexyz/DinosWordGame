# 🦖 Dino's Word Game

AI-powered English learning picture book for kids (4-6 years old).

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure API key:
```bash
# Create .env.local file
echo "GEMINI_API_KEY=your_gemini_api_key" > .env.local
```
Get your API key from: https://aistudio.google.com/app/apikey

3. Run the app:
```bash
npm run dev
```

## Testing

```bash
# Run mock demo (查看测试数据格式，无需网络)
npx tsx test/gemini-mock.test.ts

# Run unit tests (需要网络连接)
npm test

# Generate long story to test token optimization
TEST_LONG_STORY=50 npm test
```

### 网络问题排查

如果测试失败并提示 "Connect Timeout Error"，请检查：
1. 网络是否能访问 Google API (`generativelanguage.googleapis.com`)
2. 是否需要配置代理
3. 防火墙设置

可以先运行 mock 测试查看预期的数据格式。

## Features

- ✅ Bilingual AI assistant (Chinese + English)
- ✅ Voice synthesis for listening practice
- ✅ AI-generated illustrations
- ✅ Multiple educational scenes (safety, social skills, daily life)
- ✅ Context compression for long stories (optimized token usage)
