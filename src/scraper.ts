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

  // General Today News: Return all latest articles and shuffle for variety
  console.log(`Sports scraping finished. Found ${allScrapedArticles.length} total articles.`);

  // Expanded Variety Keywords: Filter for high-impact sports keywords
  const impactKeywords = [
    // Real Madrid & Barcelona
    'real madrid', 'madrid', 'barcelona', 'barça', 'el clasico', 'la liga',
    // Soccer Stars
    'messi', 'ronaldo', 'mbappe', 'vinicius', 'vini jr', 'bellingham', 'haaland', 'neymar',
    'lewandowski', 'yamal', 'salah', 'kane', 'wirtz', 'musiala',
    // NBA Stars
    'lebron', 'curry', 'lakers', 'nba', 'jokic', 'doncic', 'wembanyama', 'giannis', 'durant',
    // NFL & MLB
    'mahomes', 'nfl', 'draft', 'super bowl', 'ohtani', 'dodgers', 'yankees', 'mlb',
    // F1 & Variety
    'f1', 'formula 1', 'verstappen', 'hamilton', 'ferrari', 'red bull', 'norris',
    'djokovic', 'alcaraz', 'sinner', 'tennis',
    // General Impact
    'breaking', 'legend', 'record', 'viral', 'miracle', 'shocking', 'epic', 'historic'
  ];

  const highImpact = allScrapedArticles.filter(a =>
    impactKeywords.some(k => a.title.toLowerCase().includes(k))
  );

  const finalArticles = highImpact.length > 0 ? highImpact : allScrapedArticles;

  // Shuffle and pick the absolute latest
  return finalArticles.sort(() => Math.random() - 0.5).slice(0, limit);
}
