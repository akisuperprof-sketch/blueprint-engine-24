import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        const { apiKey, prompt, refImages } = await req.json();

        const finalApiKey = apiKey || process.env.GEMINI_API_KEY;

        if (!finalApiKey) {
            return NextResponse.json({ error: "API Key is required" }, { status: 400 });
        }

        const genAI = new GoogleGenerativeAI(finalApiKey);

        // 優先順位: 1. nano (指定) -> 2. 2.0-flash (最新) -> 3. 1.5-flash (安定)
        // 有料キーでも nano が制限される環境があるため、確実なフォールバックを組みます。
        const modelsToTry = ["nano-banana-pro-preview", "gemini-2.0-flash-exp", "gemini-1.5-pro", "gemini-1.5-flash"];

        let lastError = "";
        let result = null;

        for (const modelName of modelsToTry) {
            try {
                console.log(`Starting generation with model: ${modelName}`);
                const model = genAI.getGenerativeModel({ model: modelName });
                let content: any[] = [prompt];

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
                    setTimeout(() => reject(new Error(`Timeout with ${modelName}`)), 90000)
                );

                result = await Promise.race([generatePromise, timeoutPromise]) as any;
                if (result) {
                    console.log(`Success with model: ${modelName}`);
                    break;
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

        return NextResponse.json(returnData);
    } catch (error: any) {
        console.error("Critical API error:", error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
