/**
 * Email templates for stock news notifications
 */

export interface NewsItem {
  ticker: string;
  title: string;
  summary: string;
  url: string;
  pubDate: Date;
}

export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

/**
 * Generate email template for a single news notification
 */
export function generateSingleNewsEmail(news: NewsItem): EmailTemplate {
  const subject = `[${news.ticker}] ${news.title}`;

  const html = `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #f8f9fa; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
    <div style="background-color: #0066cc; color: white; display: inline-block; padding: 4px 12px; border-radius: 4px; font-weight: bold; font-size: 14px; margin-bottom: 12px;">
      ${news.ticker}
    </div>
    <h2 style="margin: 0 0 12px 0; font-size: 20px; color: #1a1a1a;">
      ${news.title}
    </h2>
    <p style="color: #666; font-size: 14px; margin: 0 0 16px 0;">
      ${formatDate(news.pubDate)}
    </p>
  </div>

  <div style="background-color: white; border: 1px solid #e0e0e0; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
    <h3 style="margin: 0 0 12px 0; font-size: 16px; color: #333;">📰 요약</h3>
    <p style="margin: 0; font-size: 15px; line-height: 1.7; color: #444;">
      ${news.summary}
    </p>
  </div>

  <div style="text-align: center; margin: 24px 0;">
    <a href="${news.url}" style="display: inline-block; background-color: #0066cc; color: white; text-decoration: none; padding: 12px 32px; border-radius: 6px; font-weight: 500; font-size: 15px;">
      전체 기사 읽기
    </a>
  </div>

  <div style="border-top: 1px solid #e0e0e0; padding-top: 16px; margin-top: 24px; text-align: center; color: #999; font-size: 12px;">
    <p style="margin: 0 0 8px 0;">주식 뉴스 요약 서비스</p>
    <p style="margin: 0;">이 알림은 구독하신 종목에 대한 새로운 뉴스가 있을 때 전송됩니다.</p>
  </div>
</body>
</html>
  `.trim();

  const text = `
[${news.ticker}] ${news.title}

${formatDate(news.pubDate)}

📰 요약:
${news.summary}

전체 기사 읽기: ${news.url}

---
주식 뉴스 요약 서비스
이 알림은 구독하신 종목에 대한 새로운 뉴스가 있을 때 전송됩니다.
  `.trim();

  return { subject, html, text };
}

/**
 * Generate email template for digest (multiple news items)
 */
export function generateDigestEmail(
  ticker: string,
  newsList: NewsItem[],
): EmailTemplate {
  const count = newsList.length;
  const subject = `[${ticker}] 새로운 뉴스 ${count}건`;

  const newsItemsHtml = newsList
    .map(
      (news) => `
    <div style="background-color: white; border: 1px solid #e0e0e0; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
      <h3 style="margin: 0 0 8px 0; font-size: 16px; color: #1a1a1a;">
        ${news.title}
      </h3>
      <p style="color: #666; font-size: 13px; margin: 0 0 12px 0;">
        ${formatDate(news.pubDate)}
      </p>
      <p style="margin: 0 0 12px 0; font-size: 14px; line-height: 1.6; color: #444;">
        ${news.summary}
      </p>
      <a href="${news.url}" style="color: #0066cc; text-decoration: none; font-size: 14px; font-weight: 500;">
        전체 기사 읽기 →
      </a>
    </div>
  `,
    )
    .join('');

  const html = `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
  <div style="background-color: #0066cc; color: white; border-radius: 8px; padding: 24px; margin-bottom: 24px; text-align: center;">
    <div style="font-size: 18px; font-weight: bold; margin-bottom: 8px;">
      ${ticker}
    </div>
    <h1 style="margin: 0; font-size: 24px;">
      새로운 뉴스 ${count}건
    </h1>
  </div>

  ${newsItemsHtml}

  <div style="border-top: 1px solid #e0e0e0; padding-top: 16px; margin-top: 24px; text-align: center; color: #999; font-size: 12px; background-color: white; border-radius: 8px; padding: 20px;">
    <p style="margin: 0 0 8px 0;">주식 뉴스 요약 서비스</p>
    <p style="margin: 0;">이 다이제스트는 구독하신 종목의 새로운 뉴스를 모아서 전송됩니다.</p>
  </div>
</body>
</html>
  `.trim();

  const newsItemsText = newsList
    .map(
      (news, index) => `
${index + 1}. ${news.title}
   ${formatDate(news.pubDate)}

   ${news.summary}

   전체 기사: ${news.url}
  `,
    )
    .join('\n---\n');

  const text = `
[${ticker}] 새로운 뉴스 ${count}건

${newsItemsText}

---
주식 뉴스 요약 서비스
이 다이제스트는 구독하신 종목의 새로운 뉴스를 모아서 전송됩니다.
  `.trim();

  return { subject, html, text };
}

