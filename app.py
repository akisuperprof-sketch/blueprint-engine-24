import streamlit as st
import google.generativeai as genai
import json
import io
import io
from PIL import Image
import history_utils # Import History Utils

# ==========================================
# 0. Session State Initialization (Earliest)
# ==========================================
if "phase" not in st.session_state: st.session_state.phase = "input"
if "draft_data" not in st.session_state: st.session_state.draft_data = {}
if "final_prompt" not in st.session_state: st.session_state.final_prompt = ""
if "layout_feedback" not in st.session_state: st.session_state.layout_feedback = ""
if "needs_draft_gen" not in st.session_state: st.session_state.needs_draft_gen = True

# Settings State
if "api_key" not in st.session_state: st.session_state.api_key = ""
if "selected_text_model" not in st.session_state: st.session_state.selected_text_model = "gemini-2.5-pro"
if "selected_image_model" not in st.session_state: st.session_state.selected_image_model = "nano-banana-pro-preview"
if "fallback_list_text" not in st.session_state: st.session_state.fallback_list_text = ["gemini-2.5-pro"]
if "fallback_list_image" not in st.session_state: st.session_state.fallback_list_image = ["nano-banana-pro-preview"]
# Style Selection State
if "selected_style_key" not in st.session_state: st.session_state.selected_style_key = "ビジネス・プロ (Business Pro)"

# Input State
if "ref_images" not in st.session_state: st.session_state.ref_images = []
if "is_ref_mandatory" not in st.session_state: st.session_state.is_ref_mandatory = False
if "additional_inst" not in st.session_state: st.session_state.additional_inst = ""


# ==========================================
# 1. App Config & Design
# ==========================================
st.set_page_config(
    page_title="ブループリントエンジン24 | AI図解生成ツール", 
    layout="wide", 
    page_icon="💠"
)

# Premium CSS (Recraft-like) - Light Mode Blueprint Version
st.markdown("""
<style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap');
    
    /* Global Text & Font */
    html, body, [class*="css"], .stMarkdown, .stHeader, h1, h2, h3, h4, h5, h6 {
        font-family: 'Inter', sans-serif !important;
        color: #0F172A !important; /* Slate-900 */
    }
    
    /* Background: Blueprint Grid (Light) */
    .stApp {
        background-color: #F8FAFC; /* Slate-50 */
        background-image: 
            linear-gradient(rgba(37, 99, 235, 0.08) 1px, transparent 1px),
            linear-gradient(90deg, rgba(37, 99, 235, 0.08) 1px, transparent 1px);
        background-size: 24px 24px;
    }
    
    /* Primary Button: AI/Tech Blue */
    .stButton>button[kind="primary"] {
        background: linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%);
        color: white !important;
        border: none;
        border-radius: 8px;
        padding: 0.6rem 1.4rem;
        transition: all 0.3s ease;
        box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.2);
        font-weight: 600;
        letter-spacing: 0.02em;
    }
    .stButton>button[kind="primary"]:hover {
        background: linear-gradient(135deg, #3B82F6 0%, #2563EB 100%);
        box-shadow: 0 10px 15px -3px rgba(37, 99, 235, 0.3);
        transform: translateY(-2px);
    }
    
    /* Secondary Button: Clean Light */
    .stButton>button[kind="secondary"] {
        background: white;
        color: #334155 !important;
        border: 1px solid #CBD5E1;
        border-radius: 8px;
        box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
    }
    .stButton>button[kind="secondary"]:hover {
        border-color: #94A3B8;
        background: #F1F5F9;
        color: #0F172A !important;
    }
    
    /* Inputs: Modern White/Glass */
    .stTextInput input, .stTextArea textarea, .stSelectbox div[data-baseweb="select"] {
        background-color: rgba(255, 255, 255, 0.9) !important;
        border: 1px solid #E2E8F0 !important;
        color: #0F172A !important;
        border-radius: 8px;
        box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
    }
    .stTextInput input:focus, .stTextArea textarea:focus {
        border-color: #3B82F6 !important;
        box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2) !important;
    }
    
    /* Wizard Container: Light Glass */
    .wizard-container {
        display: flex;
        justify-content: space-between;
        margin: 1.5rem 0;
        background: rgba(255, 255, 255, 0.7);
        border-radius: 12px;
        padding: 12px;
        border: 1px solid rgba(226, 232, 240, 0.6);
        backdrop-filter: blur(8px);
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
    }
    
    /* Expander & Cards */
    div[data-testid="stExpander"] {
        background-color: rgba(255, 255, 255, 0.8);
        border: 1px solid #E2E8F0;
        border-radius: 10px;
        box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.05);
        color: #0F172A !important;
    }
    div[data-testid="stExpander"] p {
        color: #334155 !important;
    }
    
    /* Mobile Optimization */
    @media (max-width: 640px) {
        .block-container {
            padding-top: 1rem;
            padding-left: 1rem;
            padding-right: 1rem;
        }
        h1 { font-size: 1.8rem !important; }
        .wizard-step { font-size: 0.7rem; }
    }
    
    /* Hide Streamlit Bloat */
    #MainMenu {visibility: hidden;}
    footer {visibility: hidden;}
    header[data-testid="stHeader"] {visibility: hidden;}
    .stDeployButton {display:none;}
</style>
""", unsafe_allow_html=True)

