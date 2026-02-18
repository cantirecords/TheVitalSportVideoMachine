/**
 * Shared history management for both Reel and News Card pipelines.
 * Handles URL dedup, keyword cooldowns, and Cloudinary asset cleanup tracking.
 */
import fs from 'fs';
import path from 'path';
import { v2 as cloudinary } from 'cloudinary';

export interface CloudinaryAsset {
    publicId: string;
    resourceType: 'image' | 'video';
    uploadedAt: number; // Unix timestamp ms
}

export interface PipelineHistory {
    recentKeywords: string[];
    postedUrls: string[];           // URLs already posted (no duplicates)
    cloudinaryAssets: CloudinaryAsset[];  // Assets pending cleanup
}

const HISTORY_PATH = path.join(process.cwd(), 'history.json');
const MAX_URLS = 200;        // Keep last 200 URLs
const MAX_KEYWORDS = 50;     // Keep last 50 keywords
const CLEANUP_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Load the shared history from disk.
 */
export function loadHistory(): PipelineHistory {
    const defaults: PipelineHistory = {
        recentKeywords: [],
        postedUrls: [],
        cloudinaryAssets: []
    };

    if (!fs.existsSync(HISTORY_PATH)) return defaults;

    try {
        const data = JSON.parse(fs.readFileSync(HISTORY_PATH, 'utf8'));
        return {
            recentKeywords: Array.isArray(data.recentKeywords) ? data.recentKeywords : [],
            postedUrls: Array.isArray(data.postedUrls) ? data.postedUrls : [],
            cloudinaryAssets: Array.isArray(data.cloudinaryAssets) ? data.cloudinaryAssets : []
        };
    } catch (e) {
        console.error('Failed to read history.json, using defaults.');
        return defaults;
    }
}

/**
 * Save the history back to disk.
 */
export function saveHistory(history: PipelineHistory): void {
    // Auto-prune to keep history file manageable
    history.postedUrls = history.postedUrls.slice(0, MAX_URLS);
    history.recentKeywords = history.recentKeywords.slice(0, MAX_KEYWORDS);
    fs.writeFileSync(HISTORY_PATH, JSON.stringify(history, null, 2));
}

/**
 * Check if a URL has already been posted.
 */
export function isUrlAlreadyPosted(history: PipelineHistory, url: string): boolean {
    return history.postedUrls.includes(url);
}

/**
 * Add a posted URL to the front of the history.
 */
export function addPostedUrl(history: PipelineHistory, url: string): void {
    if (!history.postedUrls.includes(url)) {
        history.postedUrls.unshift(url);
    }
}

/**
 * Track a Cloudinary asset for later cleanup.
 */
export function trackCloudinaryAsset(history: PipelineHistory, publicId: string, resourceType: 'image' | 'video'): void {
    history.cloudinaryAssets.push({
        publicId,
        resourceType,
        uploadedAt: Date.now()
    });
}

/**
 * Delete Cloudinary assets older than 24 hours.
 * Call this at the START of each pipeline run.
 * Safe: only deletes assets that are confirmed old enough.
 */
export async function cleanupOldCloudinaryAssets(history: PipelineHistory): Promise<void> {
    const now = Date.now();
    const expired: CloudinaryAsset[] = [];
    const keeping: CloudinaryAsset[] = [];

    for (const asset of history.cloudinaryAssets) {
        if ((now - asset.uploadedAt) > CLEANUP_AGE_MS) {
            expired.push(asset);
        } else {
            keeping.push(asset);
        }
    }

    if (expired.length === 0) {
        console.log('🧹 Cloudinary cleanup: No expired assets to delete.');
        return;
    }

    console.log(`🧹 Cloudinary cleanup: Deleting ${expired.length} assets older than 24h...`);

    for (const asset of expired) {
        try {
            await cloudinary.uploader.destroy(asset.publicId, { resource_type: asset.resourceType });
            console.log(`  🗑️ Deleted: ${asset.publicId} (${asset.resourceType})`);
        } catch (err: any) {
            console.warn(`  ⚠️ Failed to delete ${asset.publicId}: ${err.message}`);
        }
    }

    // Keep only non-expired assets
    history.cloudinaryAssets = keeping;
}
