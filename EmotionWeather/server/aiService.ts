import { GoogleGenAI } from "@google/genai";

// DON'T DELETE THIS COMMENT - Google Gemini integration
// Follow these instructions when using this blueprint:
// - Note that the newest Gemini model series is "gemini-2.5-flash" or gemini-2.5-pro"
//   - do not change this unless explicitly requested by the user

// This API key is from Gemini Developer API Key, not vertex AI API Key
const geminiAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export interface AIResponse {
  text: string;
  source: 'gemini' | 'perplexity';
  success: boolean;
  citations?: string[];
}

export class AIService {
  
  // Test if Gemini API is available
  private static async isGeminiAvailable(): Promise<boolean> {
    try {
      // Skip test if API key is not set
      if (!process.env.GEMINI_API_KEY) {
        return false;
      }
      
      const response = await geminiAI.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [{ role: "user", parts: [{ text: "Test connection" }] }],
      });
      return !!response.text;
    } catch (error) {
      console.log("Gemini API not available:", (error as Error).message);
      return false;
    }
  }

  // Test if Perplexity API is available
  private static async isPerplexityAvailable(): Promise<boolean> {
    try {
      // Skip test if API key is not set
      if (!process.env.PERPLEXITY_API_KEY) {
        return false;
      }
      
      const response = await fetch("https://api.perplexity.ai/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.PERPLEXITY_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "llama-3.1-sonar-small-128k-online",
          messages: [{ role: "user", content: "Test connection" }],
          max_tokens: 10,
          temperature: 0.1,
        }),
      });
      return response.ok;
    } catch (error) {
      console.log("Perplexity API not available:", (error as Error).message);
      return false;
    }
  }

  // Gemini API call
  private static async callGemini(prompt: string): Promise<AIResponse> {
    try {
      const response = await geminiAI.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [{ role: "user", parts: [{ text: prompt }] }],
      });

      return {
        text: response.text || "No response from Gemini",
        source: 'gemini',
        success: true,
      };
    } catch (error) {
      console.error("Gemini API error:", error);
      return {
        text: "",
        source: 'gemini',
        success: false,
      };
    }
  }

  // Perplexity API call  
  private static async callPerplexity(prompt: string): Promise<AIResponse> {
    try {
      const response = await fetch("https://api.perplexity.ai/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.PERPLEXITY_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "llama-3.1-sonar-small-128k-online",
          messages: [
            { role: "system", content: "Be precise and concise." },
            { role: "user", content: prompt }
          ],
          temperature: 0.2,
          top_p: 0.9,
          stream: false,
        }),
      });

      if (!response.ok) {
        throw new Error(`Perplexity API error: ${response.status}`);
      }

      const data = await response.json();
      
      return {
        text: data.choices?.[0]?.message?.content || "No response from Perplexity",
        source: 'perplexity',
        success: true,
        citations: data.citations || [],
      };
    } catch (error) {
      console.error("Perplexity API error:", error);
      return {
        text: "",
        source: 'perplexity',
        success: false,
      };
    }
  }

  // Main AI query method with fallback
  static async query(prompt: string, preferGemini: boolean = true): Promise<AIResponse> {
    console.log(`[AI Service] Processing query with preference: ${preferGemini ? 'Gemini' : 'Perplexity'}`);

    // Check which APIs are available
    const [geminiAvailable, perplexityAvailable] = await Promise.all([
      this.isGeminiAvailable(),
      this.isPerplexityAvailable(),
    ]);

    console.log(`[AI Service] API availability - Gemini: ${geminiAvailable}, Perplexity: ${perplexityAvailable}`);

    // If both are unavailable
    if (!geminiAvailable && !perplexityAvailable) {
      return {
        text: "AI services are currently unavailable. Please try again later.",
        source: 'gemini',
        success: false,
      };
    }

    // Try primary service first based on preference
    const primaryService = preferGemini ? 'gemini' : 'perplexity';
    const fallbackService = preferGemini ? 'perplexity' : 'gemini';

    // Try primary service if available
    if ((primaryService === 'gemini' && geminiAvailable) || 
        (primaryService === 'perplexity' && perplexityAvailable)) {
      
      const result = primaryService === 'gemini' 
        ? await this.callGemini(prompt)
        : await this.callPerplexity(prompt);

      if (result.success) {
        console.log(`[AI Service] Successfully used ${primaryService}`);
        return result;
      }
    }

    // Fallback to secondary service if primary failed
    if ((fallbackService === 'gemini' && geminiAvailable) || 
        (fallbackService === 'perplexity' && perplexityAvailable)) {
      
      console.log(`[AI Service] Falling back to ${fallbackService}`);
      const result = fallbackService === 'gemini' 
        ? await this.callGemini(prompt)
        : await this.callPerplexity(prompt);

      return result;
    }

    // Final fallback
    return {
      text: "Unable to process your request. AI services are experiencing issues.",
      source: 'gemini',
      success: false,
    };
  }

  // Analyze sentiment using Gemini's structured output
  static async analyzeSentiment(text: string): Promise<{ rating: number; confidence: number; source: string }> {
    try {
      const systemPrompt = `You are a sentiment analysis expert. 
Analyze the sentiment of the text and provide a rating
from 1 to 5 stars and a confidence score between 0 and 1.
Respond with JSON in this format: 
{'rating': number, 'confidence': number}`;

      const response = await geminiAI.models.generateContent({
        model: "gemini-2.5-pro",
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: "application/json",
          responseSchema: {
            type: "object",
            properties: {
              rating: { type: "number" },
              confidence: { type: "number" },
            },
            required: ["rating", "confidence"],
          },
        },
        contents: [{ role: "user", parts: [{ text }] }],
      });

      const rawJson = response.text;
      
      if (rawJson) {
        const data = JSON.parse(rawJson);
        return {
          rating: data.rating,
          confidence: data.confidence,
          source: 'gemini'
        };
      } else {
        throw new Error("Empty response from model");
      }
    } catch (error) {
      console.error("Sentiment analysis error:", error);
      // Fallback to simple analysis
      return {
        rating: 3,
        confidence: 0.1,
        source: 'fallback'
      };
    }
  }

  // Summarize text using either service
  static async summarizeText(text: string): Promise<AIResponse> {
    const prompt = `Please summarize the following text concisely while maintaining key points:\n\n${text}`;
    return this.query(prompt, true); // Prefer Gemini for summarization
  }

  // Generate policy insights using AI
  static async generatePolicyInsights(policyTitle: string, policyDescription: string): Promise<AIResponse> {
    const prompt = `Analyze this policy and provide insights about its potential impact, benefits, and areas of concern:

Policy Title: ${policyTitle}
Policy Description: ${policyDescription}

Please provide:
1. Key benefits
2. Potential challenges
3. Target beneficiaries
4. Implementation considerations`;

    return this.query(prompt, false); // Prefer Perplexity for research-based insights
  }
}