# --- Constants ---
STYLE_PROMPTS = {
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
}

ARCHETYPES = [
    "AIにおまかせ (自動最適化)",
    "プロセスフロー (手順・流れ)",
    "比較・対比 (A vs B)",
    "構造・解剖図 (構成要素)",
    "タイムライン (時系列)",
    "サイクル図 (循環)",
    "マインドマップ (放射状)",
    "ピラミッド階層 (構造)"
]

# --- Helper Functions ---

def parse_image_response(response):
    try:
        if hasattr(response, 'parts') and response.parts:
            image_data = response.parts[0].inline_data.data
            return Image.open(io.BytesIO(image_data))
        if hasattr(response, 'text'):
            raise ValueError("Response is text, not image.")
    except Exception as e:
        raise RuntimeError(f"Failed to parse image from response: {e}")

def generate_with_fallback(model_names, prompt):
    last_error = None
    if not model_names: 
        raise ValueError("No models available.")
    for model_name in model_names:
        try:
            model = genai.GenerativeModel(model_name)
            response = model.generate_content(prompt)
            return response, model_name
        except Exception as e:
            last_error = e
            continue
    raise last_error

@st.cache_data(ttl=300)
def get_available_models(api_key_input):
    if not api_key_input: return []
    try:
        genai.configure(api_key=api_key_input)
        models = []
        for m in genai.list_models():
            if 'generateContent' in m.supported_generation_methods:
                name = m.name.replace("models/", "")
                models.append(name)
        return models
    except Exception:
        return []

# Navigation Progress Bar with Clickable Steps
def render_progress_bar(current_step):
    steps = {
        "input": "01. 入力", 
        "struct": "02. 構成", 
        "draft": "03. ドラフト", 
        "design": "04. デザイン"
    }
    phase_keys = list(steps.keys())
    
    # Buttons use global CSS based on type="primary" (Active) or "secondary" (Others).

    cols = st.columns(len(steps))
    
    for i, (key, label) in enumerate(steps.items()):
        step_num = i + 1
        is_active = (step_num == current_step)
        is_completed = (step_num < current_step)
        
        # Determine styling
        if is_active:
            btn_type = "primary" # Highlight
            help_txt = "現在のステップ"
        elif is_completed:
            btn_type = "secondary" # Accessible
            help_txt = "このステップに戻る"
        else:
            btn_type = "secondary" # Disabled-ish
            help_txt = "まだ進めません"

        # Logic to enable/disable buttons
        # Allow jumping back to completed steps, but assume forward jumping requires finishing current step (enforced by main logic).
        # Actually, if we are at step 4, we can jump to 1, 2, 3.
        disabled = not (is_completed or is_active)
        
        with cols[i]:
            # Use standard buttons for navigation logic
            if st.button(label, key=f"nav_{key}", type=btn_type, disabled=disabled, use_container_width=True):
                # Only switch if not current
                if not is_active:
                    st.session_state.phase = key
                    st.rerun()
    
    st.markdown("---")


