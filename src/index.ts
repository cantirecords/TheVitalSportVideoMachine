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

            // Filter for high-priority news: Soccer (Major leagues/teams), NBA, Winter Olympics, or big athlete names
            article = articles.find(a => {
                const titleLower = a.title.toLowerCase();
                const isSoccer = titleLower.includes('champions league') ||
                    titleLower.includes('madrid') ||
                    titleLower.includes('barça') ||
                    titleLower.includes('barcelona') ||
                    titleLower.includes('premier league') ||
                    titleLower.includes('mbappé') ||
                    titleLower.includes('vinícius') ||
                    titleLower.includes('liverpool') ||
                    titleLower.includes('manchester');

                const isNBA = titleLower.includes('nba') || titleLower.includes('lebron') || titleLower.includes('curry') || titleLower.includes('lakers');
                const isOlympics = titleLower.includes('olympic') || titleLower.includes('winter games') || titleLower.includes('gold medal');
                const isRecent = a.date ? a.date.includes('2026') : true;

                return (isSoccer || isNBA || isOlympics) && isRecent;
            }) || articles.find(a => a.date && a.date.includes('2026')) || articles[0]!;
        }

        console.log(`Using article from ${article.source}: ${article.title}`);

        // 2. Extract detailed data
        const detailedData = await extractArticleData(article.url);
        console.log(`Extracted Content Length: ${detailedData.content?.length || 0}`);
        console.log(`Extracted Images: ${detailedData.images?.length || 0}`);
        if (!detailedData.content) {
            console.warn("Warning: No content extracted from article!");
        }

        // Download ONLY the primary background image
        const publicDir = path.join(process.cwd(), 'public');
        if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });

        let bgImage = 'background.png';
        let imageUrl = detailedData.images[0];

        // Smart Focus Analysis
        let focusPoint: FocusPoint = { x: 'center', y: 'top' };
        if (imageUrl) {
            try {
                console.log(`Downloading primary background image: ${imageUrl}`);
                const imgRes = await axios.get(imageUrl, { responseType: 'arraybuffer' });
                fs.writeFileSync(path.join(publicDir, bgImage), Buffer.from(imgRes.data));

                console.log('Analyzing image focus with AI Vision...');
                focusPoint = await detectSubjectFocus(imageUrl);
            } catch (e: any) {
                console.error(`Failed to process image:`, e.message);
            }
        }

        // 3. Generate Viral Script (Headline, Sub-headline, Slides)
        const scriptData = await generateScript(detailedData.content || article.title);
        console.log(`Headline: ${scriptData.headline}`);

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
                backgroundImage: bgImage,
                focusPoint,
                // Each slide timing: 7s for first, 5s for the rest, plus 2.5s outro
                durationInFrames: (7 * 30) + ((scriptData.slides.length - 1) * 5 * 30) + (30 * 2.5),
                hasMusic
            },
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
                backgroundImage: bgImage,
                focusPoint,
                durationInFrames: (7 + (scriptData.slides.length - 1) * 5) * 30 + (30 * 2.5), // First slide 7s, rest 5s each
                hasMusic
            }
        });

        console.log(`Video rendered successfully at: ${outputLocation}`);

        // 6. Auto-Post via Webhook (ACTIVATED)
        await sendToWebhook(outputLocation, {
            headline: scriptData.headline,
            subHeadline: scriptData.facebookDescription,
            category: scriptData.category
        });
        console.log('Video signal sent to Webhook. 🚀');

    } catch (error) {
        console.error('Pipeline failed:', error);
    }
}

main();
