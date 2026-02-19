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
import { loadHistory, saveHistory, isUrlAlreadyPosted, isTitleDuplicate, addPostedUrl, trackCloudinaryAsset, cleanupOldCloudinaryAssets } from './historyManager.js';
import { findPlayerImage } from './playerLibrary.js';

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

        // ===== STEP 0: Load shared history & run Cloudinary cleanup =====
        const history = loadHistory();
        console.log(`📋 History: ${history.postedUrls.length} posted URLs, ${history.cloudinaryAssets.length} tracked assets`);
        await cleanupOldCloudinaryAssets(history);
        saveHistory(history); // Persist cleanup immediately

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
            const articles = await scrapeNews(100);
            console.log(`Scraper found ${articles.length} articles.`);
            if (articles.length === 0) {
                console.log("❌ ABORTING: No articles found. This is why the signal didn't send.");
                return;
            }

            // ===== URL & TITLE DEDUP: Filter out already-posted content =====
            const unpostedArticles = articles.filter(a => {
                const isUrlPosted = isUrlAlreadyPosted(history, a.url);
                const isStoryPosted = isTitleDuplicate(history, a.title);
                return !isUrlPosted && !isStoryPosted;
            });
            console.log(`🔍 After dedup: ${unpostedArticles.length} new stories (${articles.length - unpostedArticles.length} blocked duplicates)`);

            if (unpostedArticles.length === 0) {
                console.log("🛑 ABORTING: All scraped news articles or story content have already been posted.");
                return;
            }

            const pool = unpostedArticles;

            // Keyword cooldown filter
            const freshArticles = pool.filter(a => {
                const titleLower = a.title.toLowerCase();
                return !history.recentKeywords.some((k: string) => titleLower.includes(k.toLowerCase()));
            });

            if (freshArticles.length === 0) {
                console.log("🛑 ABORTING: All new articles are in keyword cooldown. Skipping to avoid repetitive topics.");
                return;
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

        let targetImageUrl = process.env.MANUAL_IMAGE_URL || (detailedData.images.length > 0 ? detailedData.images[0] : null);

        // ===== PLAYER LIBRARY FALLBACK =====
        if (!targetImageUrl) {
            const playerMatch = findPlayerImage(detailedData.title || article.title);
            if (playerMatch) {
                console.log(`📚 Using Player Library fallback: ${playerMatch.name}`);
                targetImageUrl = playerMatch.imageUrl;
            }
        }

        if (!targetImageUrl) {
            console.error('❌ ABORTING: No high-quality image found for this article. Skipping to maintain quality.');
            return;
        }

        // Block known garbage images
        const lowerImg = targetImageUrl.toLowerCase();
        const isGarbage = ['logo', 'placeholder', 'espn_red', 'default_avatar', 'icon', 'badge', 'sprite'].some(g => lowerImg.includes(g));
        if (isGarbage) {
            // Try player library as last resort
            const playerMatch = findPlayerImage(detailedData.title || article.title);
            if (playerMatch) {
                console.log(`📚 Garbage image detected, using Player Library: ${playerMatch.name}`);
                targetImageUrl = playerMatch.imageUrl;
            } else {
                console.error(`❌ ABORTING: Image is a placeholder/logo, not editorial: ${targetImageUrl}`);
                return;
            }
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
            const result = await sendCardToWebhook(outputLocation, {
                headline: cardContent.title,
                subHeadline: cardContent.facebookDescription || cardContent.subHeadline || '',
                category: cardContent.category
            });

            if (result) {
                // ===== TRACK URL & TITLE (Anti-Duplicate) =====
                addPostedUrl(history, article.url, article.title);

                // ===== TRACK CLOUDINARY ASSET (For Cleanup) =====
                trackCloudinaryAsset(history, result.publicId, 'image');

                // Add first 2 words of title to keyword cooldown
                const keywords = cardContent.title.split(' ').slice(0, 2);
                history.recentKeywords = [...keywords, ...history.recentKeywords].slice(0, 50);

                // Save all changes to shared history
                saveHistory(history);
                console.log('📝 History updated: URL tracked, asset tracked, keywords:', keywords);
            }
        }

        // Clean up local temp image
        try { fs.unlinkSync(localImagePath); } catch { }

    } catch (error) {
        console.error('Card Generation Failed:', error);
    }
}

main();