# Style Icons Mapping (Emoji & Color)
# Updated colors for Light Mode Visibility
STYLE_ICONS = {
    "ビジネス・プロ (Business Pro)": {"icon": "💼", "color": "#E0F2FE"}, # Light Blue
    "テック・フューチャー (Tech Future)": {"icon": "👾", "color": "#F3E8FF"}, # Fuchsia tint (lighter)
    "フラット・モダン (Flat Modern)": {"icon": "🔷", "color": "#F3F4F6"}, # Gray
    "ホワイトボード (Whiteboard Sketch)": {"icon": "🖊️", "color": "#FEF3C7"}, # Amber (Yellowish)
    "ミニマル・ライン (Minimal Line)": {"icon": "✒️", "color": "#FFFFFF"}, # White
    "3Dアイソメトリック (3D Isometric)": {"icon": "🧊", "color": "#DBEAFE"}, # Blue
    "コミック・ストーリー (Comic Style)": {"icon": "💬", "color": "#FCE7F3"}, # Pink
    "クレイ・3D (Clay 3D)": {"icon": "🧸", "color": "#FFEDD5"}, # Orange
    "ピクセル・レトロ (Pixel Retro)": {"icon": "🕹️", "color": "#DCFCE7"}, # Green
    "アーティスティック (Watercolor)": {"icon": "🎨", "color": "#FEF9C3"} # Yellow
}


# ==========================================
# 2. Header & Settings & History
# ==========================================

col_header, col_tools = st.columns([8, 1.5])

with col_header:
    # Check if logo exists and display it
    try:
        st.image("logo.png", width=300) # Adjust width as needed
    except:
        if st.session_state.phase == "input":
            st.title("ブループリントエンジン24")
        else:
            st.write("### ブループリントエンジン24")

with col_tools:
    # Use columns for icons
    c_hist, c_conf = st.columns(2)
    
    # --- History Popover (Clock Icon) ---
    with c_hist:
        with st.popover("🕒", use_container_width=True):
            st.markdown("### 📜 履歴 (History)")
            history_items = history_utils.get_history_list()
            if not history_items:
                st.caption("履歴はありません")
            
            for item in history_items:
                ts = item['timestamp']
                formatted_ts = f"{ts[4:6]}/{ts[6:8]} {ts[9:11]}:{ts[11:13]}"
                
                # Use a container for each item
                with st.container():
                    st.markdown(f"**{formatted_ts}**")
                    st.caption(f"{item['title'][:15]}...")
                    if st.button("復元", key=f"hist_{item['id']}", use_container_width=True):
                        if history_utils.load_session(item['id']):
                            st.success("読み込み完了")
                            st.rerun()
                    st.divider()

    # --- Settings Popover (Gear Icon) ---
    with c_conf:
        with st.popover("⚙️", use_container_width=True):
            st.subheader("設定")
            
            # API Key Management
            new_key = st.text_input("Gemini APIキー", type="password", value=st.session_state.api_key)
            if new_key != st.session_state.api_key:
                st.session_state.api_key = new_key
                st.rerun()

            # Reset Button
            if st.button("完全にリセット", use_container_width=True):
                st.session_state.clear()
                st.rerun()

            st.markdown("---")
            st.caption("AIモデル設定")

            # Models
            fetched = []
            if st.session_state.api_key:
                fetched = get_available_models(st.session_state.api_key)
            
            default_txt = ["gemini-2.5-pro", "gemini-3-pro-preview", "gemini-2.5-flash"]
            opts_txt = sorted(fetched) if fetched else default_txt
            
            opts_img = ["nano-banana-pro-preview", "gemini-3-pro-image-preview", "gemini-2.5-flash-image", "gemini-2.0-flash-exp"]

            # Selection Logic
            curr_t = st.session_state.selected_text_model
            if curr_t not in opts_txt: curr_t = opts_txt[0]
            st.session_state.selected_text_model = st.selectbox("推論モデル (テキスト)", opts_txt, index=opts_txt.index(curr_t))

            curr_i = st.session_state.selected_image_model
            if curr_i not in opts_img: curr_i = opts_img[0]
            st.session_state.selected_image_model = st.selectbox("描画モデル (画像)", opts_img, index=opts_img.index(curr_i))

            # Update Fallbacks
            st.session_state.fallback_list_text = [st.session_state.selected_text_model] + [m for m in opts_txt if m != st.session_state.selected_text_model]
            st.session_state.fallback_list_image = [st.session_state.selected_image_model] + [m for m in opts_img if m != st.session_state.selected_image_model]


