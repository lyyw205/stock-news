export function extractTicker(text: string): string | null {
  if (!text || text.trim().length === 0) {
    return null;
  }

  // Pattern 1: 종목명(XXXXXX) format
  const parenthesesPattern = /\((\d{6})\)/;
  const parenthesesMatch = text.match(parenthesesPattern);
  if (parenthesesMatch) {
    return parenthesesMatch[1];
  }

  // Pattern 2: 종목코드: XXXXXX format
  const colonPattern = /종목코드:\s*(\d{6})/;
  const colonMatch = text.match(colonPattern);
  if (colonMatch) {
    return colonMatch[1];
  }

  // Pattern 3: [종목] XXXXXX format
  const bracketPattern = /\[종목\]\s*(\d{6})/;
  const bracketMatch = text.match(bracketPattern);
  if (bracketMatch) {
    return bracketMatch[1];
  }

  // Pattern 4: Standalone 6-digit number (but not part of larger numbers)
  // More strict - must be preceded/followed by space or special char
  const standalonePattern = /(?:^|[^\d])(\d{6})(?:[^\d]|$)/;
  const standaloneMatch = text.match(standalonePattern);
  if (standaloneMatch) {
    return standaloneMatch[1];
  }

  return null;
}
