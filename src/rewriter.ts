import Groq from 'groq-sdk';
import dotenv from 'dotenv';

dotenv.config();

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
});

export interface VideoScript {
    category: string;
    headline: string;
    subHeadline: string;
    facebookDescription: string;
    slides: string[];
    persona: string;
}

export interface CardContent {
    type: 'BREAKING' | 'QUOTE' | 'STAT' | 'SKY';
    category: string;
    title: string;
    subHeadline?: string;
    quoteAuthor?: string;
    statValue?: string;
    statLabel?: string;
    facebookDescription?: string;
}

export async function generateScript(content: string): Promise<VideoScript> {
    const prompt = `
        You are a PROFESSIONAL SPORTS JOURNALIST creating a 30-40 second video story.
        The content provided might be BREAKING NEWS, a HISTORICAL RECORD, or an INTERESTING FACT ("Did you know?").
        
        CRITICAL RULES - FOLLOW EXACTLY:
        1. **ZERO REPETITION**: Never repeat ANY phrase, word, or idea across slides. Each slide must be 100% unique.
        2. **NO GENERIC TEMPLATES**: BANNED phrases include "cameras caught", "shocking moment", etc. Use SPECIFIC details.
        3. **TELL A REAL STORY**: Whether it's news or a fact, tell it like a compelling narrative.
        4. **EACH SLIDE = NEW INFORMATION**: Each slide must reveal a new layer of the story or fact.

        SLIDE STRUCTURE (5 slides total):
        
        Slide 1 (THE HOOK/CONTEXT): Introduce the athlete or event with a compelling detail. 20-25 words.
        Slide 2 (THE JOURNEY/BUILD): Add depth (career stats, background, or the lead-up to the event). 20-25 words.
        Slide 3 (THE CORE): The main news, record, or "Did you know" fact. 20-25 words.
        Slide 4 (THE SIGNIFICANCE): Why this record/event makes them one of the greats. 20-25 words.
        Slide 5 (THE LEGACY): Final thought on their future or their place in history. 20-25 words.

        HEADLINE & DESCRIPTION:
        - "headline": Short, powerful (3-5 words). MUST include team or player keyword.
        - "subHeadline": Vague teaser (10-12 words).
        - "facebookDescription": 2 paragraphs. Para 1 = hook. Para 2 = "Discover the story 👇". At the very end, include relevant hashtags like #TheVitalSport and others based on the sport (e.g., #Soccer, #NBA, #RealMadrid).
        
        CRITICAL RULES:
        1. **FLOW**: Ensure a smooth narrative. Do not just list facts. Connect them.
        2. **VARIETY**: DO NOT start every slide with the player's name. Use pronouns, context, or action to start sentences.
        3. **DEPTH**: maintain the journalistic detail even within the word limit.
        4. **TRANSLATE**: Perfect English if source is Spanish.
        5. **NO NUMBERS**: Do NOT include slide numbers.
        
        News Content:
        ${content}
        
        Return ONLY valid JSON:
        {
          "persona": "ONE OF: NEWS, CELEBRATION, EMERGENCY, SCOUTING",
          "category": "ONE WORD SPORT",
          "headline": "SHORT HEADLINE",
          "subHeadline": "Teaser sentence...",
          "facebookDescription": "Para 1.\\n\\nPara 2.",
          "slides": [
            "Context with specific details...",
            "Build-up with specific actions...",
            "The reveal with exact details...",
            "Impact with facts/numbers...",
            "Forward-looking statement..."
          ]
        }
    `;

    try {
        const chatCompletion = await groq.chat.completions.create({
            messages: [{ role: 'user', content: prompt }],
            model: 'llama-3.3-70b-versatile',
            response_format: { type: 'json_object' },
        });

        const result = JSON.parse(chatCompletion.choices[0]?.message?.content || '{}');
        console.log(`AI Generated Headline: ${result.headline}`);
        console.log(`AI Generated Slides Count: ${result.slides?.length}`);
        return {
            category: result.category?.toUpperCase() || 'NATIONAL',
            headline: result.headline?.toUpperCase() || 'BREAKING UPDATE',
            subHeadline: result.subHeadline || '',
            facebookDescription: result.facebookDescription || result.subHeadline || '',
            slides: Array.isArray(result.slides) ? result.slides : [result.subHeadline || 'Developing situation...'],
            persona: result.persona?.toUpperCase() || 'NEWS'
        };
    } catch (error) {
        console.error('Script generation failed:', error);
        return {
            category: 'NATIONAL',
            headline: 'BREAKING NEWS ALERT',
            subHeadline: 'Major developing story in the United States this hour.',
            facebookDescription: 'Major news is breaking right now across the country. Authorities are working around the clock to manage the situation.\n\nStay tuned for more updates as this story develops. Follow for the latest viral news.',
            persona: 'EMERGENCY',
            slides: [
                'Major news is breaking right now across the country.',
                'Officials have just released a critical statement on the matter.',
                'The impact is expected to be felt by millions of citizens.',
                'Authorities are working around the clock to manage the crisis.',
                'Legal experts are already debating the long-term consequences.',
                'We will continue to bring you the very latest as it happens.'
            ]
        };
    }
}