# ==========================================
# 3. Main Workflow
# ==========================================

# --- Step 1: Input ---
if st.session_state.phase == "input":
    render_progress_bar(1)
    
    st.markdown("### 複雑を、美しく。あなたの頭脳のもう一つの設計エンジン。")
    st.markdown("""
    **Blueprint Engine** は、あなたの思考を“構造化された設計図”として瞬時に可視化するための知的エンジンです。
    複雑な情報を理解し、要点を抽出し、最適な形式で図解・体系へと変換します。

    企画・戦略・構造設計・教育資料・フレームワーク設計など、従来数時間かかっていた整理作業を数秒へ。
    人間の論理思考とAIの構造化能力を融合させ、誰でも即座に「伝わる図解」を作れる世界を実現します。
    """)
    
    with st.expander("詳細な機能紹介"):
        st.markdown("""
        **Blueprint Engine** は、ビジネス文脈で求められる高度な「構造化」「図解化」「体系設計」を自動で行う生成ツールです。
        入力された文章・情報・メモから、最適な形式のブループリント（設計図）を瞬時に生成します。
        
        階層構造図、KPIツリー、業務フロー、戦略マップ、要因分解、スキーム図など、多様なビジネスフレームに対応。
        
        シンプルな指示だけで、
        ・論理が一貫した構造
        ・美しいインフォグラフィック
        ・そのまま顧客提案に使える完成度
        が整います。
        
        「説明が伝わらない」「考えを整理する時間がない」「資料作成に時間が取られる」
        そんな課題を解消し、あなたの知的生産性を最大化します。
        """)
    st.markdown("---")
    
    with st.container():
        st.subheader("01. 図解したい内容を入力")
        input_text = st.text_area(
            "メモ・アイデア・記事本文", 
            height=200, 
            placeholder="ここにインフォグラフィック化したいテキストを入力...\n\n例：\n・最新のマーケティングトレンド比較（A案 vs B案）\n・美味しいコーヒーの淹れ方 4ステップ\n・プロジェクトの進捗報告まとめ"
        )
        
        # New Image Upload Section
        st.markdown("---")
        col_lbl, col_check = st.columns([3, 2])
        with col_lbl:
            st.markdown("##### 📸 参考画像・キャラクター (任意)")
        with col_check:
            is_ref_mandatory = st.checkbox("画像・キャラを必須にする", value=getattr(st.session_state, "is_ref_mandatory", False))
            
        uploaded_files = st.file_uploader(
            "参考画像", 
            type=["png", "jpg", "jpeg", "webp"], 
            accept_multiple_files=True,
            label_visibility="collapsed"
        )
        st.caption("※最大4枚。ドラフト作成と最終デザインの両方に反映されます。")

        # Detailed Settings
        with st.expander("▶ 詳細設定（構造タイプ・追加指示）を開く"):
            archetype = st.selectbox("図解の構造タイプ (任意)", ARCHETYPES)
            additional_inst = st.text_area(
                "追加の指示 (任意)", 
                height=100, 
                placeholder="例：配色は青を基調に、文字は少なめに...",
                value=getattr(st.session_state, "additional_inst", "")
            )

    if st.button("構造化を開始する (Step 1)", type="primary"):
        if not st.session_state.api_key:
            st.error("右上 ⚙️ からAPIキーを入力してください")
        else:
            with st.spinner("解析中..."):
                # Save Inputs
                st.session_state.is_ref_mandatory = is_ref_mandatory
                st.session_state.additional_inst = additional_inst
                
                # Process Images
                pil_images = []
                if uploaded_files:
                    for f in uploaded_files:
                        try:
                            pil_images.append(Image.open(f))
                        except: pass
                    st.session_state.ref_images = pil_images
                
                # Construct Prompt
                base_prompt_text = f"""
                あなたは優秀な情報デザイナーです。以下のテキストを可視化・図解するための構成案を作成し、
                **JSON形式のみ** で出力してください。
                
                【テキスト】
                {input_text}
                
                【指定構造】
                {archetype}

                【追加指示】
                {additional_inst}
                """
                
                if st.session_state.ref_images:
                     base_prompt_text += "\n\n【参考画像】\n添付された画像を参考に、その雰囲気や構造要素を取り入れてください。"
                     is_madatory_str = "必須" if is_ref_mandatory else "任意"
                     base_prompt_text += f"\n(画像の要素反映は「{is_madatory_str}」です)"

                base_prompt_text += f"""
                
                【出力JSON】
                {{
                    "main_title": "タイトル",
                    "summary": "要約(1文)",
                    "recommended_style": "デザイン指示",
                    "archetype_name": "{archetype}",
                    "steps": [
                        {{ "label": "見出し", "visual_desc": "絵の指示" }}
                    ]
                }}
                """

                # Prepare Content
                content = [base_prompt_text]
                if st.session_state.ref_images:
                    content.extend(st.session_state.ref_images)

                try:
                    res, used = generate_with_fallback(st.session_state.fallback_list_text, content)
                    cleaned = res.text.replace("```json", "").replace("```", "").strip()
                    st.session_state.draft_data = json.loads(cleaned)
                    st.session_state.phase = "struct"
                    st.rerun()
                except Exception as e:
                    st.error(f"Error: {e}")

