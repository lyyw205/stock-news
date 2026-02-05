import Parser from 'rss-parser';

export interface Article {
  title: string;
  link: string;
  pubDate: Date;
  description?: string;
}

const parser = new Parser();

export async function parseRSSFeed(rssContent: string): Promise<Article[]> {
  try {
    const feed = await parser.parseString(rssContent);

    if (!feed.items || feed.items.length === 0) {
      return [];
    }

    const articles: Article[] = feed.items.map((item) => {
      if (!item.title || !item.link || !item.pubDate) {
        throw new Error('RSS item missing required fields');
      }

      return {
        title: item.title,
        link: item.link,
        pubDate: new Date(item.pubDate),
        description: item.contentSnippet || item.content || '',
      };
    });

    return articles;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to parse RSS feed: ${error.message}`);
    }
    throw new Error('Failed to parse RSS feed: Unknown error');
  }
}

export async function fetchRSSFeed(url: string): Promise<Article[]> {
  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const rssContent = await response.text();
    return parseRSSFeed(rssContent);
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to fetch RSS feed from ${url}: ${error.message}`);
    }
    throw new Error(`Failed to fetch RSS feed from ${url}: Unknown error`);
  }
}
