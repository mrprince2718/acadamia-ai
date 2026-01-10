
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

  // Build parts
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

export async function generateQuiz(topic: string, language: string): Promise<QuizData> {
  const ai = getGeminiClient();
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Synthesize a highly technical "QUIZ RUSH" protocol for "${topic}".
    Language: ${language === 'GU' ? 'Gujarati' : 'English'}.
    Target: JEE/NEET entrance difficulty level.
    Structure: 5 high-depth questions.
    For each question:
    - Include 4 challenging options.
    - provide a detailed explanation.
    - If the question involves a structure (like Organic Chemistry GOC, Physics circuit, or Bio cell), provide a detailed 'diagramPrompt' describing only the visual aid needed.
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
                diagramPrompt: { type: Type.STRING }
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
The output must be a highly technical, interconnected graph designed for top-tier competitive exams.
Break it into 4 specialized pages:
1. "Foundational Axioms & Lexicon": Define the root principles and terminology.
2. "Mathematical Frameworks & Derivatives": Focus on formulas, derivations, and variable relationships. Use LaTeX.
3. "Competitive Exam Logic (JEE/NEET)": Focus on common pitfalls, edge cases, and high-yield concepts.
4. "Synthesis & Real-World Application": How this topic connects to larger academic themes.

Each page should have 5-8 nodes. Connect them with logical flow edges. 
Ensure 'label' is the title and 'content' is a deep, expert-level explanation (at least 2-3 sentences).
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
    console.error("JSON Parsing failed.", response.text);
    throw new Error("Logic synthesis failed. Please re-initialize.");
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
