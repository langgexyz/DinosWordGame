
import { GoogleGenAI, Type } from "@google/genai";
import { GameState, WordOption, SceneType, StoryPage } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const SYSTEM_INSTRUCTION = `
You are "Dino" (小恐龙), a cute, energetic 4-year-old dinosaur friend.
You are playing a sentence-building game with a child.

**Persona:**
- **Tone:** Excited, playful, encouraging! Use emojis.
- **Address User:** Address the child as "你" (You). Never use specific names.
- **Role:** Help the child build a sentence word by word.
- **Language:** Simple Chinese explanations. IMPORTANT: When asking the child to choose, you MUST use the English words in your Chinese sentence so they can hear them.
  - Example: "Do you want a **red** apple or a **green** apple?" -> "你想要 'red' 红色的苹果，还是 'green' 绿色的苹果呢？"

**Game Rules:**
1. **Continuous Story:** We write a never-ending adventure together.
2. **Scenes:** Detect the current setting (Forest, Ocean, Space, etc.) based on the words.
3. **Start of Story:** If currentWords is empty, provide 2 options to start the sentence (e.g., "The" vs "One", or "A" vs "My"). Do NOT auto-fill the first word.
4. **Options:** Always provide exactly 2 options for the next word.
5. **Punctuation:** 
   - If a word naturally needs a comma after it (e.g., introductory words like "Suddenly", "However", "Then"), include the comma in the 'word' field (e.g., "Suddenly,").
   - Do NOT include periods in the middle of a sentence.
6. **Completion:** STRICT grammar check. Only complete when 6+ words AND ends on a noun/complete thought. Never end on articles, adjectives, or prepositions (like 'and', 'with', 'the', 'a').

**JSON Response Format:**
{
  "aiComment": "string (Chinese, excited. Must include the English option words for learning!)",
  "scene": {
    "type": "forest | ocean | space | city | home | magic | default",
    "backgroundEmoji": "string (1 emoji)",
    "colorTheme": "string (css hex)"
  },
  "nextOptions": [
    { "word": "string", "emoji": "string (1 emoji)", "zh": "string" },
    { "word": "string", "emoji": "string (1 emoji)", "zh": "string" }
  ],
  "isComplete": boolean,
  "englishTranslation": "string (full sentence translation with proper punctuation)"
}
`;

export const fetchGameStep = async (currentWords: WordOption[], history: StoryPage[] = []): Promise<GameState> => {
  // We allow errors to bubble up so the UI can show a "Retry" state
  const historyText = history.length > 0 
    ? `Story so far: "${history.map(h => h.text).join(' ')}".` 
    : "Start a brand new story.";
    
  const currentSentenceText = currentWords.map(w => w.word).join(" ");
  const isStartOfSentence = currentWords.length === 0;

  const prompt = `
    Context: ${historyText}
    Current incomplete sentence: "${currentSentenceText}"
    Is Start of Sentence: ${isStartOfSentence}
    
    Tasks:
    1. Determine the Scene (where are we?).
    2. If 'Is Start of Sentence' is true, generate 2 'nextOptions' suitable for starting a sentence (e.g. "The", "A", "Once").
    3. Generate 2 'nextOptions' for the NEXT word.
    4. If sentence is long (>5 words) and grammatically complete (ends in noun), set isComplete=true.
    5. CRITICAL: Do NOT set isComplete=true if the sentence ends with a connector or preposition (and, or, with, a, the).
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      temperature: 1.0,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          aiComment: { type: Type.STRING },
          scene: {
            type: Type.OBJECT,
            properties: {
              type: { type: Type.STRING, enum: ['forest', 'ocean', 'space', 'city', 'home', 'magic', 'default'] },
              backgroundEmoji: { type: Type.STRING },
              colorTheme: { type: Type.STRING }
            }
          },
          nextOptions: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                word: { type: Type.STRING },
                emoji: { type: Type.STRING },
                zh: { type: Type.STRING },
              },
              required: ["word", "emoji", "zh"]
            }
          },
          isComplete: { type: Type.BOOLEAN },
          englishTranslation: { type: Type.STRING }
        },
        required: ["aiComment", "nextOptions", "isComplete", "scene"]
      }
    }
  });

  const text = response.text;
  if (!text) throw new Error("No response from AI");
  
  const data = JSON.parse(text);

  // Fallback guard: Ensure isComplete is false if specific last words are used, regardless of what AI says
  const lastWord = currentWords.length > 0 ? currentWords[currentWords.length - 1].word.toLowerCase() : "";
  const forbiddenEndings = ['and', 'or', 'but', 'with', 'the', 'a', 'an', 'my', 'his', 'her', 'their', 'of', 'to', 'in', 'on', 'at'];
  
  let finalIsComplete = data.isComplete;
  if (forbiddenEndings.includes(lastWord)) {
      finalIsComplete = false;
  }
  
  return {
    history: history,
    currentSentence: currentWords,
    aiComment: data.aiComment,
    nextOptions: data.nextOptions || [],
    isComplete: finalIsComplete,
    englishTranslation: data.englishTranslation,
    scene: data.scene
  };
};

export const generateStoryImage = async (sentence: string, sceneType: string): Promise<string | null> => {
  try {
    const prompt = `
      Create a cute, colorful, flat vector art style illustration for a children's storybook.
      
      Scene Setting: ${sceneType}
      Action/Subject: ${sentence}
      
      Style parameters:
      - Bright, happy colors
      - Simple shapes, easy to understand for a 4-year-old
      - White or soft pastel background
      - No text inside the image
      - Aspect Ratio 1:1
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: prompt,
    });

    // Iterate through parts to find the image
    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData && part.inlineData.data) {
          return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
      }
    }
    
    return null;
  } catch (error) {
    console.error("Image generation failed:", error);
    return null; // Fail silently for image, game can continue without it
  }
};
