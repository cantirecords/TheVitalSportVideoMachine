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

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config();

async function main() {
    if (!process.env.GROQ_API_KEY) {
        console.error('Error: GROQ_API_KEY is not set in .env file');
        process.exit(1);
    }

    try {
        console.log('--- TVS AI VIDEO MACHINE (V1 SPORTS) ---');

        let article;
        if (process.env.MANUAL_URL) {
            console.log(`Using manual URL from ENV: ${process.env.MANUAL_URL}`);
            article = {
                url: process.env.MANUAL_URL,
                title: 'Directed Request Story',
                source: 'Manual Override'
            };
        } else {
            // 1. Scrape News (Fetch more to find a specific team if needed)
            const articles = await scrapeNews(100);
            if (articles.length === 0) {
                console.log('No articles found.');
                return;
            }

            // Expanded Variety: Filter for high-priority news across ALL major sports
            const priorityArticles = articles.filter(a => {
                const titleLower = a.title.toLowerCase();

                // SOCCER: Broaden beyond just Barca/Madrid
                const isSoccer = ['champions league', 'premier league', 'laliga', 'serie a', 'bundesliga',
                    'madrid', 'barça', 'barcelona', 'atletico', 'manchester', 'liverpool', 'arsenal', 'chelsea',
                    'haaland', 'mbappé', 'bellingham', 'yamal', 'vinícius', 'salah', 'kane', 'lewandowski',
                    'psg', 'bayern', 'leverkusen', 'dortmund', 'inter milan', 'juventus', 'milan'].some(key => titleLower.includes(key));

                // NBA: 
                const isNBA = ['nba', 'lebron', 'curry', 'lakers', 'celtics', 'warriors', 'mavericks', 'nuggets',
                    'jokic', 'doncic', 'antetokounmpo', 'giannis', 'wembanyama', 'suns', 'heat'].some(key => titleLower.includes(key));

                // OTHERS: F1, NFL, MLB, Tennis
                const isVariety = ['f1', 'formula 1', 'verstappen', 'hamilton', 'ferrari', 'red bull',
                    'super bowl', 'mahomes', 'nfl', 'draft',
                    'ohtani', 'dodgers', 'yankees', 'mlb',
                    'alcaraz', 'djokovic', 'sinner', 'tennis',
                    'olympic', 'winter games', 'gold medal'].some(key => titleLower.includes(key));

                const isRecent = a.date ? a.date.includes('2026') : true;

                return (isSoccer || isNBA || isVariety) && isRecent;
            });

            // RANDOM VARIATION: Shuffle priority articles to avoid picking the same topic every time
            if (priorityArticles.length > 0) {
                console.log(`Found ${priorityArticles.length} priority articles. Picking randomly for variety...`);
                article = priorityArticles[Math.floor(Math.random() * priorityArticles.length)];
            } else {
                // Fallback to any recent news if no priority found
                const recentArticles = articles.filter(a => a.date && a.date.includes('2026'));
                if (recentArticles.length > 0) {
                    article = recentArticles[Math.floor(Math.random() * recentArticles.length)];
                } else {
                    article = articles[0]!;
                }
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
        const imageUrl = detailedData.images[0];
        const fileName = `background_0.png`;

        if (imageUrl) {
            try {
                // If it's an AP News placeholder, skip it to keep our high-quality generated image
                if (imageUrl.includes('apnews.com') && (imageUrl.includes('logo') || imageUrl.includes('placeholder'))) {
                    console.log(`Skipping placeholder image from AP News: ${imageUrl}`);
                    if (fs.existsSync(path.join(publicDir, fileName))) {
                        downloadedImages.push(fileName);
                    }
                } else {
                    console.log(`Downloading background image: ${imageUrl}`);
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
                }
            } catch (err: any) {
                console.warn(`Could not download primary image: ${err.message}`);
            }
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
            crf: 24, // Optimized for Sports (Balance between quality and 413 error prevention)
            pixelFormat: 'yuv420p',
            inputProps: {
                title: scriptData.headline,
                subHeadline: scriptData.subHeadline,
                slides: scriptData.slides,
                category: scriptData.category,
                backgroundImages: downloadedImages,
                focusPoint,
                durationInFrames: (7 + (scriptData.slides.length - 1) * 5) * 30 + (30 * 2.5), // First slide 7s, rest 5s each
                hasMusic,
                persona: scriptData.persona
            }
        });

        console.log(`Video rendered successfully at: ${outputLocation}`);

        // 6. Auto-Post via Webhook (SANDBOX SAFETY FOR TESTING)
        if (process.env.TEST_MODE === 'true') {
            console.log('--- TEST MODE ACTIVE: Skipping webhook upload ---');
        } else {
            await sendToWebhook(outputLocation, {
                headline: scriptData.headline,
                subHeadline: scriptData.facebookDescription,
                category: scriptData.category
            });
            console.log('Video signal sent to Webhook. 🚀');
        }

    } catch (error) {
        console.error('Pipeline failed:', error);
    }
}

main();
