import { v2 as cloudinary } from 'cloudinary';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME as string,
    api_key: process.env.CLOUDINARY_API_KEY as string,
    api_secret: process.env.CLOUDINARY_API_SECRET as string
});

export async function sendToWebhook(videoPath: string, metadata: { headline: string, subHeadline: string, category: string }) {
    const webhookUrl = process.env.MAKE_WEBHOOK_URL;

    if (!webhookUrl) {
        console.warn('Warning: MAKE_WEBHOOK_URL is not set. Skipping auto-post.');
        return;
    }

    try {
        console.log('Uploading video to Cloudinary...');
        const absPath = path.resolve(videoPath);

        if (!fs.existsSync(absPath)) {
            throw new Error(`Video file not found at: ${absPath}`);
        }

        // 1. Upload to Cloudinary
        const uploadResponse = await cloudinary.uploader.upload(absPath, {
            resource_type: 'video',
            folder: 'tvs_videos',
            public_id: `video_${Date.now()}`
        });

        const videoUrl = uploadResponse.secure_url;
        console.log(`Video uploaded to Cloudinary: ${videoUrl}`);

        // 2. Send signal to Make.com (URL only, no binary file)
        console.log(`Sending signal to Make.com webhook: ${webhookUrl}`);

        const timestamp = new Date().toISOString();
        const payload = {
            videoUrl,
            headline: metadata.headline,
            subHeadline: metadata.subHeadline,
            category: metadata.category,
            timestamp
        };

        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`Webhook responded with status ${response.status}`);
        }

        console.log('Video signal delivered to Make.com! 🚀');
    } catch (error: any) {
        console.error('Failed to process webhook delivery:', error.message);
    }
}

export async function sendCardToWebhook(imagePath: string, metadata: { headline: string, subHeadline: string, category: string }) {
    const webhookUrl = process.env.MAKE_CARD_WEBHOOK_URL || process.env.MAKE_WEBHOOK_URL;

    if (!webhookUrl) {
        console.warn('Warning: No Webhook URL set for cards. Skipping.');
        return;
    }

    try {
        console.log('Uploading card to Cloudinary...');
        const absPath = path.resolve(imagePath);

        if (!fs.existsSync(absPath)) {
            throw new Error(`Card file not found at: ${absPath}`);
        }

        // 1. Upload as Image
        const uploadResponse = await cloudinary.uploader.upload(absPath, {
            resource_type: 'image',
            folder: 'tvs_cards',
            public_id: `card_${Date.now()}`
        });

        const imageUrl = uploadResponse.secure_url;
        console.log(`Card uploaded to Cloudinary: ${imageUrl}`);

        // 2. Send signal
        const payload = {
            imageUrl,
            headline: metadata.headline,
            subHeadline: metadata.subHeadline,
            category: metadata.category,
            type: 'STATIC_CARD',
            timestamp: new Date().toISOString()
        };

        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error(`Webhook failed: ${response.status}`);

        console.log('Card signal delivered to Make.com! 🚀');
        return imageUrl;
    } catch (error: any) {
        console.error('Webhook Error:', error.message);
    }
}
