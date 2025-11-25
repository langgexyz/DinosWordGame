import { GoogleGenAI, Type } from "@google/genai";
import { GameState, WordOption, SceneType } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const SYSTEM_INSTRUCTION = `
You are "Dino" (小恐龙), a cute, energetic 4-year-old dinosaur friend.
You are playing a sentence-building game with a child "Xixi".

**Persona:**
- **Tone:** Excited, playful, encouraging! Use emojis.
- **Role:** You start the sentence, then ask Xixi to pick the next word.
- **Language:** Simple Chinese explanations, English for the story words.

**Game Rules:**
1. **Continuous Story:** We write a never-ending adventure.
2. **Scenes:** You MUST detect the current setting (Forest, Ocean, Space, etc.) based on the words.
3. **Start of Story:** If the "current sentence" is empty, YOU MUST provide a 'suggestedAddedWord' to start the sentence (e.g., "One day", "A big", "The").
4. **Options:** Always provide exactly 2 options for the *next* word.
5. **Completion:** STRICT grammar check. Only end on a noun/complete thought. Never end on "a", "the", "red", "in".

**JSON Response Format:**
{
  "aiComment": "string (Chinese, excited)",
  "scene": {
    "type": "string (forest, ocean, space, city, home, magic, default)",
    "backgroundEmoji": "string (1 char)",
    "colorTheme": "string (css hex or hint)"
  },
  "suggestedAddedWord": { "word": "string", "emoji": "string", "zh": "string" } (ONLY if starting a new sentence),
  "nextOptions": [
    { "word": "string", "emoji": "string", "zh": "string" },
    { "word": "string", "emoji": "string", "zh": "string" }
  ],
  "isComplete": boolean,
  "englishTranslation": "string"
}
`;

export const fetchGameStep = async (currentWords: WordOption[], storyHistory: string[] = []): Promise<GameState> => {
  // We allow errors to bubble up so the UI can show a "Retry" state
  const historyText = storyHistory.length > 0 
    ? `Story so far: "${storyHistory.join(' ')}".` 
    : "Start a brand new story.";
    
  const currentSentenceText = currentWords.map(w => w.word).join(" ");
  const isStartOfSentence = currentWords.length === 0;

  const prompt = `
    Context: ${historyText}
    Current incomplete sentence: "${currentSentenceText}"
    Is Start of Sentence: ${isStartOfSentence}
    
    Tasks:
    1. Determine the Scene (where are we?).
    2. If 'Is Start of Sentence' is true, generate a 'suggestedAddedWord' (e.g., "The", "A", "Once") to begin.
    3. Generate 2 'nextOptions' for the NEXT word.
    4. If sentence is long (>5 words) and grammatically complete (ends in noun), set isComplete=true.
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
          suggestedAddedWord: {
            type: Type.OBJECT,
            properties: {
              word: { type: Type.STRING },
              emoji: { type: Type.STRING },
              zh: { type: Type.STRING },
            },
            nullable: true
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

  return {
    storyHistory: storyHistory,
    currentSentence: currentWords,
    aiComment: data.aiComment,
    nextOptions: data.nextOptions || [],
    isComplete: data.isComplete,
    englishTranslation: data.englishTranslation,
    scene: data.scene,
    suggestedAddedWord: data.suggestedAddedWord
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
