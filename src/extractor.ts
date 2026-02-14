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

        // 2. Extract Multiple Images
        const imageSet = new Set<string>();

        // Primary Images (Meta Tags)
        const mainImage = $('meta[property="og:image"]').attr('content') ||
            $('meta[name="twitter:image"]').attr('content');
        if (mainImage) imageSet.add(mainImage);

        // Secondary Images from article body
        $('article img, main img, figure img, .article-body img, img[class*="article"]').each((i, el) => {
            const src = $(el).attr('src') || $(el).attr('data-src') || $(el).attr('data-original') || $(el).attr('srcset')?.split(' ')[0];
            if (src && src.startsWith('http')) {
                const lowerSrc = src.toLowerCase();
                const isPoorQuality = lowerSrc.includes('pixel') ||
                    lowerSrc.includes('clear.gif') ||
                    lowerSrc.includes('icon') ||
                    lowerSrc.includes('logo') ||
                    lowerSrc.includes('avatar') ||
                    lowerSrc.includes('tracking') ||
                    lowerSrc.includes('1x1');

                if (!isPoorQuality) {
                    imageSet.add(src);
                }
            }
            if (imageSet.size >= 10) return false;
        });

        const images = Array.from(imageSet);

        // 3. Extract Content (Enhanced with broader selectors)
        let content = '';
        const contentSelectors = [
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
