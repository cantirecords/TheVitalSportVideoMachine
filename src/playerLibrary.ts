/**
 * Player Photo Library — Curated high-quality image URLs for star athletes.
 * Used as fallback when an article mentions a player but has no good image.
 * These are reliable CDN links to editorial-quality photos.
 */

export interface PlayerEntry {
    keywords: string[];   // Keywords to match in article title (lowercase)
    imageUrl: string;     // High-quality fallback image URL
    name: string;         // Display name
}

export const PLAYER_LIBRARY: PlayerEntry[] = [
    // ⚽ SOCCER
    {
        name: 'Lionel Messi',
        keywords: ['messi', 'leo messi', 'lionel messi'],
        imageUrl: 'https://a1.espncdn.com/combiner/i?img=%2Fphoto%2F2024%2F0613%2Fr1345073_1296x729_16%2D9.jpg'
    },
    {
        name: 'Cristiano Ronaldo',
        keywords: ['ronaldo', 'cristiano', 'cr7'],
        imageUrl: 'https://a3.espncdn.com/combiner/i?img=%2Fphoto%2F2024%2F0617%2Fr1348091_1296x729_16%2D9.jpg'
    },
    {
        name: 'Kylian Mbappé',
        keywords: ['mbappe', 'mbappé', 'kylian'],
        imageUrl: 'https://a2.espncdn.com/combiner/i?img=%2Fphoto%2F2024%2F0603%2Fr1340651_1296x729_16%2D9.jpg'
    },
    {
        name: 'Vinícius Jr',
        keywords: ['vinicius', 'vinícius', 'vini jr', 'vini'],
        imageUrl: 'https://a4.espncdn.com/combiner/i?img=%2Fphoto%2F2024%2F1028%2Fr1402899_1296x729_16%2D9.jpg'
    },
    {
        name: 'Erling Haaland',
        keywords: ['haaland', 'erling'],
        imageUrl: 'https://a1.espncdn.com/combiner/i?img=%2Fphoto%2F2024%2F0914%2Fr1380934_1296x729_16%2D9.jpg'
    },
    {
        name: 'Jude Bellingham',
        keywords: ['bellingham', 'jude'],
        imageUrl: 'https://a3.espncdn.com/combiner/i?img=%2Fphoto%2F2024%2F0614%2Fr1345653_1296x729_16%2D9.jpg'
    },
    {
        name: 'Lamine Yamal',
        keywords: ['yamal', 'lamine'],
        imageUrl: 'https://a2.espncdn.com/combiner/i?img=%2Fphoto%2F2024%2F0714%2Fr1357225_1296x729_16%2D9.jpg'
    },
    {
        name: 'Mohamed Salah',
        keywords: ['salah', 'mohamed salah'],
        imageUrl: 'https://a4.espncdn.com/combiner/i?img=%2Fphoto%2F2024%2F1019%2Fr1399917_1296x729_16%2D9.jpg'
    },
    {
        name: 'Robert Lewandowski',
        keywords: ['lewandowski', 'lewy'],
        imageUrl: 'https://a1.espncdn.com/combiner/i?img=%2Fphoto%2F2024%2F1026%2Fr1402041_1296x729_16%2D9.jpg'
    },
    {
        name: 'Harry Kane',
        keywords: ['kane', 'harry kane'],
        imageUrl: 'https://a3.espncdn.com/combiner/i?img=%2Fphoto%2F2024%2F0928%2Fr1386839_1296x729_16%2D9.jpg'
    },
    // 🏀 NBA
    {
        name: 'LeBron James',
        keywords: ['lebron', 'james', 'lakers'],
        imageUrl: 'https://a4.espncdn.com/combiner/i?img=%2Fphoto%2F2024%2F1105%2Fr1407209_1296x729_16%2D9.jpg'
    },
    {
        name: 'Stephen Curry',
        keywords: ['curry', 'steph', 'warriors'],
        imageUrl: 'https://a2.espncdn.com/combiner/i?img=%2Fphoto%2F2024%2F1030%2Fr1404389_1296x729_16%2D9.jpg'
    },
    {
        name: 'Luka Dončić',
        keywords: ['doncic', 'luka', 'dončić'],
        imageUrl: 'https://a1.espncdn.com/combiner/i?img=%2Fphoto%2F2024%2F0613%2Fr1345169_1296x729_16%2D9.jpg'
    },
    {
        name: 'Giannis Antetokounmpo',
        keywords: ['giannis', 'antetokounmpo', 'bucks'],
        imageUrl: 'https://a3.espncdn.com/combiner/i?img=%2Fphoto%2F2024%2F1022%2Fr1400847_1296x729_16%2D9.jpg'
    },
    {
        name: 'Victor Wembanyama',
        keywords: ['wembanyama', 'wemby', 'victor'],
        imageUrl: 'https://a4.espncdn.com/combiner/i?img=%2Fphoto%2F2024%2F1025%2Fr1401689_1296x729_16%2D9.jpg'
    },
    {
        name: 'Nikola Jokić',
        keywords: ['jokic', 'jokić', 'nikola', 'nuggets'],
        imageUrl: 'https://a2.espncdn.com/combiner/i?img=%2Fphoto%2F2024%2F1028%2Fr1402901_1296x729_16%2D9.jpg'
    },
    // 🏈 NFL
    {
        name: 'Patrick Mahomes',
        keywords: ['mahomes', 'patrick', 'chiefs'],
        imageUrl: 'https://a1.espncdn.com/combiner/i?img=%2Fphoto%2F2024%2F0909%2Fr1378849_1296x729_16%2D9.jpg'
    },
    {
        name: 'Lamar Jackson',
        keywords: ['lamar', 'jackson', 'ravens'],
        imageUrl: 'https://a3.espncdn.com/combiner/i?img=%2Fphoto%2F2024%2F1014%2Fr1397593_1296x729_16%2D9.jpg'
    },
    // 🏎️ F1
    {
        name: 'Max Verstappen',
        keywords: ['verstappen', 'max', 'red bull racing'],
        imageUrl: 'https://a4.espncdn.com/combiner/i?img=%2Fphoto%2F2024%2F1103%2Fr1406197_1296x729_16%2D9.jpg'
    },
    {
        name: 'Lewis Hamilton',
        keywords: ['hamilton', 'lewis', 'ferrari f1'],
        imageUrl: 'https://a2.espncdn.com/combiner/i?img=%2Fphoto%2F2024%2F1201%2Fr1417189_1296x729_16%2D9.jpg'
    },
    // 🎾 Tennis
    {
        name: 'Carlos Alcaraz',
        keywords: ['alcaraz', 'carlos'],
        imageUrl: 'https://a1.espncdn.com/combiner/i?img=%2Fphoto%2F2024%2F0714%2Fr1357155_1296x729_16%2D9.jpg'
    },
    {
        name: 'Novak Djokovic',
        keywords: ['djokovic', 'novak', 'nole'],
        imageUrl: 'https://a3.espncdn.com/combiner/i?img=%2Fphoto%2F2024%2F0901%2Fr1375833_1296x729_16%2D9.jpg'
    },
    // ⚾ MLB
    {
        name: 'Shohei Ohtani',
        keywords: ['ohtani', 'shohei', 'dodgers'],
        imageUrl: 'https://a4.espncdn.com/combiner/i?img=%2Fphoto%2F2024%2F1029%2Fr1403489_1296x729_16%2D9.jpg'
    }
];

/**
 * Find a matching player image based on article title.
 * Returns the image URL if a match is found, null otherwise.
 */
export function findPlayerImage(articleTitle: string): { name: string; imageUrl: string } | null {
    const titleLower = articleTitle.toLowerCase();

    for (const player of PLAYER_LIBRARY) {
        if (player.keywords.some(k => titleLower.includes(k))) {
            console.log(`🏆 Player Library Match: ${player.name}`);
            return { name: player.name, imageUrl: player.imageUrl };
        }
    }

    return null;
}
