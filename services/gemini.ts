
import { GoogleGenAI, Type } from "@google/genai";
import { GameState, WordOption, SceneType, StoryPage } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const SYSTEM_INSTRUCTION = `
You are Dino 🦖, creating an ongoing picture book story WITH the child.

**Core Rules:**
1. aiComment: Chinese + English in quotes. Example: "接下来选 'opened'（打开）还是 'knocked'（敲门）？"
2. nextOptions: Exactly 2 word choices
3. isComplete: true ONLY if 6+ words AND ends with noun/verb (NOT: a/the/and/or/with/comma)
4. Scene: Keep current unless clear location change

**CRITICAL - Story Continuity:**
When starting a new sentence (empty currentWords BUT history exists):
- CONTINUE the previous story, don't restart
- Reference what just happened
- Provide connecting words as options:
  * Pronouns: "It", "She", "He", "They" 
  * Character names: "The dinosaur", "The dragon"
  * Connectors: "Then,", "Next,", "Suddenly,"
  
Examples:
- After "The dragon breathed fire" → Options: "It" vs "The dragon"
- After "A girl found a door" → Options: "She" vs "The girl"  
- After "They played together" → Options: "Then," vs "Next,"

**Scenes:** forest🌲 ocean🌊 space🚀 magic✨ home🏠 school🏫 park🎡 playground🛝 street🚦 hospital🏥 restaurant🍽️ library📚 shop🏪 default🌟
`;

export const fetchGameStep = async (currentWords: WordOption[], history: StoryPage[] = []): Promise<GameState> => {
  const isStartOfSentence = currentWords.length === 0;
  const lastSentence = history.length > 0 ? history[history.length - 1].text : "";
  
  // Build context
  let contextPrompt = "";
  if (history.length === 0) {
    contextPrompt = "Starting a brand new story.";
  } else if (history.length <= 3) {
    contextPrompt = `Story so far: ${history.map(h => `"${h.text}"`).join('. ')}.`;
  } else {
    // Show last 2-3 sentences for continuity
    const recent = history.slice(-3);
    contextPrompt = `Recent story: ${recent.map(h => `"${h.text}"`).join('. ')}.`;
  }
  
  const currentSentenceText = currentWords.map(w => w.word).join(" ");

  const prompt = `
${contextPrompt}

Current sentence being built: "${currentSentenceText}"
Words count: ${currentWords.length}

${isStartOfSentence && history.length > 0 
  ? `IMPORTANT: This is a NEW sentence continuing from "${lastSentence}". Provide options that CONTINUE the story (pronouns, character names, or connectors like "Then,").`
  : isStartOfSentence 
    ? "This is the FIRST sentence. Provide story starters (The/A/Once)."
    : "Provide next word options to continue this sentence."
}

Tasks:
1. Determine scene
2. Generate 2 nextOptions
3. Check if complete (6+ words AND ends with noun/verb)
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
