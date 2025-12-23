import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        const { apiKey, prompt, refImages, aspectRatio } = await req.json();

        const finalApiKey = apiKey || process.env.GEMINI_API_KEY;

        if (!finalApiKey) {
            return NextResponse.json({ error: "API Key is required" }, { status: 400 });
        }

        const genAI = new GoogleGenerativeAI(finalApiKey);

        // Create a list of models to try.
        // User explicitly requested high-quality graphic models (nano-banana, gemini-3-pro).
        // We include "imagen-3.0-generate-001" as a reliable fallback for high-quality image generation.
        const modelsToTry = [
            "imagen-3.0-generate-001",
            "gemini-2.0-flash-exp"
        ];
        // Note: Deprecated preview models (nano-banana, 3-pro-preview) caused 404 or text-only responses.
        // We stick to the official Imagen 3 and the reliable Gemini 2 Flash.

        let usedModel = "";

        let lastError = "";
        let result = null;

        // map aspectRatio "1:1" etc to string if needed, currently API expects "1:1", "16:9", "4:3", "3:4"
        const validRatios = ["1:1", "16:9", "4:3", "3:4", "9:16"];
        const ratioConfig = validRatios.includes(aspectRatio) ? aspectRatio : "1:1";

        for (const modelName of modelsToTry) {
            try {
                console.log(`Starting generation with model: ${modelName}, ratio: ${ratioConfig}`);
                // generationConfig から aspectRatio を削除し、プロンプトに含める（APIエラー回避のため）
                const model = genAI.getGenerativeModel({
                    model: modelName,
                    generationConfig: {
                        temperature: 0.4,
                        maxOutputTokens: 2048,
                    }
                });

                // アスペクト比をプロンプトで指示
                const ratioInstruction = `\n\n[IMPORTANT] Output Image Aspect Ratio: ${ratioConfig}`;
                let content: any[] = [prompt + ratioInstruction];

                if (refImages && Array.isArray(refImages)) {
                    refImages.forEach((img: any) => {
                        if (img.data) {
                            content.push({ inlineData: { data: img.data, mimeType: img.mimeType || "image/jpeg" } });
                        }
                    });
                }

                // 画像生成は時間がかかるため、タイムアウトを90秒に設定
                const generatePromise = model.generateContent(content);
                const timeoutPromise = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error(`Timeout with ${modelName}`)), 120000)
                );

                result = await Promise.race([generatePromise, timeoutPromise]) as any;
                if (result) {
                    // Validate if the result actually contains an image or SVG
                    const response = await result.response;
                    const candidates = await response.candidates;
                    const part = candidates?.[0]?.content?.parts?.[0];

                    const hasImage = !!part?.inlineData;
                    const hasSvg = part?.text && part.text.match(/<svg[\s\S]*?<\/svg>/i);

                    if (hasImage || hasSvg) {
                        console.log(`Success with model: ${modelName} (Image: ${hasImage}, SVG: ${!!hasSvg})`);
                        usedModel = modelName;
                        break;
                    } else {
                        console.warn(`Model ${modelName} returned no image/svg. Response: ${part?.text?.substring(0, 100)}...`);
                        lastError = `Model ${modelName} returned valid response but no image/svg.`;
                        result = null; // Discard result and try next model
                    }
                }
            } catch (e: any) {
                lastError = e.message;
                console.warn(`Model ${modelName} attempt failed:`, lastError);

                // 制限エラー (429/Quota) または モデル不在 (404) の場合は次のモデルへ
                if (lastError.includes('quota') || lastError.includes('429') || lastError.includes('not found')) {
                    // 連続リクエストによるスパム判定を避けるため2秒待機 (SPECIFICATION.md: Retry Delay 2s)
                    await new Promise(r => setTimeout(r, 2000));
                    continue;
                } else {
                    // その他の致命的なエラーはここで終了
                    break;
                }
            }
        }

        if (!result) {
            throw new Error(`全てのモデルで生成に失敗しました。最後のエラー: ${lastError}`);
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

        returnData.usedModel = usedModel;
        return NextResponse.json(returnData);
    } catch (error: any) {
        console.error("Critical API error:", error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
