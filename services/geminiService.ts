
import { GoogleGenAI, Type } from "@google/genai";
import { MindMapData } from "../types";

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
- MANDATORY: Use LaTeX for all mathematical equations ($...$ inline, $$...$$ blocks).
- Rigorous step-by-step derivations for physics and chemistry.
- For Study Notes: Create chapters with "Mastery Axioms", "Detailed Derivations", and "Advanced Entrance Logic".
- ABSOLUTE RULE: Never provide demo or placeholder content. Every response must be a real, complete educational asset ready for a top-tier student.`;

export async function askTutor(params: {
  prompt: string;
  useThinking?: boolean;
  useSearch?: boolean;
  useFast?: boolean;
  image?: { data: string; mimeType: string };
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

  try {
    const response = await ai.models.generateContent({
      model,
      contents: params.image 
        ? { parts: [{ inlineData: params.image }, { text: params.prompt }] } 
        : params.prompt,
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

export async function generateMindMap(topic: string): Promise<MindMapData> {
  const ai = getGeminiClient();
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Generate an n8n-style interactive mind map for "${topic}".
Break it into 4 distinct, high-quality learning stages:
1. Foundation Concepts
2. Core Mechanics & Formulas
3. Advanced Problem Solving
4. Competitive Exam Tips
Keep node content concise to avoid JSON truncation errors. Output valid JSON.`,
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
                      type: { type: Type.STRING },
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
    return JSON.parse(response.text || '{}') as MindMapData;
  } catch (e) {
    console.error("JSON Parsing failed. Attempting fallback or returning empty structure.");
    throw new Error("Model generated invalid JSON structure. Please retry.");
  }
}

export async function generateStudyVisual(prompt: string, aspectRatio: string) {
  await ensureApiKey();
  const ai = getGeminiClient();
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-image-preview',
    contents: { parts: [{ text: `Professional educational diagram: ${prompt}. Clean white background, technical labeling, high precision for JEE/NEET study aids.` }] },
    config: {
      imageConfig: { aspectRatio: aspectRatio as any, imageSize: "1K" }
    }
  });

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  throw new Error("Visual aid generation failed.");
}

export function decodeBase64(base64: string) {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export async function decodeAudioData(data: Uint8Array, ctx: AudioContext, sampleRate = 24000, numChannels = 1): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

export function encodeAudio(data: Float32Array): string {
  const int16 = new Int16Array(data.length);
  for (let i = 0; i < data.length; i++) int16[i] = data[i] * 32768;
  const bytes = new Uint8Array(int16.buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}
