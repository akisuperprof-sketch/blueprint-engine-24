import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        const { apiKey, prompt, image, mimeType } = await req.json();

        if (!apiKey) {
            return NextResponse.json({ error: "API Key is required" }, { status: 400 });
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" }); // Using a fast/capable model

        let content: any[] = [prompt];

        if (image && mimeType) {
            // user passed base64 image
            content.push({
                inlineData: {
                    data: image,
                    mimeType: mimeType
                }
            });
        }

        const result = await model.generateContent(content);
        const response = await result.response;
        const text = response.text();

        return NextResponse.json({ text });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
