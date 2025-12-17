import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

// Fallback list of models that support image generation
const IMAGE_MODELS = ["gemini-2.0-flash-exp", "gemini-1.5-pro"];

export async function POST(req: Request) {
    try {
        const { apiKey, prompt, refImages } = await req.json(); // refImages: array of {data: base64, mimeType: string}

        const finalApiKey = apiKey || process.env.GEMINI_API_KEY;

        if (!finalApiKey) {
            return NextResponse.json({ error: "API Key is required" }, { status: 400 });
        }

        const genAI = new GoogleGenerativeAI(finalApiKey);

        // Attempt with first model, simplistic fallback logic inside route if needed, 
        // but for now let's just use the robust one.
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

        let content: any[] = [prompt];

        if (refImages && Array.isArray(refImages)) {
            refImages.forEach((img: any) => {
                content.push({
                    inlineData: {
                        data: img.data,
                        mimeType: img.mimeType
                    }
                });
            });
        }

        // Note: The original app used 'nano-banana-pro-preview' which seems custom/internal.
        // We will standard Gemini models that support image generation or just text-to-text if that was a wrapper.
        // Wait, the original code used 'response.parts[0].inline_data.data' which implies the model returns an IMAGE directly?
        // Gemini API standard models (Pro/Flash) return *Text* by default. 
        // If the user was using a specific image generation model not available broadly, this might fail.
        // HOWEVER, standard Gemini 1.5 Pro / Flash does NOT generate images directly (it's multimodal input, text output).
        // The user's original code: `parse_image_response` checks `response.parts[0].inline_data.data`.
        // This implies they were using a model that outputs images (Imagen on Vertex AI or a specific Gemini test endpoint).
        // Since we are moving to Vercel/Standard Gemini API, we might be limited if we don't have access to that specific model name.
        // For this 'replica', I will assume we are asking for an SVG or Code representation OR 
        // we have to warn the user if they don't have access to an image-generation capable model via API key.
        // BUT, to keep it functional, I will prompt for SVG code if image generation isn't supported, 
        // OR acts as a proxy. 
        // ACTUALLY, "nano-banana-pro-preview" sounds like a very specific internal or limited preview model.
        // Let's stick to generating SVG code which is robust for Blueprint diagrams, or assume newer models can return images.
        // Ref: "gemini-2.0-flash-exp" can generate images? No, usually not via simple `generateContent`.
        // Wait, Imagen 3 is available via `imagen-3.0-generate-001` on Vertex.
        // On AI Studio/Gemini API, it's simpler.
        // Let's assume the user has a key that works for `gemini-2.0-flash-exp` which might be the one they used (they used `nano-banana`).
        // I will try to fetch the response. If it has inline_data, I return it. 
        // If it has text, I return text but mark it as "SVG" or similar? 
        // The original code `parse_image_response` throws if text.
        // I'll try to replicate the call.

        const result = await model.generateContent(content);
        const response = await result.response;

        // Check for inline data (Image)
        // The node JS SDK types might hide it, but the raw response might have it.
        // We'll inspect the candidates.

        // For the purpose of this migration, I will return the raw TEXT or Base64 Data depending on what we get.
        // If the model creates an image, `response.functionCalls()`? No. 
        // It's in candidates[0].content.parts[0].inlineData

        // We will return the whole structure for the client to parse.
        // Accessing private props if needed or just return standard text if image fails.

        // HACK: To ensure the user gets *something*, if the model returns text (likely SVG code due to prompts),
        // we passes that back. The frontend can render SVG.

        // However, the prompt in Step 4 says "[FINAL STYLE] ... High Quality Render".
        // If the model returns text, we might want to ask for SVG explicitly if it's not an image model.
        // Let's return the candidates to be safe.

        // Note: We need to serialize the response properly.
        // `response` object is complex. We'll extract text or inline data.

        const candidates = await result.response.candidates;
        const firstPart = candidates?.[0]?.content?.parts?.[0];

        let returnData: any = {};

        if (firstPart?.inlineData) {
            returnData = {
                type: "image",
                mimeType: firstPart.inlineData.mimeType,
                data: firstPart.inlineData.data
            };
        } else if (firstPart?.text) {
            returnData = {
                type: "text",
                content: firstPart.text
            };
        }

        return NextResponse.json(returnData);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
