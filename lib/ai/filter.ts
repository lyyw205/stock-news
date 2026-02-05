import { generateContent } from './gemini';
import { formatFilterPrompt } from './prompts';

export interface FilterResult {
  isUseful: boolean;
  confidence: number;
  reasoning: string;
}

export async function filterNews(
  title: string,
  description: string,
): Promise<FilterResult> {
  try {
    const prompt = formatFilterPrompt(title, description);
    const response = await generateContent(prompt);

    // Parse JSON response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('Failed to parse JSON from response:', response);
      return {
        isUseful: false,
        confidence: 0.5,
        reasoning: 'Failed to parse AI response',
      };
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return {
      isUseful: Boolean(parsed.isUseful),
      confidence: Math.max(0, Math.min(1, Number(parsed.confidence) || 0.5)),
      reasoning: String(parsed.reasoning || 'No reasoning provided'),
    };
  } catch (error) {
    console.error('Error filtering news:', error);

    // Return conservative default on error
    return {
      isUseful: false,
      confidence: 0.5,
      reasoning: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
