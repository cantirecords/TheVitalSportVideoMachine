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