# --- Step 2: Structure ---
elif st.session_state.phase == "struct":
    render_progress_bar(2)
    st.subheader("02. 構成案の確認・編集")
    
    # Show Reference Images if any
    if "ref_images" in st.session_state and st.session_state.ref_images:
        st.markdown("""
        <div style="background-color: rgba(30, 58, 138, 0.3); border: 1px solid rgba(96, 165, 250, 0.5); border-radius: 8px; padding: 12px; margin-bottom: 20px;">
            <div style="font-weight: 600; color: #BFDBFE; margin-bottom: 8px;">📸 適用中の参考画像</div>
            <div style="font-size: 0.85rem; color: #93C5FD; margin-bottom: 8px;">※画像を変更するにはStep 1に戻ってください。</div>
        </div>
        """, unsafe_allow_html=True)
        
        # Use more columns to make images smaller (thumbnails)
        cols = st.columns(6)
        for idx, img in enumerate(st.session_state.ref_images):
            if idx < 6:
                with cols[idx]:
                    st.image(img, use_container_width=True)
        st.markdown("---")

    data = st.session_state.draft_data

    # Retake
    with st.expander("💬 構成修正 (AI)"):
        col_r1, col_r2 = st.columns([4, 1])
        retake_instr = col_r1.text_input("修正指示")
        if col_r2.button("再生成"):
            try:
                p = f"修正指示: {retake_instr}\n現在のJSON: {json.dumps(data, ensure_ascii=False)}"
                res, _ = generate_with_fallback(st.session_state.fallback_list_text, p)
                st.session_state.draft_data = json.loads(res.text.replace("```json", "").replace("```", "").strip())
                st.rerun()
            except: st.error("Failed")

    # Form
    new_title = st.text_input("タイトル", value=data.get("main_title", ""))
    new_summary = st.text_input("サブタイトル", value=data.get("summary", ""))
    data["main_title"] = new_title
    data["summary"] = new_summary

    updated_steps = []
    for i, step in enumerate(data.get("steps", [])):
        with st.expander(f"Step {i+1}", expanded=True):
            l = st.text_input(f"見出し {i+1}", value=step['label'])
            v = st.text_input(f"指示 {i+1}", value=step['visual_desc'])
            updated_steps.append({"label": l, "visual_desc": v})
    data["steps"] = updated_steps
    
    col1, col2 = st.columns([1,1])
    if col1.button("戻る", type="secondary"):
        st.session_state.phase = "input"
        st.rerun()
    if col2.button("ドラフト作成 →", type="primary"):
        steps_str = "\n".join([f"{i+1}. {s['label']}: {s['visual_desc']}" for i, s in enumerate(updated_steps)])
        st.session_state.final_prompt = f"Title: {new_title}\nSummary: {new_summary}\nStyle: {data.get('recommended_style')}\nStructure: {data.get('archetype_name')}\nSteps:\n{steps_str}\nTarget Language: Japanese."
        st.session_state.phase = "draft"
        st.session_state.needs_draft_gen = True
        st.rerun()

