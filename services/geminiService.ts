
import { GoogleGenAI, Type } from "@google/genai";
import { MindMapData, QuizData } from "../types";

export const getGeminiClient = () => {
  return new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
};

export async function ensureApiKey() {
  if (typeof window !== 'undefined' && window.aistudio) {
    const hasKey = await window.aistudio.hasSelectedApiKey();
    if (!hasKey) {
      await window.aistudio.openSelectKey();
    }
  }
}

const SYSTEM_INSTRUCTION = `You are an elite Academic Architect and JEE/NEET entrance specialist. 
Your goal is to provide high-depth pedagogical content.
- OCR & HANDWRITING SPECIALIST: You possess superior capabilities in analyzing handwritten student notes, messy whiteboard photos, and complex PDF documents.
- MANDATORY: Use LaTeX for all mathematical equations ($...$ inline, $$...$$ blocks).
- Rigorous step-by-step derivations for physics and chemistry.
- For Study Notes: Create chapters with "Mastery Axioms", "Detailed Derivations", and "Advanced Entrance Logic".
- ANALYSIS CAPABILITY: When analyzing handwritten notes, transcribe accurately, clarify messy parts, and expand on the concepts with academic rigor.
- ABSOLUTE RULE: Never provide demo or placeholder content. Every response must be a real, complete educational asset ready for a top-tier student.`;

function cleanJsonResponse(text: string): string {
  return text.replace(/```json/g, "").replace(/```/g, "").trim();
}

export async function askTutor(params: {
  prompt: string;
  useThinking?: boolean;
  useSearch?: boolean;
  useFast?: boolean;
  mediaParts?: Array<{ data: string; mimeType: string }>;
}) {
  if (params.useThinking) await ensureApiKey();
  
  const ai = getGeminiClient();
  const model = params.useThinking 
    ? 'gemini-3-pro-preview' 
    : (params.useFast ? 'gemini-flash-lite-latest' : 'gemini-3-flash-preview');

  const config: any = {
    systemInstruction: SYSTEM_INSTRUCTION,
    temperature: 0.7,
  };

  if (params.useThinking) {
    config.thinkingConfig = { thinkingBudget: 32768 };
  }

  if (params.useSearch) {
    config.tools = [{ googleSearch: {} }];
  }

  const parts: any[] = [];
  if (params.mediaParts && params.mediaParts.length > 0) {
    params.mediaParts.forEach(m => {
      parts.push({ inlineData: { data: m.data, mimeType: m.mimeType } });
    });
  }
  parts.push({ text: params.prompt });

  try {
    const response = await ai.models.generateContent({
      model,
      contents: { parts },
      config,
    });

    return {
      text: response.text || '',
      sources: response.candidates?.[0]?.groundingMetadata?.groundingChunks?.map((chunk: any) => ({
        title: chunk.web?.title || 'Source',
        uri: chunk.web?.uri || '#'
      })) || [],
      thinking: (response as any).candidates?.[0]?.content?.parts?.find((p: any) => p.thought)?.thought
    };
  } catch (error: any) {
    if (error.message?.includes("Requested entity was not found")) {
      await window.aistudio.openSelectKey();
    }
    throw error;
  }
}

/**
 * Uses the specific PicoApps WebSocket API provided by the user for note synthesis.
 * This bypasses the Google GenAI SDK for the notes feature as requested.
 */
export function synthesizeNotesPico(prompt: string, onChunk: (chunk: string) => void, onComplete: () => void, onError: (err: any) => void) {
  const ws = new WebSocket(`wss://backend.buildpicoapps.com/ask_ai_streaming_v2`);
  
  ws.addEventListener("open", () => {
    ws.send(
      JSON.stringify({
        appId: "home-suggest", 
        prompt: `Act as a senior academic tutor. Analyze the following topic/text and create a structured, high-depth study chapter with axioms, exam-focused points, and summary: ${prompt}`
      })
    );
  });

  ws.addEventListener("message", (event) => {
    onChunk(event.data);
  });

  ws.addEventListener("close", (event) => {
    if (event.code !== 1000) {
      console.warn("WS Closed unexpectedly", event.code);
    }
    onComplete();
  });

  ws.addEventListener("error", (error) => {
    console.error("WS Error", error);
    onError(error);
  });

  return () => {
    if (ws.readyState === WebSocket.OPEN) ws.close();
  };
}

export async function generateQuiz(topic: string, language: string): Promise<QuizData> {
  await ensureApiKey();
  const ai = getGeminiClient();
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Synthesize a technical "QUIZ RUSH" protocol for "${topic}".
    Language: ${language === 'GU' ? 'Gujarati' : 'English'}.
    Structure: 5 challenging questions targeting JEE/NEET/Advanced levels. 
    VISUAL REQUIREMENT: For subjects like Organic Chemistry (GOC, Isomerism), Physics (Circuits, Optics), or Biology, strictly provide a detailed 'diagramPrompt' describing the necessary visual aid.
    Output ONLY JSON.`,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          questions: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                question: { type: Type.STRING },
                options: { type: Type.ARRAY, items: { type: Type.STRING } },
                correctAnswerIndex: { type: Type.NUMBER },
                explanation: { type: Type.STRING },
                diagramPrompt: { type: Type.STRING, description: 'Prompt for image generator to create a technical diagram' }
              },
              required: ['id', 'question', 'options', 'correctAnswerIndex', 'explanation']
            }
          }
        },
        required: ['title', 'questions']
      }
    }
  });

  try {
    const cleaned = cleanJsonResponse(response.text || '{}');
    const data = JSON.parse(cleaned);
    return { ...data, id: Date.now().toString(), timestamp: Date.now() };
  } catch (e) {
    throw new Error("Quiz synthesis failed.");
  }
}

export async function generateMindMap(topic: string): Promise<MindMapData> {
  const ai = getGeminiClient();
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Construct a "Mastery Architecture" Mind Map for "${topic}".
Output ONLY JSON.`,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          pages: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                page: { type: Type.NUMBER },
                summary: { type: Type.STRING },
                nodes: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      id: { type: Type.STRING },
                      label: { type: Type.STRING },
                      type: { type: Type.STRING, enum: ['topic', 'subtopic', 'example', 'tip', 'mistake', 'formula'] },
                      content: { type: Type.STRING }
                    },
                    required: ['id', 'label', 'type', 'content']
                  }
                },
                edges: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      from: { type: Type.STRING },
                      to: { type: Type.STRING }
                    },
                    required: ['from', 'to']
                  }
                }
              },
              required: ['page', 'summary', 'nodes', 'edges']
            }
          }
        },
        required: ['title', 'pages']
      }
    }
  });

  try {
    const cleaned = cleanJsonResponse(response.text || '{}');
    return JSON.parse(cleaned) as MindMapData;
  } catch (e) {
    throw new Error("Logic synthesis failed.");
  }
}

export async function generateStudyVisual(prompt: string, aspectRatio: string) {
  await ensureApiKey();
  const ai = getGeminiClient();
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-image-preview',
    contents: { parts: [{ text: `High-fidelity academic architectural diagram of: ${prompt}. 
Style: Technical blueprint, clean white background, ISO-standard labeling, microscopic precision, textbook-quality rendering. 
Target Audience: Medical and Engineering students. Use vector-like clarity.` }] },
    config: {
      imageConfig: { aspectRatio: aspectRatio as any, imageSize: "1K" }
    }
  });

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  throw new Error("Visual synthesis failed.");
}