export async function generateCardContent(content: string, title: string): Promise<CardContent> {
    // ===== WRITING STYLE ROTATION =====
    // Randomly pick a style each run to avoid repetitive phrasing
    const WRITING_STYLES = [
        {
            name: '🎙️ ANCHOR',
            instruction: `WRITING STYLE: "ANCHOR" — Professional TV broadcast journalist.
            - Use confident, authoritative language like a SportsCenter anchor.
            - Title should sound like a broadcast chyron (e.g., "Lakers Confirm Historic Deal").
            - SubHeadline should read like a teleprompter line — clear, factual, no hype.
            - Facebook description: Formal but accessible. Start with the key fact. Second paragraph adds context. Tone = Walter Cronkite meets ESPN.`
        },
        {
            name: '🔥 HYPE',
            instruction: `WRITING STYLE: "HYPE" — Energetic, fan-first, social media native.
            - Use exciting, punchy language that a fan would shout at a bar.
            - Title should feel URGENT and exciting (e.g., "Curry Just Changed Everything").
            - SubHeadline should tease like a cliffhanger — make people NEED to read more.
            - Facebook description: High energy! Use one strategic emoji. Short sentences. Exclamation points are welcome. Second paragraph = call to action + hashtags.`
        },
        {
            name: '📊 ANALYST',
            instruction: `WRITING STYLE: "ANALYST" — Stats-driven, calm, intellectual breakdown.
            - Use precise, data-oriented language like an advanced analytics expert.
            - Title should reference a specific stat or comparison (e.g., "Third Player Ever To Reach 40K").
            - SubHeadline should provide context with numbers or historical comparisons.
            - Facebook description: Thoughtful and measured. Start with the significance. Second paragraph = deeper analysis + hashtags. No exclamation points.`
        },
        {
            name: '💬 STORYTELLER',
            instruction: `WRITING STYLE: "STORYTELLER" — Narrative, dramatic, cinematic.
            - Write like you're opening a documentary or a long-form sports article.
            - Title should be evocative and emotional (e.g., "The Night Madrid Stood Still").
            - SubHeadline should set a scene or paint an image in the reader's mind.
            - Facebook description: Start with a dramatic hook sentence. Second paragraph = the deeper meaning of the moment + hashtags. Tone = literary journalism.`
        }
    ];

    const selectedStyle = WRITING_STYLES[Math.floor(Math.random() * WRITING_STYLES.length)]!;
    console.log(`Generating AI Content for Card... Style: ${selectedStyle.name}`);

    const prompt = `
        You are an expert sports editor designed to create a VIRAL SOCIAL MEDIA GRAPHIC.
        
        Analyze the news and extract content for a "Daily News" card.
        ALWAYS use the "SKY" format.

        SYSTEM ROLE: You are a professional SPORTS broadcast journalist for "The Vital Sport".

        ${selectedStyle.instruction}
    
        FORMATTING RULES:
        - "category": Short tag (e.g., "NBA", "LALIGA", "PREMIER"). MUST be a sport or league.
        - "title": Smart Clickbait Headline. EXACTLY 6-8 words. (MUST fit in TWO ROWS at 80px font).
        - "subHeadline": Deep Context. EXACTLY 12-15 words. (MUST fit in TWO ROWS at 32px font).
        - "facebookDescription": 2 short, engaging paragraphs with 1 emoji and hashtags: #TheVitalSport #[Category] #[Subject].
    
        STRICT RULES:
        1. NEVER write about technology, URLs, cookies, or website maintenance.
        2. If the provided content is empty or irrelevant, look at the News Title: "${title}". 
        3. Use your internal knowledge about the teams/players in the title (e.g., Girona vs Barcelona) to write a factual sports summary of that specific match.
        4. Your goal is to provide a professional, premium sports news card.
        5. FOLLOW THE WRITING STYLE ABOVE EXACTLY. Your tone MUST match the style instructions.
    
        News Title:
        ${title}
    
        News Content:
        ${content}

        Return ONLY valid JSON:
        {
          "type": "SKY",
          "category": "category...",
          "title": "Short Headline...",
          "subHeadline": "Details...",
          "facebookDescription": "Post text..."
        }
    `;

    try {
        const chatCompletion = await groq.chat.completions.create({
            messages: [{ role: 'user', content: prompt }],
            model: 'llama-3.3-70b-versatile',
            response_format: { type: 'json_object' },
            temperature: 0.8 // Slightly higher for more creative variety
        });

        const result = JSON.parse(chatCompletion.choices[0]?.message?.content || '{}');
        console.log('AI Full Result:', JSON.stringify(result, null, 2));
        console.log(`AI Card Type: ${result.type}`);
        return {
            type: 'SKY',
            category: result.category || 'THE VITAL SPORT',
            title: result.title || 'BREAKING NEWS',
            subHeadline: result.subHeadline,
            facebookDescription: result.facebookDescription,
            quoteAuthor: result.quoteAuthor,
            statValue: result.statValue,
            statLabel: result.statLabel
        };
    } catch (error) {
        console.error('Card generation failed:', error);
        return {
            type: 'SKY',
            category: 'BREAKING NEWS',
            title: 'DEVELOPING STORY',
            subHeadline: 'Check back for more details soon.'
        };
    }
}