# --- Step 3: Draft ---
elif st.session_state.phase == "draft":
    render_progress_bar(3)
    st.subheader("03. レイアウト確認")
    
    if st.session_state.needs_draft_gen:
        with st.spinner("ラフスケッチ生成中..."):
            try:
                base = st.session_state.final_prompt
                fb = f" Fix layout: {st.session_state.layout_feedback}" if st.session_state.layout_feedback else ""
                override = " [DRAFT MODE] Simple Black & White sketch wireframe."
                
                # Construct Content with Images
                prompt_content = [base + fb + override]
                if "ref_images" in st.session_state and st.session_state.ref_images:
                    prompt_content.extend(st.session_state.ref_images)
                    if getattr(st.session_state, "is_ref_mandatory", False):
                        prompt_content[0] += "\n\nIMPORTANT: You MUST include the character/style from the attached reference images in this draft sketch."
                
                res, _ = generate_with_fallback(st.session_state.fallback_list_image, prompt_content)
                st.session_state.draft_image = parse_image_response(res)
                st.session_state.needs_draft_gen = False
            except Exception as e: st.error(str(e))

    if st.session_state.draft_image:
        st.image(st.session_state.draft_image, caption="Draft", use_container_width=True)

    col_f1, col_f2 = st.columns([4, 1])
    layout_fb = col_f1.text_input("レイアウト修正指示")
    if col_f2.button("再生成"):
        st.session_state.layout_feedback = layout_fb
        st.session_state.needs_draft_gen = True
        st.rerun()
    
    st.markdown("---")
    if st.button("次へ (デザイン選択)", type="primary"):
        st.session_state.phase = "design"
        st.rerun()

