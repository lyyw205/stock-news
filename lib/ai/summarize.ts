import { generateContent } from './gemini';
import { formatSummarizePrompt } from './prompts';

export interface SummaryResult {
  summary: string;
}

export async function summarizeNews(
  title: string,
  description: string,
): Promise<SummaryResult> {
  try {
    const prompt = formatSummarizePrompt(title, description);
    const summary = await generateContent(prompt);

    // Clean up the summary
    const cleaned = summary
      .trim()
      .replace(/^["']|["']$/g, '') // Remove quotes
      .replace(/\n+/g, ' ') // Replace newlines with spaces
      .trim();

    if (cleaned.length === 0) {
      throw new Error('Empty summary generated');
    }

    return { summary: cleaned };
  } catch (error) {
    console.error('Error summarizing news:', error);

    // Fallback: return first part of description
    const fallback = description
      ? description.substring(0, 150) + '...'
      : title.substring(0, 100);

    return {
      summary: fallback,
    };
  }
}
