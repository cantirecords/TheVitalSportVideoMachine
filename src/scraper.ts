import axios from 'axios';
import { XMLParser } from 'fast-xml-parser';

export interface Article {
  title: string;
  url: string;
  source: string;
  date?: string;
}

const FEEDS = [
  // US Sports (General)
  { name: 'ESPN News', url: 'https://www.espn.com/espn/rss/news' },
  { name: 'ESPN Soccer', url: 'https://www.espn.com/espn/rss/soccer/news' },
  { name: 'BBC Sport', url: 'https://feeds.bbci.co.uk/sport/rss.xml' },
  { name: 'Sky Sports', url: 'https://www.skysports.com/rss/12040' },

  // Spanish Sources (Real Madrid, Barcelona, La Liga)
  { name: 'Marca', url: 'https://e00-marca.uecdn.es/rss/futbol/primera-division.xml' },
  { name: 'AS (Spain)', url: 'https://as.com/rss/futbol/primera.xml' },
  { name: 'Sport (Barcelona)', url: 'https://www.sport.es/es/rss/barca/rss.xml' },

  // English Premier League Giants & General
  { name: 'The Athletic', url: 'https://theathletic.com/feeds/rss/' },
  { name: 'ESPN FC', url: 'https://www.espn.com/espn/rss/soccer/news' },

  // NBA, NFL, MLB, F1
  { name: 'ESPN NBA', url: 'https://www.espn.com/espn/rss/nba/news' },
  { name: 'ESPN NFL', url: 'https://www.espn.com/espn/rss/nfl/news' },
  { name: 'F1 News', url: 'https://www.formula1.com/content/fom-website/en/latest/all.xml' },
  { name: 'NFL.com', url: 'https://www.nfl.com/rss/rsslanding?searchString=home' },
  { name: 'MLB News', url: 'https://www.mlb.com/feeds/news/rss.xml' }
];

export async function scrapeNews(limit: number = 1): Promise<Article[]> {
  const allScrapedArticles: Article[] = [];

  for (const feed of FEEDS) {
    try {
      console.log(`Scraping Sports: ${feed.name}...`);
      const response = await axios.get(feed.url, { timeout: 10000 }); // 10 second timeout
      const parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: "@_"
      });
      const jsonObj = parser.parse(response.data);

      let entries = [];
      if (jsonObj.feed && jsonObj.feed.entry) {
        entries = Array.isArray(jsonObj.feed.entry) ? jsonObj.feed.entry : [jsonObj.feed.entry];
      } else if (jsonObj.rss && jsonObj.rss.channel && jsonObj.rss.channel.item) {
        entries = Array.isArray(jsonObj.rss.channel.item) ? jsonObj.rss.channel.item : [jsonObj.rss.channel.item];
      }

      for (const entry of entries) {
        const title = entry.title?.['#text'] || entry.title || 'No Title';
        const date = entry.pubDate || entry.published || entry.updated || '';
        let url = entry.link?.['@_href'] || entry.link || entry.id;
        if (typeof url !== 'string') {
          url = entry.link?.['@_href'] || entry.guid?.['#text'] || entry.guid || '';
        }

        allScrapedArticles.push({
          title: String(title),
          url: String(url),
          source: feed.name,
          date: String(date)
        });
      }
    } catch (e: any) {
      console.error(`Failed to scrape sports ${feed.name}:`, e.message);
    }
  }

  console.log(`Sports scraping finished. Found ${allScrapedArticles.length} total articles.`);

  // ===== STRICT 24-HOUR FRESHNESS FILTER =====
  const now = Date.now();
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;

  const freshArticles: Article[] = [];
  const undatedArticles: Article[] = [];

  for (const a of allScrapedArticles) {
    if (a.date) {
      const pubDate = new Date(a.date).getTime();
      if (!isNaN(pubDate) && (now - pubDate) <= ONE_DAY_MS) {
        freshArticles.push(a);
      }
    } else {
      // No date — keep as last resort
      undatedArticles.push(a);
    }
  }

  console.log(`📅 Fresh articles (last 24h): ${freshArticles.length}`);
  console.log(`❓ Undated articles (fallback): ${undatedArticles.length}`);

  // Use fresh articles first; fall back to undated only if nothing fresh exists
  const pool = freshArticles.length > 0 ? freshArticles : undatedArticles;

  if (pool.length === 0) {
    console.log('❌ No fresh articles found at all.');
    return [];
  }

  // Sort by date descending (newest first)
  pool.sort((a, b) => {
    const dateA = a.date ? new Date(a.date).getTime() : 0;
    const dateB = b.date ? new Date(b.date).getTime() : 0;
    return dateB - dateA;
  });

  // High-impact keyword boost (prioritize big stories)
  const impactKeywords = [
    'real madrid', 'madrid', 'barcelona', 'barça', 'el clasico', 'la liga',
    'messi', 'ronaldo', 'mbappe', 'vinicius', 'vini jr', 'bellingham', 'haaland', 'neymar',
    'lewandowski', 'yamal', 'salah', 'kane', 'wirtz', 'musiala',
    'lebron', 'curry', 'lakers', 'nba', 'jokic', 'doncic', 'wembanyama', 'giannis', 'durant',
    'mahomes', 'nfl', 'draft', 'super bowl', 'ohtani', 'dodgers', 'yankees', 'mlb',
    'f1', 'formula 1', 'verstappen', 'hamilton', 'ferrari', 'red bull', 'norris',
    'djokovic', 'alcaraz', 'sinner', 'tennis',
    'breaking', 'legend', 'record', 'viral', 'miracle', 'shocking', 'epic', 'historic'
  ];

  const highImpact = pool.filter(a =>
    impactKeywords.some(k => a.title.toLowerCase().includes(k))
  );

  const finalArticles = highImpact.length > 0 ? highImpact : pool;

  // Shuffle among top results for variety
  return finalArticles.sort(() => Math.random() - 0.5).slice(0, limit);
}
