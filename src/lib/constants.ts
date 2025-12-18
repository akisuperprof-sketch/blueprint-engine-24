
export const ARCHETYPES = [
    "AIにおまかせ (自動最適化)",
    "プロセスフロー (手順・流れ)",
    "比較・対比 (A vs B)",
    "構造・解剖図 (構成要素)",
    "タイムライン (時系列)",
    "サイクル図 (循環)",
    "マインドマップ (放射状)",
    "ピラミッド階層 (構造)",
    "マトリックス (4象限 / 2x2分析)"
];

export const STYLE_PROMPTS: Record<string, string> = {
    "ビジネス・プロ (Business Pro)": `Style: Professional Corporate Vector Art.
    Features: Clean lines, trustworthy blue and grey color palette, sans-serif typography.
    Vibe: Reliable, efficient, suitable for business presentations.`,

    "ポップ・インフォ (Pop Info)": `Style: Vibrant Flat Design.
    Features: Bright and bold colors, high contrast, simple geometric shapes, flat shading.
    Vibe: Energetic, clear visibility, infographic style.`,

    "手書きスケッチ (Hand-drawn Sketch)": `Style: Whiteboard Marker Sketch.
    Features: Organic shaky lines, handwritten fonts, white background, casual marker strokes.
    Vibe: Friendly, brainstorming, educational, approachable.`,

    "ミニマリスト (Minimalist)": `Style: Sophisticated Line Art.
    Features: Ultra-thin lines, generous whitespace, monochrome or limited pastel palette.
    Vibe: Elegant, modern, Apple-style aesthetics.`,

    "3Dアイソメトリック (3D Isometric)": `Style: 3D Isometric Render.
    Features: Orthographic projection, soft lighting, cute "miniature garden" look, floating elements.
    Vibe: Tech startup, playful but structural, digital twin.`,

    "サイバーパンク (Cyberpunk)": `Style: Futuristic Cyberpunk.
    Features: Neon glowing lines (cyan/magenta), dark grid background, holographic effects.
    Vibe: High-tech, futuristic, data-driven, sci-fi.`,

    "コミック/漫画 (Comic/Manga)": `Style: Japanese Black & White Manga.
    Features: Ink lines (G-pen), screentones (dots), speed lines, comic bubbles.
    Vibe: Impactful, storytelling, dramatic, entertainment.`,

    "クレイアニメ (Clay Anime)": `Style: 3D Claymorphism.
    Features: Soft rounded shapes, plastic/clay texture, warm lighting, depth of field.
    Vibe: Warm, tactile, playful, stop-motion animation look.`,

    "レトロゲーム (Retro Game)": `Style: 8-bit Pixel Art.
    Features: Low resolution pixels, limited color palette, jagged edges.
    Vibe: Nostalgic, gaming culture, digital retro.`,

    "水彩画アート (Watercolor Art)": `Style: Watercolor Illustration.
    Features: Soft color bleeding, textured paper background, artistic brush strokes.
    Vibe: Organic, artistic, gentle, hand-painted.`,

    "黒板アート (Blackboard Art)": `Style: Chalkboard Drawing.
    Features: Detailed chalk textures, green or black chalkboard background, hand-drawn diagrams, multi-colored chalk.
    Vibe: Educational, nostalgic, creative, handmade effect.`
};


export const STYLE_ICONS: Record<string, { icon: string, color: string }> = {
    "ビジネス・プロ (Business Pro)": { "icon": "💼", "color": "#E0F2FE" },
    "ポップ・インフォ (Pop Info)": { "icon": "🔷", "color": "#F3F4F6" },
    "手書きスケッチ (Hand-drawn Sketch)": { "icon": "🖊️", "color": "#FEF3C7" },
    "ミニマリスト (Minimalist)": { "icon": "✒️", "color": "#FFFFFF" },
    "3Dアイソメトリック (3D Isometric)": { "icon": "🧊", "color": "#DBEAFE" },
    "サイバーパンク (Cyberpunk)": { "icon": "👾", "color": "#F3E8FF" },
    "コミック/漫画 (Comic/Manga)": { "icon": "💬", "color": "#FCE7F3" },
    "クレイアニメ (Clay Anime)": { "icon": "🧸", "color": "#FFEDD5" },
    "レトロゲーム (Retro Game)": { "icon": "🕹️", "color": "#DCFCE7" },
    "水彩画アート (Watercolor Art)": { "icon": "🎨", "color": "#FEF9C3" },
    "黒板アート (Blackboard Art)": { "icon": "🏫", "color": "#D1FAE5" }
};

export const STYLE_PREVIEWS: Record<string, string> = {
    "ビジネス・プロ (Business Pro)": "bg-gradient-to-br from-slate-800 to-blue-900 border border-blue-400", // Navy for trust
    "ポップ・インフォ (Pop Info)": "bg-gradient-to-br from-yellow-300 via-orange-400 to-red-500", // Vibrant
    "手書きスケッチ (Hand-drawn Sketch)": "bg-[#fffbeb] border-2 border-dashed border-slate-400",
    "ミニマリスト (Minimalist)": "bg-white border border-slate-200 shadow-sm",
    "3Dアイソメトリック (3D Isometric)": "bg-gradient-to-br from-indigo-100 to-purple-200 border-b-4 border-indigo-300",
    "サイバーパンク (Cyberpunk)": "bg-slate-950 border border-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.4)]", // Darker + more neon
    "コミック/漫画 (Comic/Manga)": "bg-white border-2 border-black bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:6px_6px]",
    "クレイアニメ (Clay Anime)": "bg-gradient-to-br from-orange-100 to-amber-200 rounded-xl border-4 border-white shadow-inner",
    "レトロゲーム (Retro Game)": "bg-slate-800 border-4 border-green-500",
    "水彩画アート (Watercolor Art)": "bg-gradient-to-br from-pink-100 via-purple-100 to-indigo-100 opacity-90",
    "黒板アート (Blackboard Art)": "bg-emerald-900 border-4 border-amber-900 [background-image:linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px)] [background-size:20px_20px]"
};
