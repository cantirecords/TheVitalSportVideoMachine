import { scrapeNews } from './scraper.js';
import { generateScript } from './rewriter.js';
import { extractArticleData } from './extractor.js';
import { renderMedia, selectComposition } from '@remotion/renderer';
import { bundle } from '@remotion/bundler';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import axios from 'axios';
import { detectSubjectFocus, type FocusPoint } from './vision.js';
import { sendToWebhook } from './webhook.js';
import { loadHistory, saveHistory, isUrlAlreadyPosted, addPostedUrl, trackCloudinaryAsset, cleanupOldCloudinaryAssets } from './historyManager.js';
import { findPlayerImage } from './playerLibrary.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config();

async function main() {
    if (!process.env.GROQ_API_KEY) {
        console.error('Error: GROQ_API_KEY is not set in .env file');
        process.exit(1);
    }

    try {
        console.log('--- TVS AI VIDEO MACHINE (V1 SPORTS) ---');

        // ===== STEP 0: Load shared history & run Cloudinary cleanup =====
        const history = loadHistory();
        console.log(`📋 History: ${history.postedUrls.length} posted URLs, ${history.cloudinaryAssets.length} tracked assets`);
        await cleanupOldCloudinaryAssets(history);
        saveHistory(history); // Persist cleanup immediately

        let article: any;
        if (process.env.MANUAL_URL) {
            console.log(`Using manual URL from ENV: ${process.env.MANUAL_URL}`);
            article = {
                url: process.env.MANUAL_URL,
                title: 'Directed Request Story',
                source: 'Manual Override'
            };
        } else {
            // 1. Scrape News
            const articles = await scrapeNews(100);
            if (articles.length === 0) {
                console.log('No articles found.');
                return;
            }

            // ===== URL DEDUP: Filter out already-posted URLs =====
            const unpostedArticles = articles.filter(a => !isUrlAlreadyPosted(history, a.url));
            console.log(`🔍 After URL dedup: ${unpostedArticles.length} new articles (${articles.length - unpostedArticles.length} already posted)`);

            if (unpostedArticles.length === 0) {
                console.log("🛑 ABORTING: All scraped news articles have already been posted. No new content to generate.");
                return;
            }

            const pool = unpostedArticles;

            console.log('Recent Keywords (Cooldown):', history.recentKeywords);

            // Bucketing Articles (existing logic preserved)
            const buckets: Record<string, any[]> = {
                soccer: [],
                nba: [],
                variety: [] // F1, NFL, MLB, Tennis, etc.
            };

            pool.forEach(a => {
                const titleLower = a.title.toLowerCase();

                // Skip articles containing keywords from recent history
                const isCooldown = history.recentKeywords.some((k: string) => titleLower.includes(k.toLowerCase()));
                if (isCooldown) return;

                const isSoccer = ['champions league', 'premier league', 'laliga', 'serie a', 'bundesliga',
                    'madrid', 'barça', 'barcelona', 'atletico', 'manchester', 'liverpool', 'arsenal', 'chelsea',
                    'haaland', 'mbappé', 'bellingham', 'yamal', 'vinícius', 'salah', 'kane', 'lewandowski',
                    'psg', 'bayern', 'leverkusen', 'dortmund', 'inter milan', 'juventus', 'milan'].some(key => titleLower.includes(key));

                const isNBA = ['nba', 'lebron', 'curry', 'lakers', 'celtics', 'warriors', 'mavericks', 'nuggets',
                    'jokic', 'doncic', 'antetokounmpo', 'giannis', 'wembanyama', 'suns', 'heat'].some(key => titleLower.includes(key));

                const isVariety = ['f1', 'formula 1', 'verstappen', 'hamilton', 'ferrari', 'red bull',
                    'super bowl', 'mahomes', 'nfl', 'draft',
                    'ohtani', 'dodgers', 'yankees', 'mlb',
                    'alcaraz', 'djokovic', 'sinner', 'tennis',
                    'olympic', 'winter games', 'gold medal'].some(key => titleLower.includes(key));

                if (isSoccer && buckets.soccer) buckets.soccer.push(a);
                if (isNBA && buckets.nba) buckets.nba.push(a);
                if (isVariety && buckets.variety) buckets.variety.push(a);
            });

            // Selection Logic
            const availableBuckets = Object.entries(buckets).filter(([_, list]) => list && list.length > 0);
            if (availableBuckets.length === 0) {
                console.log("🛑 ABORTING: All priority articles are in cooldown or already posted. Skipping to avoid duplicate content.");
                return;
            } else {
                const randomBucketEntry = availableBuckets[Math.floor(Math.random() * availableBuckets.length)];
                if (randomBucketEntry) {
                    const bucketName = randomBucketEntry[0];
                    const bucketArticles = randomBucketEntry[1];
                    console.log(`Selected Bucket: ${bucketName} (${bucketArticles.length} candidates)`);
                    article = bucketArticles[Math.floor(Math.random() * bucketArticles.length)];
                } else {
                    console.log("🛑 ABORTING: Empty bucket selected. Skipping.");
                    return;
                }
            }

            // Track keywords (existing logic preserved)
            const keywordsToTrack = ['Barcelona', 'Barça', 'Madrid', 'Messi', 'Ronaldo', 'Mbappé', 'LeBron', 'Curry', 'Mahomes', 'Ohtani', 'Verstappen', 'Hamilton'];
            const foundKeywords = keywordsToTrack.filter(k => article.title.toLowerCase().includes(k.toLowerCase()));

            if (foundKeywords.length > 0) {
                history.recentKeywords = [...new Set([...foundKeywords, ...history.recentKeywords])].slice(0, 10);
                console.log('Updated History with:', foundKeywords);
            }
        }

        if (!article) {
            console.error('No suitable article found.');
            return;
        }

        console.log(`Using article from ${article.source}: ${article.title}`);

        // 2. Extract detailed data
        const detailedData = await extractArticleData(article.url);
        console.log(`Extracted Content Length: ${detailedData.content?.length || 0}`);
        console.log(`Extracted Images: ${detailedData.images?.length || 0}`);
        if (!detailedData.content || detailedData.content.length < 50) {
            console.warn("Warning: Low content extracted, using article title as context.");
        }

        const publicDir = path.join(process.cwd(), 'public');
        if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });

        // Download ONLY the primary background image (background_0.png)
        const downloadedImages: string[] = [];
        let imageUrl: string | null = detailedData.images[0] || null;
        const fileName = `background_0.png`;

        // ===== PLAYER LIBRARY FALLBACK =====
        if (!imageUrl) {
            const playerMatch = findPlayerImage(detailedData.title || article.title);
            if (playerMatch) {
                console.log(`📚 Using Player Library fallback: ${playerMatch.name}`);
                imageUrl = playerMatch.imageUrl;
            }
        }

        if (!imageUrl) {
            console.error('❌ ABORTING: No high-quality image found for this article. Skipping to maintain quality.');
            return;
        }

        // Block known garbage patterns
        const lowerUrl = imageUrl.toLowerCase();
        const isGarbage = ['logo', 'placeholder', 'espn_red', 'default_avatar', 'icon', 'badge', 'sprite'].some(g => lowerUrl.includes(g));
        if (isGarbage) {
            // Try player library as last resort
            const playerMatch = findPlayerImage(detailedData.title || article.title);
            if (playerMatch) {
                console.log(`📚 Garbage image detected, using Player Library: ${playerMatch.name}`);
                imageUrl = playerMatch.imageUrl;
            } else {
                console.error(`❌ ABORTING: Image is a placeholder/logo, not editorial: ${imageUrl}`);
                return;
            }
        }

        try {
            console.log(`📸 Downloading article image: ${imageUrl}`);
            const response = await axios({
                url: imageUrl,
                responseType: 'stream',
            });
            const writer = fs.createWriteStream(path.join(publicDir, fileName));
            response.data.pipe(writer);

            await new Promise((resolve, reject) => {
                writer.on('finish', resolve);
                writer.on('error', reject);
            });
            downloadedImages.push(fileName);
        } catch (err: any) {
            console.error(`❌ ABORTING: Could not download article image: ${err.message}`);
            return;
        }

        // Run AI Vision for Focus Point
        let focusPoint: FocusPoint = { x: 'center', y: 'top' };
        if (downloadedImages.length > 0 && downloadedImages[0]) {
            console.log('Analyzing image focus with AI Vision...');
            focusPoint = await detectSubjectFocus(path.join(publicDir, downloadedImages[0]));
            console.log(`Vision analysis focus: X=${focusPoint.x}, Y=${focusPoint.y}`);
        } else {
            console.warn('No images downloaded for focus analysis. Using default focus point.');
        }

        // 3. Generate Viral Script (Headline, Sub-headline, Slides)
        const scriptData = await generateScript(detailedData.content || article.title);

        // SMART OVERRIDE: If news is about injury, force EMERGENCY persona
        if (scriptData.headline.toLowerCase().includes('injury') || scriptData.slides.some(s => s.toLowerCase().includes('injury') || s.toLowerCase().includes('surgery'))) {
            scriptData.persona = 'EMERGENCY';
        }

        console.log(`Headline: ${scriptData.headline}`);
        console.log(`Persona: ${scriptData.persona}`);

        // 4. Audio Check (Music only, no voiceover for now)
        const hasMusic = fs.existsSync(path.join(publicDir, 'music.mp3'));

        // 5. Render Video
        const compositionId = 'NewsVideo';
        const entryPath = path.join(process.cwd(), 'remotion/index.ts');

        console.log('Bundling project...');
        const bundleLocation = await bundle({ entryPoint: entryPath });

        console.log('Selecting composition...');
        const composition = await selectComposition({
            serveUrl: bundleLocation,
            id: compositionId,
            inputProps: {
                title: scriptData.headline,
                subHeadline: scriptData.subHeadline,
                slides: scriptData.slides,
                category: scriptData.category,
                backgroundImages: downloadedImages,
                focusPoint,
                // Each slide timing: 7s for first, 5s for the rest, plus 2.5s outro
                durationInFrames: (7 + (scriptData.slides.length - 1) * 5) * 30 + (30 * 2.5),
                hasMusic,
                persona: scriptData.persona
            }
        });

        const outputLocation = path.join(process.cwd(), 'out/video.mp4');
        if (!fs.existsSync(path.join(process.cwd(), 'out'))) fs.mkdirSync(path.join(process.cwd(), 'out'));

        console.log('Rendering video...');
        await renderMedia({
            composition,
            serveUrl: bundleLocation,
            outputLocation,
            codec: 'h264',
            crf: 24,
            pixelFormat: 'yuv420p',
            inputProps: {
                title: scriptData.headline,
                subHeadline: scriptData.subHeadline,
                slides: scriptData.slides,
                category: scriptData.category,
                backgroundImages: downloadedImages,
                focusPoint,
                durationInFrames: (7 + (scriptData.slides.length - 1) * 5) * 30 + (30 * 2.5),
                hasMusic,
                persona: scriptData.persona
            }
        });

        console.log(`Video rendered successfully at: ${outputLocation}`);

        // 6. Auto-Post via Webhook
        if (process.env.TEST_MODE === 'true') {
            console.log('--- TEST MODE ACTIVE: Skipping webhook upload ---');
        } else {
            const result = await sendToWebhook(outputLocation, {
                headline: scriptData.headline,
                subHeadline: scriptData.facebookDescription,
                category: scriptData.category
            });

            if (result) {
                // ===== TRACK URL (Anti-Duplicate) =====
                addPostedUrl(history, article.url);

                // ===== TRACK CLOUDINARY ASSET (For Cleanup) =====
                trackCloudinaryAsset(history, result.publicId, 'video');

                console.log('📝 History updated: URL tracked, video asset tracked');
            }

            // Save all history changes (keywords + URLs + assets)
            saveHistory(history);
            console.log('Video signal sent to Webhook. 🚀');
        }

    } catch (error) {
        console.error('Pipeline failed:', error);
    }
}

main();
