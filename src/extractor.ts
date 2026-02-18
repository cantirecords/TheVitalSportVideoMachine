import puppeteer from 'puppeteer';
import * as cheerio from 'cheerio';

export interface ExtractedArticle {
    title: string;
    images: string[];
    content: string;
}

export async function extractArticleData(url: string): Promise<ExtractedArticle> {
    console.log(`Extracting data from: ${url}`);

    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

        await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

        // Safety sleep for lazy loading
        await new Promise(r => setTimeout(r, 2000));

        const html = await page.content();
        const $ = cheerio.load(html);

        // 1. Extract Title
        const title = $('meta[property="og:title"]').attr('content') ||
            $('meta[name="twitter:title"]').attr('content') ||
            $('h1').first().text().trim() ||
            "News Update";

        // 2. Extract Multiple Images (STRICT QUALITY FILTER)
        const imageSet = new Set<string>();

        // Helper: Check if an image URL looks like a real editorial photo
        const isHighQualityImage = (src: string): boolean => {
            const lower = src.toLowerCase();
            const garbage = [
                'pixel', 'clear.gif', 'icon', 'logo', 'avatar', 'tracking',
                '1x1', 'spacer', 'blank', 'placeholder', 'badge', 'emoji',
                'sprite', 'social', 'share', 'button', 'widget', 'thumb',
                'ad-', 'advert', 'promo-', 'sponsor', 'analytics',
                'facebook.com', 'twitter.com', 'google-analytics', 'doubleclick',
                'scoreboard', 'favicon', '.svg', 'data:image'
            ];
            if (garbage.some(g => lower.includes(g))) return false;
            // Must be a real image format
            if (!lower.match(/\.(jpg|jpeg|png|webp)/i) && !lower.includes('combiner/i') && !lower.includes('image/upload')) return false;
            // Skip tiny thumbnails (likely icons)
            if (lower.includes('50x50') || lower.includes('30x30') || lower.includes('100x') || lower.includes('_tiny')) return false;
            return true;
        };

        // Primary Images (Meta Tags — usually the hero image matching the article)
        const mainImage = $('meta[property="og:image"]').attr('content') ||
            $('meta[name="twitter:image"]').attr('content');
        if (mainImage && isHighQualityImage(mainImage)) imageSet.add(mainImage);

        // Secondary Images from article body (strict filtering)
        $('article img, main img, figure img, .article-body img, img[class*="article"]').each((i, el) => {
            const src = $(el).attr('src') || $(el).attr('data-src') || $(el).attr('data-original') || $(el).attr('srcset')?.split(' ')[0];
            if (src && src.startsWith('http') && isHighQualityImage(src)) {
                imageSet.add(src);
            }
            if (imageSet.size >= 5) return false;
        });

        const images = Array.from(imageSet);
        console.log(`🖼️ High-quality images found: ${images.length}`);

        // 3. Extract Content (Enhanced with broader selectors)
        let content = '';
        const contentSelectors = [
            '.RichTextStoryBody p',
            'div.Article p',
            'article p',
            'main p',
            'div[class*="article-body"] p',
            'div[class*="entry-content"] p',
            'div[class*="post-content"] p',
            'div[class*="story-body"] p',
            'section p',
            '.article-text p',
            '.entry p'
        ];

        $(contentSelectors.join(', ')).each((i, el) => {
            const text = $(el).text().trim();
            if (text.length > 20) {
                content += text + ' ';
            }
        });

        if (!content || content.length < 100) {
            // Fallback to searching for the largest block of text
            content = $('meta[property="og:description"]').attr('content') ||
                $('meta[name="description"]').attr('content') ||
                $('p').first().text().trim() ||
                "";
        }

        return {
            title: title.trim(),
            images,
            content: content.trim().substring(0, 3000) // Caps for AI context
        };
    } catch (error) {
        console.error(`Extraction error: ${error}`);
        return { title: "News Update", images: [], content: "" };
    } finally {
        await browser.close();
    }
}