/**
 * Generate email template for multiple tickers digest
 */
export function generateMultiTickerDigestEmail(
  tickerNews: Record<string, NewsItem[]>,
): EmailTemplate {
  const tickers = Object.keys(tickerNews);
  const totalCount = Object.values(tickerNews).reduce(
    (sum, news) => sum + news.length,
    0,
  );
  const subject = `새로운 주식 뉴스 ${totalCount}건 (${tickers.length}개 종목)`;

  const tickerSectionsHtml = tickers
    .map((ticker) => {
      const newsList = tickerNews[ticker];
      const newsItemsHtml = newsList
        .map(
          (news) => `
        <div style="border-left: 3px solid #0066cc; padding-left: 12px; margin-bottom: 16px;">
          <h4 style="margin: 0 0 4px 0; font-size: 15px; color: #1a1a1a;">
            ${news.title}
          </h4>
          <p style="color: #666; font-size: 12px; margin: 0 0 8px 0;">
            ${formatDate(news.pubDate)}
          </p>
          <p style="margin: 0 0 8px 0; font-size: 14px; line-height: 1.6; color: #444;">
            ${news.summary}
          </p>
          <a href="${news.url}" style="color: #0066cc; text-decoration: none; font-size: 13px; font-weight: 500;">
            전체 기사 읽기 →
          </a>
        </div>
      `,
        )
        .join('');

      return `
      <div style="background-color: white; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
        <div style="background-color: #0066cc; color: white; display: inline-block; padding: 6px 14px; border-radius: 4px; font-weight: bold; font-size: 15px; margin-bottom: 16px;">
          ${ticker} (${newsList.length}건)
        </div>
        ${newsItemsHtml}
      </div>
    `;
    })
    .join('');

  const html = `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
  <div style="background-color: #0066cc; color: white; border-radius: 8px; padding: 24px; margin-bottom: 24px; text-align: center;">
    <h1 style="margin: 0 0 8px 0; font-size: 24px;">
      📊 주식 뉴스 다이제스트
    </h1>
    <p style="margin: 0; font-size: 16px; opacity: 0.9;">
      ${totalCount}건의 새로운 뉴스 (${tickers.length}개 종목)
    </p>
  </div>

  ${tickerSectionsHtml}

  <div style="border-top: 1px solid #e0e0e0; padding-top: 16px; margin-top: 24px; text-align: center; color: #999; font-size: 12px; background-color: white; border-radius: 8px; padding: 20px;">
    <p style="margin: 0 0 8px 0;">주식 뉴스 요약 서비스</p>
    <p style="margin: 0;">이 다이제스트는 구독하신 모든 종목의 새로운 뉴스를 모아서 전송됩니다.</p>
  </div>
</body>
</html>
  `.trim();

  const tickerSectionsText = tickers
    .map((ticker) => {
      const newsList = tickerNews[ticker];
      const newsItemsText = newsList
        .map(
          (news, index) => `
  ${index + 1}. ${news.title}
     ${formatDate(news.pubDate)}
     ${news.summary}
     링크: ${news.url}
      `,
        )
        .join('\n');

      return `
[${ticker}] ${newsList.length}건
${newsItemsText}
    `;
    })
    .join('\n---\n');

  const text = `
📊 주식 뉴스 다이제스트
${totalCount}건의 새로운 뉴스 (${tickers.length}개 종목)

${tickerSectionsText}

---
주식 뉴스 요약 서비스
이 다이제스트는 구독하신 모든 종목의 새로운 뉴스를 모아서 전송됩니다.
  `.trim();

  return { subject, html, text };
}

/**
 * Format date in Korean format
 */
function formatDate(date: Date): string {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');

  return `${year}년 ${month}월 ${day}일 ${hours}:${minutes}`;
}
