import { renderStill, selectComposition } from '@remotion/renderer';
import { bundle } from '@remotion/bundler';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
    try {
        console.log('--- FORCING SKY TEMPLATE TEST ---');

        // 1. Mock Sky Content (Modern Centered - Daily News Style)
        const mockContent = {
            type: 'SKY',
            category: 'LALIGA',
            title: "Girona Stun Barcelona In Historic Win",
            subHeadline: "The Catalan giants suffered a shock defeat as Lamine Yamal missed a crucial penalty",
            image: 'background_0.png'
        };

        // 2. Render Image
        const entryPath = path.join(process.cwd(), 'remotion/index.ts');
        console.log('Bundling...');
        const bundleLocation = await bundle({ entryPoint: entryPath });

        console.log('Rendering Still Image (SKY)...');
        const composition = await selectComposition({
            serveUrl: bundleLocation,
            id: 'NewsCard',
            inputProps: {
                title: mockContent.title,
                subHeadline: mockContent.subHeadline,
                image: mockContent.image,
                category: mockContent.category,
                type: 'SKY'
            }
        });

        const outputLocation = path.join(process.cwd(), 'out/sky_test.png');
        await renderStill({
            composition,
            serveUrl: bundleLocation,
            output: outputLocation,
            inputProps: {
                title: mockContent.title,
                subHeadline: mockContent.subHeadline,
                image: mockContent.image,
                category: mockContent.category,
                type: 'SKY'
            }
        });

        console.log(`SKY Card rendered at: ${outputLocation}`);

        // 3. Upload to Cloudinary
        const { v2: cloudinary } = await import('cloudinary');
        cloudinary.config({
            cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
            api_key: process.env.CLOUDINARY_API_KEY,
            api_secret: process.env.CLOUDINARY_API_SECRET
        });

        console.log('Uploading to Cloudinary...');
        const uploadResponse = await cloudinary.uploader.upload(outputLocation, {
            folder: 'tvs_tests',
            public_id: `sky_test_${Date.now()}`
        });

        console.log(`SKY Card URL: ${uploadResponse.secure_url}`);

    } catch (error) {
        console.error('SKY Test Failed:', error);
    }
}

main();
