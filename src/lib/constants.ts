
export const ARCHETYPES = [
    "AIにおまかせ (自動最適化)",
    "プロセスフロー (手順・流れ)",
    "比較・対比 (A vs B)",
    "構造・解剖図 (構成要素)",
    "タイムライン (時系列)",
    "サイクル図 (循環)",
    "マインドマップ (放射状)",
    "ピラミッド階層 (構造)"
];

export const STYLE_PROMPTS: Record<string, string> = {
    "ビジネス・プロ (Business Pro)": "Style: Professional Corporate Vector Art. Features: Clean lines, trustworthy blue and grey color palette, sans-serif typography. Vibe: Reliable, efficient.",
    "テック・フューチャー (Tech Future)": "Style: Futuristic Cyberpunk. Features: Neon glowing lines (cyan/magenta), dark grid background, holographic effects. Vibe: High-tech, data-driven.",
    "フラット・モダン (Flat Modern)": "Style: Vibrant Flat Design. Features: Bright and bold colors, high contrast, simple geometric shapes, flat shading. Vibe: Energetic, infographic style.",
    "ホワイトボード (Whiteboard Sketch)": "Style: Whiteboard Marker Sketch. Features: Organic shaky lines, handwritten fonts, white background, casual marker strokes. Vibe: Friendly, brainstorming.",
    "ミニマル・ライン (Minimal Line)": "Style: Sophisticated Line Art. Features: Ultra-thin lines, generous whitespace, monochrome or limited pastel palette. Vibe: Elegant, modern.",
    "3Dアイソメトリック (3D Isometric)": "Style: 3D Isometric Render. Features: Orthographic projection, soft lighting, floating elements. Vibe: Tech startup, playful but structural.",
    "コミック・ストーリー (Comic Style)": "Style: Japanese Black & White Manga. Features: Ink lines, screentones, speed lines, comic bubbles. Vibe: Impactful, storytelling.",
    "クレイ・3D (Clay 3D)": "Style: 3D Claymorphism. Features: Soft rounded shapes, plastic/clay texture, warm lighting. Vibe: Warm, tactile, playful.",
    "ピクセル・レトロ (Pixel Retro)": "Style: 8-bit Pixel Art. Features: Low resolution pixels, limited color palette. Vibe: Nostalgic, digital retro.",
    "アーティスティック (Watercolor)": "Style: Watercolor Illustration. Features: Soft color bleeding, textured paper background. Vibe: Organic, artistic."
};

export const STYLE_ICONS: Record<string, { icon: string, color: string }> = {
    "ビジネス・プロ (Business Pro)": { "icon": "💼", "color": "#E0F2FE" },
    "テック・フューチャー (Tech Future)": { "icon": "👾", "color": "#F3E8FF" },
    "フラット・モダン (Flat Modern)": { "icon": "🔷", "color": "#F3F4F6" },
    "ホワイトボード (Whiteboard Sketch)": { "icon": "🖊️", "color": "#FEF3C7" },
    "ミニマル・ライン (Minimal Line)": { "icon": "✒️", "color": "#FFFFFF" },
    "3Dアイソメトリック (3D Isometric)": { "icon": "🧊", "color": "#DBEAFE" },
    "コミック・ストーリー (Comic Style)": { "icon": "💬", "color": "#FCE7F3" },
    "クレイ・3D (Clay 3D)": { "icon": "🧸", "color": "#FFEDD5" },
    "ピクセル・レトロ (Pixel Retro)": { "icon": "🕹️", "color": "#DCFCE7" },
    "アーティスティック (Watercolor)": { "icon": "🎨", "color": "#FEF9C3" }
};
