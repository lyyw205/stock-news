import { GoogleGenerativeAI } from '@google/generative-ai';

let genAI: GoogleGenerativeAI | null = null;

export function getGeminiClient(): GoogleGenerativeAI {
  if (!genAI) {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is not set');
    }

    genAI = new GoogleGenerativeAI(apiKey);
  }

  return genAI;
}

export function getModel(modelName: string = 'gemini-2.0-flash') {
  const client = getGeminiClient();
  return client.getGenerativeModel({ model: modelName });
}

/**
 * Generate content (simplified without caching)
 * Note: Caching requires @google/generative-ai v0.2.0+
 * Current version doesn't support CachedContent API
 */
export async function generateContentWithCache(
  prompt: string,
  retries: number = 3
): Promise<string> {
  // For now, just use regular generateContent
  // TODO: Upgrade to @google/generative-ai v0.2.0+ for caching support
  return generateContent(prompt, retries);
}

export async function generateContent(
  prompt: string,
  retries: number = 3,
): Promise<string> {
  const model = getModel();

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const result = await model.generateContent(prompt);
      const response = result.response;
      const text = response.text();

      if (!text) {
        throw new Error('Empty response from Gemini API');
      }

      return text;
    } catch (error) {
      console.error(`Gemini API error (attempt ${attempt + 1}/${retries}):`, error);

      if (attempt === retries - 1) {
        throw error;
      }

      // Exponential backoff
      const delay = Math.pow(2, attempt) * 1000;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw new Error('Failed to generate content after retries');
}
