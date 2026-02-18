import { scrapeNews } from './scraper.js';
import { generateCardContent } from './rewriter.js';
import { extractArticleData } from './extractor.js';
import { renderStill, selectComposition } from '@remotion/renderer';
import { bundle } from '@remotion/bundler';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import axios from 'axios';
import { v2 as cloudinary } from 'cloudinary';
import { sendCardToWebhook } from './webhook.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config();

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME as string,
    api_key: process.env.CLOUDINARY_API_KEY as string,
    api_secret: process.env.CLOUDINARY_API_SECRET as string
});

async function main() {
    try {
        console.log('--- TVS STATIC CARD GENERATOR ---');

        // 1. Scrape News or use Manual URL
        let article: any;
        if (process.env.MANUAL_URL) {
            console.log(`Using Manual URL: ${process.env.MANUAL_URL}`);
            article = {
                url: process.env.MANUAL_URL,
                title: 'Manual Request Story',
                source: 'Manual'
            };
        } else {
            // 1. Scrape News
            const articles = await scrapeNews(100);
            console.log(`Scraper found ${articles.length} articles.`);
            if (articles.length === 0) {
                console.log("❌ ABORTING: No articles found. This is why the signal didn't send.");
                return;
            }

            // --- Topic Cooldown Logic ---
            const historyPath = path.join(process.cwd(), 'history.json');
            let history: { recentKeywords: string[] } = { recentKeywords: [] };
            if (fs.existsSync(historyPath)) {
                try {
                    const savedHistory = JSON.parse(fs.readFileSync(historyPath, 'utf8'));
                    if (savedHistory && Array.isArray(savedHistory.recentKeywords)) {
                        history = savedHistory;
                    }
                } catch (e) {
                    console.error('Failed to read history.json');
                }
            }

            // Filter out keywords in cooldown
            const freshArticles = articles.filter(a => {
                const titleLower = a.title.toLowerCase();
                return !history.recentKeywords.some((k: string) => titleLower.includes(k.toLowerCase()));
            });

            if (freshArticles.length === 0) {
                console.log('All recent news is in cooldown. Picking top anyway to stay live.');
                article = articles[0];
            } else {
                // Pick from top 5 fresh ones
                const topFresh = freshArticles.slice(0, 5);
                article = topFresh[Math.floor(Math.random() * topFresh.length)];
            }
        }


        if (!article) {
            console.error('❌ ERROR: Failed to select an article.');
            return;
        }
        console.log(`✅ Selected Article: ${article.title}`);
        console.log(`🔗 URL: ${article.url}`);

        // 2. Extract Data
        const detailedData = await extractArticleData(article.url);
        console.log('Extracted Data:', {
            title: detailedData.title,
            contentLength: detailedData.content.length,
            imageCount: detailedData.images.length
        });

        const publicDir = path.join(process.cwd(), 'public');
        const fileName = `card_bg_${Date.now()}.png`;
        const localImagePath = path.join(publicDir, fileName);

        const targetImageUrl = process.env.MANUAL_IMAGE_URL || (detailedData.images.length > 0 ? detailedData.images[0] : null);

        if (!targetImageUrl) {
            console.error('❌ ABORTING: No high-quality image found for this article. Skipping to maintain quality.');
            return;
        }

        // Block known garbage images
        const lowerImg = targetImageUrl.toLowerCase();
        const isGarbage = ['logo', 'placeholder', 'espn_red', 'default_avatar', 'icon', 'badge', 'sprite'].some(g => lowerImg.includes(g));
        if (isGarbage) {
            console.error(`❌ ABORTING: Image is a placeholder/logo, not editorial: ${targetImageUrl}`);
            return;
        }

        try {
            console.log(`📸 Downloading article image: ${targetImageUrl}`);
            const response = await axios({
                url: targetImageUrl as string,
                responseType: 'stream',
            });
            const writer = fs.createWriteStream(localImagePath);
            response.data.pipe(writer);
            await new Promise((resolve, reject) => {
                writer.on('finish', resolve);
                writer.on('error', reject);
            });
        } catch (err: any) {
            console.error(`❌ ABORTING: Could not download article image: ${err.message}`);
            return;
        }

        // 3. Generate Card Content (AI)
        const cardContent = await generateCardContent(detailedData.content, detailedData.title);
        console.log(`Generated Card Type: ${cardContent.type}`);
        console.log(`\n--- FACEBOOK POST PREVIEW ---\n${cardContent.facebookDescription}\n-----------------------------\n`);

        // 4. Render Image
        const entryPath = path.join(process.cwd(), 'remotion/index.ts');
        console.log('Bundling...');
        const bundleLocation = await bundle({ entryPoint: entryPath });

        console.log('Rendering Still Image...');
        const composition = await selectComposition({
            serveUrl: bundleLocation,
            id: 'NewsCard',
            inputProps: {
                title: cardContent.title,
                subHeadline: cardContent.subHeadline,
                image: fileName,
                category: cardContent.category,
                type: cardContent.type,
                quoteAuthor: cardContent.quoteAuthor,
                statValue: cardContent.statValue,
                statLabel: cardContent.statLabel
            }
        });

        const outputLocation = path.join(process.cwd(), 'out/card.png');
        await renderStill({
            composition,
            serveUrl: bundleLocation,
            output: outputLocation,
            inputProps: {
                title: cardContent.title,
                subHeadline: cardContent.subHeadline,
                image: fileName,
                category: cardContent.category,
                type: cardContent.type,
                quoteAuthor: cardContent.quoteAuthor,
                statValue: cardContent.statValue,
                statLabel: cardContent.statLabel
            }
        });

        console.log(`Card rendered at: ${outputLocation}`);

        // 5. Send signal to Webhook & Update History
        if (process.env.TEST_MODE === 'true') {
            console.log('--- TEST MODE ACTIVE: Skipping Webhook ---');
        } else {
            console.log(`🚀 Sending signal to: ${process.env.MAKE_CARD_WEBHOOK_URL ? 'URL FOUND' : '❌ SECRET MISSING'}`);
            const finalCardUrl = await sendCardToWebhook(outputLocation, {
                headline: cardContent.title,
                subHeadline: cardContent.facebookDescription || cardContent.subHeadline || '',
                category: cardContent.category
            });

            if (finalCardUrl) {
                // Update history to avoid duplicates
                const historyPath = path.join(process.cwd(), 'history.json');
                let history: { recentKeywords: string[] } = { recentKeywords: [] };
                if (fs.existsSync(historyPath)) {
                    history = JSON.parse(fs.readFileSync(historyPath, 'utf8'));
                }

                // Add first 2 words of title to cooldown
                const keywords = cardContent.title.split(' ').slice(0, 2);
                history.recentKeywords = [...keywords, ...history.recentKeywords].slice(0, 50);
                fs.writeFileSync(historyPath, JSON.stringify(history, null, 2));
                console.log('History updated with:', keywords);
            }
        }

        // Clean up temp image
        // fs.unlinkSync(localImagePath);

    } catch (error) {
        console.error('Card Generation Failed:', error);
    }
}

main();