# --- Step 4: Final Design (Recraft Grid Style) ---
elif st.session_state.phase == "design":
    render_progress_bar(4)
    st.subheader("04. デザインスタイル選択")

    # Grid Layout: 5 Columns for compact view
    style_keys = list(STYLE_PROMPTS.keys())
    cols = st.columns(5)
    
    for i, style_name in enumerate(style_keys):
        col = cols[i % 5]
        with col:
            # Metadata
            meta = STYLE_ICONS.get(style_name, {"icon": "🎨", "color": "#F3F4F6"})
            icon_char = meta["icon"]
            bg_color_hex = meta["color"]
            
            # Selection State
            is_selected = (style_name == st.session_state.selected_style_key)
            
            # Compact Card Styles (Light Mode)
            border = "2px solid #2563EB" if is_selected else "1px solid #CBD5E1"
            card_bg = "rgba(239, 246, 255, 0.9)" if is_selected else "rgba(255, 255, 255, 0.6)"
            opacity = "1.0" if is_selected else "0.8"
            text_color = "#1E40AF" if is_selected else "#475569"
            
            with st.container():
                st.markdown(f"""
                <div style="border: {border}; border-radius: 8px; padding: 8px; background-color: {card_bg}; margin-bottom: 4px; opacity: {opacity}; cursor: pointer; text-align: center;">
                    <div style="
                        background-color: {bg_color_hex}; 
                        width: 100%; 
                        height: 40px; 
                        border-radius: 6px; 
                        display: flex; 
                        align-items: center; 
                        justify-content: center; 
                        font-size: 1.2rem; 
                        margin-bottom: 4px;">
                        {icon_char}
                    </div>
                    <div style="font-weight: 600; font-size: 0.75rem; color: {text_color}; line-height: 1.2;">
                        {style_name.split('(')[0]}
                    </div>
                </div>
                """, unsafe_allow_html=True)
                
                # Selection Button
                label = "選択中" if is_selected else "選択"
                btn_type = "primary" if is_selected else "secondary"
                if st.button(label, key=f"btn_{i}", type=btn_type, use_container_width=True):
                    st.session_state.selected_style_key = style_name
                    st.rerun()

    st.markdown("---")
    
    # Generate Section
    st.markdown(f"#### 🎨 選択中のスタイル: **{st.session_state.selected_style_key.split('(')[0]}**")
    
    col1, col2 = st.columns([1,1])
    with col1:
        if st.button("🚀 完成画像を生成する", type="primary", use_container_width=True):
            with st.spinner(f"「{st.session_state.selected_style_key}」で清書中..."):
                try:
                    base = st.session_state.final_prompt
                    style_instr = STYLE_PROMPTS[st.session_state.selected_style_key]
                    prompt_text = f"{base}\n[FINAL STYLE] {style_instr}\nHigh Quality Render."
                    
                    # Construct Content with Images
                    prompt_content = [prompt_text]
                    if "ref_images" in st.session_state and st.session_state.ref_images:
                        prompt_content.extend(st.session_state.ref_images)
                        # Add emphasis if mandatory
                        if getattr(st.session_state, "is_ref_mandatory", False):
                             prompt_content[0] += "\n\nCRITICAL: The character/object from the reference images MUST appear in the final output as the main subject."

                    res, used = generate_with_fallback(st.session_state.fallback_list_image, prompt_content)
                    st.session_state.final_image = parse_image_response(res)
                    
                    # Auto Save
                    history_utils.save_session(st.session_state, st.session_state.final_image)
                    
                    st.balloons()
                except Exception as e: st.error(str(e))
    with col2:
        if st.button("最初に戻る", use_container_width=True):
            st.session_state.phase = "input"
            st.rerun()

    # Final Image & Download & Back Navigation
    if "final_image" in st.session_state and st.session_state.final_image:
        st.success("✅ 生成が完了しました")
        st.image(st.session_state.final_image, caption="Final Output", use_container_width=True)
        
        # --- Refinement Section ---
        st.markdown("### 🛠️ 仕上がりを微調整")
        with st.container():
            st.caption("現在のスタイルと構成を保ちながら、ディテールを修正します。")
            col_ref1, col_ref2 = st.columns([4, 1])
            refine_inst = col_ref1.text_input("修正指示", placeholder="例：背景を暗くして / テキストをもっと大きく / 全体的に青っぽく", key="refine_input")
            
            if col_ref2.button("修正を実行", type="primary"):
                with st.spinner("修正中..."):
                    try:
                        base = st.session_state.final_prompt
                        style_instr = STYLE_PROMPTS[st.session_state.selected_style_key]
                        # Append modification instruction
                        prompt_text = f"{base}\n[FINAL STYLE] {style_instr}\n[MODIFICATION] {refine_inst}\nHigh Quality Render."
                        
                        # Construct Content with Images (Reuse logic)
                        prompt_content = [prompt_text]
                        if "ref_images" in st.session_state and st.session_state.ref_images:
                            prompt_content.extend(st.session_state.ref_images)
                            if getattr(st.session_state, "is_ref_mandatory", False):
                                 prompt_content[0] += "\n\nCRITICAL: The character/object from the reference images MUST appear in the final output as the main subject."

                        res, used = generate_with_fallback(st.session_state.fallback_list_image, prompt_content)
                        st.session_state.final_image = parse_image_response(res)
                        
                        # Auto Save
                        history_utils.save_session(st.session_state, st.session_state.final_image)
                        st.rerun()
                    except Exception as e: st.error(str(e))
        # --------------------------

        st.markdown("### 画像を保存")
        col_dl1, col_dl2 = st.columns([1, 2])
        
        with col_dl1:
            fmt = st.radio("保存形式", ["PNG", "JPEG"], horizontal=True)
        
        with col_dl2:
            buf = io.BytesIO()
            img_to_save = st.session_state.final_image.copy()
            
            if fmt == "PNG":
                mime_type = "image/png"
                ext = "png"
                img_to_save.save(buf, format="PNG")
            else:
                mime_type = "image/jpeg"
                ext = "jpg"
                if img_to_save.mode in ("RGBA", "P"):
                    img_to_save = img_to_save.convert("RGB")
                img_to_save.save(buf, format="JPEG", quality=95)
                
            byte_im = buf.getvalue()
            
            st.download_button(
                label=f"📥 画像をダウンロード (. {ext})",
                data=byte_im,
                file_name=f"scheme_maker_output.{ext}",
                mime=mime_type,
                type="primary",
                use_container_width=True
            )
        
        st.markdown("---")
        st.markdown("### 他のスタイルで試す・やり直す")
        col_back1, col_back2, col_back3 = st.columns(3)
        with col_back1:
             if st.button("📝 テキスト/構成を直す", use_container_width=True):
                 st.session_state.phase = "struct"
                 st.rerun()
        with col_back2:
             if st.button("📐 レイアウト(ドラフト)を直す", use_container_width=True):
                 st.session_state.phase = "draft"
                 st.rerun()
        with col_back3:
             if st.button("🚀 最初から作り直す", use_container_width=True):
                 st.session_state.phase = "input"
                 st.session_state.clear()
                 st.rerun()
