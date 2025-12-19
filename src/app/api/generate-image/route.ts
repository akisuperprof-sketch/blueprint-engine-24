import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        const { apiKey, prompt, refImages } = await req.json();

        // Check if the individual API key is present, otherwise fallback
        const finalApiKey = apiKey || process.env.GEMINI_API_KEY;

        if (!finalApiKey) {
            return NextResponse.json({ error: "API Key is required" }, { status: 400 });
        }

        const genAI = new GoogleGenerativeAI(finalApiKey);

        // Models to try in order. 
        // We prioritize nano-banana-pro-preview as requested.
        // We use gemini-1.5-flash as the ultimate fallback because it has the highest TPM limit.
        const modelsToTry = ["nano-banana-pro-preview", "gemini-2.0-flash-exp", "gemini-1.5-pro", "gemini-1.5-flash"];

        let lastError = "";
        let result = null;

        for (const modelName of modelsToTry) {
            try {
                const model = genAI.getGenerativeModel({ model: modelName });

                // Construct content: Text first, then images
                let content: any[] = [prompt];

                if (refImages && Array.isArray(refImages)) {
                    refImages.forEach((img: any) => {
                        if (img.data && img.mimeType) {
                            content.push({
                                inlineData: {
                                    data: img.data,
                                    mimeType: img.mimeType
                                }
                            });
                        }
                    });
                }

                // Set a timeout for the individual model call (to avoid mobile hangs)
                const generatePromise = model.generateContent(content);
                const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 25000));

                result = await Promise.race([generatePromise, timeoutPromise]) as any;
                if (result) break;
            } catch (e: any) {
                lastError = e.message;
                console.warn(`Model ${modelName} failed on server:`, lastError);

                // If it's a Quota error, wait a moment and try the next one
                if (lastError.toLowerCase().includes('quota') || lastError.toLowerCase().includes('429')) {
                    await new Promise(r => setTimeout(r, 2000));
                    continue;
                } else {
                    // For other errors, we still try next model unless it's a fatal key issue
                    if (lastError.includes("API key")) break;
                    continue;
                }
            }
        }

        if (!result) {
            return NextResponse.json({
                error: `画像生成に失敗しました。\n[原因]: ${lastError}\n[対策]: しばらく待つか、スタイルを変えてみてください。`
            }, { status: 500 });
        }

        const response = await result.response;
        const candidates = await response.candidates;
        const firstPart = candidates?.[0]?.content?.parts?.[0];

        let returnData: any = {};

        if (firstPart?.inlineData) {
            returnData = {
                type: "image",
                mimeType: firstPart.inlineData.mimeType,
                data: firstPart.inlineData.data
            };
        } else if (firstPart?.text) {
            const text = firstPart.text;
            const svgMatch = text.match(/<svg[\s\S]*?<\/svg>/i);

            if (svgMatch) {
                let svgCode = svgMatch[0];
                if (!svgCode.includes('xmlns="http://www.w3.org/2000/svg"')) {
                    svgCode = svgCode.replace(/<svg/i, '<svg xmlns="http://www.w3.org/2000/svg"');
                }
                returnData = { type: "svg", content: svgCode };
            } else {
                returnData = { type: "text", content: text };
            }
        }

        return NextResponse.json(returnData);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
