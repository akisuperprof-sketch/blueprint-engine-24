import { NextResponse } from "next/server";

export async function GET(req: Request) {
    try {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ error: "No API Key found in env" }, { status: 500 });
        }

        // Google Generative AI REST API to list models
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}&pageSize=100`);
        const data = await res.json();

        if (data.error) {
            return NextResponse.json(data, { status: 400 });
        }

        // Filter for image generation capable models or user mentioned ones
        const models = data.models || [];
        const simpleList = models.map((m: any) => ({
            name: m.name,
            displayName: m.displayName,
            supportedGenerationMethods: m.supportedGenerationMethods
        }));

        return NextResponse.json({
            count: models.length,
            models: simpleList
        });

    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
