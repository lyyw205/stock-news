/**
 * Notification dispatcher - coordinates sending email and push notifications
 */

import { createServerSupabaseClient } from '../auth/supabase-server';
import { sendEmail, sendBatchEmails } from './email';
import { sendPushNotification, createNewsNotificationPayload } from './push';
import {
  generateSingleNewsEmail,
  generateMultiTickerDigestEmail,
  type NewsItem,
} from './templates';

interface User {
  id: string;
  email: string;
  fcm_token: string | null;
}

interface ArticleWithSummary {
  id: string;
  url: string;
  title: string;
  description: string | null;
  pub_date: string;
  ticker: string;
  summary_text: string;
}

export interface DispatchResult {
  totalUsers: number;
  emailsSent: number;
  emailsFailed: number;
  pushSent: number;
  pushFailed: number;
  errors: string[];
}

/**
 * Main dispatcher function - sends notifications for new articles
 */
export async function dispatchNotifications(
  options?: {
    sinceMinutes?: number;
    batchSize?: number;
  },
): Promise<DispatchResult> {
  const { sinceMinutes = 30, batchSize = 50 } = options || {};

  const result: DispatchResult = {
    totalUsers: 0,
    emailsSent: 0,
    emailsFailed: 0,
    pushSent: 0,
    pushFailed: 0,
    errors: [],
  };

  try {
    const supabase = createServerSupabaseClient();

    // 1. Find articles with summaries that haven't been notified yet
    const cutoffTime = new Date(Date.now() - sinceMinutes * 60 * 1000).toISOString();

    const { data: articles, error: articlesError } = await supabase
      .from('news_articles')
      .select(
        `
        id,
        url,
        title,
        description,
        pub_date,
        ticker,
        summaries!inner (
          summary_text
        )
      `,
      )
      .gte('summaries.created_at', cutoffTime)
      .eq('summaries.is_useful', true)
      .not('ticker', 'is', null)
      .limit(batchSize);

    if (articlesError) {
      throw new Error(`Failed to fetch articles: ${articlesError.message}`);
    }

    if (!articles || articles.length === 0) {
      console.log('No new articles to notify');
      return result;
    }

    console.log(`Found ${articles.length} articles to notify`);

    // 2. Get unique tickers from articles
    const tickers = [...new Set(articles.map((a) => a.ticker).filter(Boolean))];

    // 3. Find users subscribed to these tickers
    const { data: subscriptions, error: subscriptionsError } = await supabase
      .from('subscriptions')
      .select(
        `
        user_id,
        ticker,
        users!inner (
          id,
          email,
          fcm_token
        )
      `,
      )
      .in('ticker', tickers);

    if (subscriptionsError) {
      throw new Error(`Failed to fetch subscriptions: ${subscriptionsError.message}`);
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log('No users subscribed to these tickers');
      return result;
    }

    // 4. Group articles by user
    const userArticlesMap = new Map<string, ArticleWithSummary[]>();
    const usersMap = new Map<string, User>();

    for (const sub of subscriptions) {
      const user = (sub as any).users;
      const ticker = sub.ticker;

      if (!usersMap.has(user.id)) {
        usersMap.set(user.id, user);
      }

      const userArticles = articles.filter(
        (article) =>
          article.ticker === ticker &&
          !(article as any).summaries?.[0]?.summary_text === undefined,
      );

      for (const article of userArticles) {
        const articleWithSummary: ArticleWithSummary = {
          id: article.id,
          url: article.url,
          title: article.title,
          description: article.description,
          pub_date: article.pub_date,
          ticker: article.ticker!,
          summary_text: (article as any).summaries[0].summary_text,
        };

        if (!userArticlesMap.has(user.id)) {
          userArticlesMap.set(user.id, []);
        }

        // Avoid duplicates
        const existing = userArticlesMap.get(user.id)!;
        if (!existing.find((a) => a.id === articleWithSummary.id)) {
          existing.push(articleWithSummary);
        }
      }
    }

    result.totalUsers = usersMap.size;
    console.log(`Notifying ${result.totalUsers} users`);

    // 5. Send notifications to each user
    for (const [userId, articles] of userArticlesMap) {
      const user = usersMap.get(userId);
      if (!user) continue;

      try {
        // Group articles by ticker for this user
        const tickerNewsMap: Record<string, NewsItem[]> = {};

        for (const article of articles) {
          const newsItem: NewsItem = {
            ticker: article.ticker,
            title: article.title,
            summary: article.summary_text,
            url: article.url,
            pubDate: new Date(article.pub_date),
          };

          if (!tickerNewsMap[article.ticker]) {
            tickerNewsMap[article.ticker] = [];
          }
          tickerNewsMap[article.ticker].push(newsItem);
        }

        // Send email notification
        try {
          const emailTemplate = generateMultiTickerDigestEmail(tickerNewsMap);
          const emailResult = await sendEmail({
            to: user.email,
            template: emailTemplate,
          });

          if (emailResult.success) {
            result.emailsSent++;
          } else {
            result.emailsFailed++;
            result.errors.push(`Email failed for ${user.email}: ${emailResult.error}`);
          }

          // Log email notification
          for (const article of articles) {
            await logNotification(supabase, {
              userId: user.id,
              articleId: article.id,
              type: 'email',
              status: emailResult.success ? 'sent' : 'failed',
              error: emailResult.error,
            });
          }
        } catch (error) {
          result.emailsFailed++;
          result.errors.push(
            `Email exception for ${user.email}: ${error instanceof Error ? error.message : 'Unknown error'}`,
          );
        }

        // Send push notification (if FCM token exists)
        if (user.fcm_token) {
          try {
            // Send a summary push for all articles
            const totalArticles = articles.length;
            const pushResult = await sendPushNotification({
              tokens: user.fcm_token,
              payload: {
                title: '📰 새로운 주식 뉴스',
                body: `${totalArticles}건의 새로운 뉴스가 도착했습니다.`,
                data: {
                  type: 'digest',
                  count: totalArticles.toString(),
                },
              },
            });

            if (pushResult.success) {
              result.pushSent++;
            } else {
              result.pushFailed++;
              result.errors.push(
                `Push failed for ${user.email}: ${pushResult.errors?.join(', ')}`,
              );
            }

            // Log push notification
            for (const article of articles) {
              await logNotification(supabase, {
                userId: user.id,
                articleId: article.id,
                type: 'push',
                status: pushResult.success ? 'sent' : 'failed',
                error: pushResult.errors?.join(', '),
              });
            }
          } catch (error) {
            result.pushFailed++;
            result.errors.push(
              `Push exception for ${user.email}: ${error instanceof Error ? error.message : 'Unknown error'}`,
            );
          }
        }
      } catch (error) {
        result.errors.push(
          `Failed to notify user ${userId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }
    }

    console.log('Notification dispatch complete:', result);
    return result;
  } catch (error) {
    console.error('Dispatcher error:', error);
    result.errors.push(
      `Dispatcher error: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
    return result;
  }
}

/**
 * Log notification to database
 */
async function logNotification(
  supabase: ReturnType<typeof createServerSupabaseClient>,
  options: {
    userId: string;
    articleId: string;
    type: 'email' | 'push';
    status: 'sent' | 'failed' | 'pending';
    error?: string;
  },
): Promise<void> {
  const { userId, articleId, type, status, error } = options;

  try {
    const { error: insertError } = await supabase.from('notification_log').insert({
      user_id: userId,
      article_id: articleId,
      notification_type: type,
      status,
      error_message: error || null,
      sent_at: status === 'sent' ? new Date().toISOString() : null,
    });

    if (insertError) {
      console.error('Failed to log notification:', insertError);
    }
  } catch (error) {
    console.error('Exception logging notification:', error);
  }
}

/**
 * Send immediate notification for a single article to subscribers
 */
export async function sendImmediateNotification(
  articleId: string,
): Promise<DispatchResult> {
  const result: DispatchResult = {
    totalUsers: 0,
    emailsSent: 0,
    emailsFailed: 0,
    pushSent: 0,
    pushFailed: 0,
    errors: [],
  };

  try {
    const supabase = createServerSupabaseClient();

    // Fetch article with summary
    const { data: article, error: articleError } = await supabase
      .from('news_articles')
      .select(
        `
        id,
        url,
        title,
        description,
        pub_date,
        ticker,
        summaries!inner (
          summary_text,
          is_useful
        )
      `,
      )
      .eq('id', articleId)
      .eq('summaries.is_useful', true)
      .single();

    if (articleError || !article) {
      throw new Error(`Article not found or not useful: ${articleError?.message}`);
    }

    const ticker = article.ticker;
    if (!ticker) {
      throw new Error('Article has no ticker');
    }

    // Find subscribers
    const { data: subscriptions, error: subscriptionsError } = await supabase
      .from('subscriptions')
      .select(
        `
        user_id,
        users!inner (
          id,
          email,
          fcm_token
        )
      `,
      )
      .eq('ticker', ticker);

    if (subscriptionsError) {
      throw new Error(`Failed to fetch subscriptions: ${subscriptionsError.message}`);
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log('No subscribers for this ticker');
      return result;
    }

    result.totalUsers = subscriptions.length;

    const newsItem: NewsItem = {
      ticker,
      title: article.title,
      summary: (article as any).summaries[0].summary_text,
      url: article.url,
      pubDate: new Date(article.pub_date),
    };

    // Send to each subscriber
    for (const sub of subscriptions) {
      const user = (sub as any).users;

      // Send email
      try {
        const emailTemplate = generateSingleNewsEmail(newsItem);
        const emailResult = await sendEmail({
          to: user.email,
          template: emailTemplate,
        });

        if (emailResult.success) {
          result.emailsSent++;
        } else {
          result.emailsFailed++;
        }

        await logNotification(supabase, {
          userId: user.id,
          articleId: article.id,
          type: 'email',
          status: emailResult.success ? 'sent' : 'failed',
          error: emailResult.error,
        });
      } catch (error) {
        result.emailsFailed++;
        result.errors.push(`Email error: ${error}`);
      }

      // Send push
      if (user.fcm_token) {
        try {
          const pushResult = await sendPushNotification({
            tokens: user.fcm_token,
            payload: createNewsNotificationPayload(newsItem),
          });

          if (pushResult.success) {
            result.pushSent++;
          } else {
            result.pushFailed++;
          }

          await logNotification(supabase, {
            userId: user.id,
            articleId: article.id,
            type: 'push',
            status: pushResult.success ? 'sent' : 'failed',
            error: pushResult.errors?.join(', '),
          });
        } catch (error) {
          result.pushFailed++;
          result.errors.push(`Push error: ${error}`);
        }
      }
    }

    return result;
  } catch (error) {
    console.error('Immediate notification error:', error);
    result.errors.push(`Error: ${error}`);
    return result;
  }
}
