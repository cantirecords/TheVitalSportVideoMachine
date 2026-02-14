import Groq from 'groq-sdk';
import dotenv from 'dotenv';

dotenv.config();

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
});

export type FocusPoint = {
    x: 'left' | 'center' | 'right';
    y: 'top' | 'center' | 'bottom';
};

export async function detectSubjectFocus(imageUrl: string): Promise<FocusPoint> {
    if (!imageUrl) return { x: 'center', y: 'center' };

    try {
        const response = await groq.chat.completions.create({
            model: "meta-llama/llama-4-scout-17b-16e-instruct",
            messages: [
                {
                    role: "user",
                    content: [
                        {
                            type: "text",
                            text: `Analyze this image. Where is the MAIN SUBJECT'S FACE located?
                            Return a JSON object with two fields:
                            "x": "left", "center", or "right"
                            "y": "top", "center", or "bottom"
                            Example: {"x": "center", "y": "top"}`
                        },
                        {
                            type: "image_url",
                            image_url: {
                                url: imageUrl,
                            }
                        }
                    ]
                }
            ],
            response_format: { type: 'json_object' },
            max_tokens: 50,
        });

        const content = response.choices[0]?.message?.content || '{}';
        const result = JSON.parse(content);

        console.log(`Vision analysis focus: X=${result.x}, Y=${result.y}`);

        return {
            x: result.x?.toLowerCase() || 'center',
            y: result.y?.toLowerCase() || 'top' // Default to top for news/sports (faces are usually high)
        };
    } catch (error) {
        console.error('Vision analysis failed:', error);
        return { x: 'center', y: 'top' };
    }
}
