"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Settings, Clock, Check, ChevronRight, RotateCcw, Download, Upload, Image as ImageIcon, Copy, Search, Edit3 } from 'lucide-react';
import { ARCHETYPES, STYLE_PROMPTS, STYLE_ICONS } from '@/lib/constants';
import Image from 'next/image';

// Types
type Phase = 'input' | 'struct' | 'draft' | 'design';

interface DraftData {
  main_title?: string;
  summary?: string;
  recommended_style?: string;
  archetype_name?: string;
  steps?: { label: string; visual_desc: string }[];
}

interface HistoryItem {
  id: string;
  timestamp: number;
  finalImage: string;
  main_title: string;
  summary: string;
  finalPrompt: string;
  draftData: DraftData;
}

export default function Home() {
  // Session State
  const [phase, setPhase] = useState<Phase>('input');
  const [apiKey, setApiKey] = useState('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false); // Collapsible Instructions State
  const [isPromptEditOpen, setIsPromptEditOpen] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  // Input Phase
  const [inputText, setInputText] = useState('');
  const [archetype, setArchetype] = useState(ARCHETYPES[0]);
  const [additionalInst, setAdditionalInst] = useState('');
  const [refImages, setRefImages] = useState<{ data: string, mimeType: string }[]>([]);
  const [isRefMandatory, setIsRefMandatory] = useState(false);
  const [targetLanguage, setTargetLanguage] = useState('Japanese');

  // Struct Phase
  const [draftData, setDraftData] = useState<DraftData>({});
  const [retakeInstr, setRetakeInstr] = useState('');

  // Draft/Design Phase
  const [finalPrompt, setFinalPrompt] = useState('');
  const [draftImage, setDraftImage] = useState<string | null>(null);
  const [layoutFeedback, setLayoutFeedback] = useState('');
  const [selectedStyle, setSelectedStyle] = useState('ビジネス・プロ (Business Pro)');
  const [finalImage, setFinalImage] = useState<string | null>(null);
  const [refineInst, setRefineInst] = useState('');

  // Step 2 Extended (Draft Prompt Edit)
  const [isDraftPromptEditOpen, setDraftPromptEditOpen] = useState(false);
  const [manualDraftPrompt, setManualDraftPrompt] = useState('');

  // Loading States
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');

  // Load History on Mount
  useEffect(() => {
    const saved = localStorage.getItem('scheme_maker_history');
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse history", e);
      }
    }
  }, []);

  // --- Helpers ---
  const saveToHistory = (imageUrl: string, prompt: string) => {
    const newItem: HistoryItem = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      finalImage: imageUrl,
      main_title: draftData.main_title || '無題',
      summary: draftData.summary || '',
      finalPrompt: prompt,
      draftData: draftData
    };
    const newHistory = [newItem, ...history];
    setHistory(newHistory);
    localStorage.setItem('scheme_maker_history', JSON.stringify(newHistory));
  };

  const deleteHistory = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('この履歴を削除しますか？')) return;
    const newHistory = history.filter(item => item.id !== id);
    setHistory(newHistory);
    localStorage.setItem('scheme_maker_history', JSON.stringify(newHistory));
  };

  const loadHistoryItem = (item: HistoryItem) => {
    if (!confirm('現在の作業内容は上書きされます。よろしいですか？')) return;
    setFinalImage(item.finalImage);
    setFinalPrompt(item.finalPrompt);
    setDraftData(item.draftData);
    setPhase('design');
    setIsHistoryOpen(false);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      files.forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64String = (reader.result as string).split(',')[1];
          setRefImages(prev => [...prev, { data: base64String, mimeType: file.type }]);
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const convertBlobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
  }

  // --- Helpers for Prompts ---
  const constructDraftPrompt = () => {
    const stepsStr = draftData.steps?.map((s: any, i: number) => `    ${i + 1}. **${s.label}**: ${s.visual_desc}`).join('\n') || "";

    const charRef = refImages.length > 0 ? "Reference images provided. capture the style/character from input images." : "なし";

    let langInstruction = targetLanguage === 'Japanese'
      ? "図中のテキストラベルは**すべて日本語**で記述すること（Example: 「Water」ではなく「給水タンク」）。"
      : `All text labels inside the image MUST be in **${targetLanguage}**.`;

    return `
**役割:** 熟練したインフォグラフィックデザイナー
**目的:** ${draftData.main_title}に基づいた明確で美しいインフォグラフィックのラフスケッチ生成

**1. テーマとスタイルの定義**
* **メインタイトル:** ${draftData.main_title}
* **概要・目的:** ${draftData.summary}
* **言語指定:** ${langInstruction}
* **推奨スタイル:** ${draftData.recommended_style || 'モダンで清潔感のあるベクターイラスト'}

**2. 構造の定義 (Structural Archetype)**
* **採用する構造:** ${draftData.archetype_name}

**3. キャラクター参照 (Character Reference)**
* ${charRef}

**4. コンテンツのマッピング (Content Mapping)**
* **ヘッダーエリア:** タイトル「${draftData.main_title}」を上部に配置。
* **メイン構造ブロック:** 以下の順序でイラストと日本語ラベルを配置し、矢印でつなぐ。
${stepsStr}
* **フッターエリア:** 特になし。全体をスッキリとまとめる。

【重要】これは最終的なデザインではなく、あくまで「ラフスケッチ」です。
* 線画、または非常にシンプルな塗り分けで構成してください。
* 色は最小限に抑え、構造と配置が明確にわかるようにしてください。
* テキストはプレースホルダーで構いませんが、配置は正確に。
* 複雑なテクスチャや詳細な描写は不要です。
`;
  };

  const handleDraftPromptEditToggle = () => {
    if (!isDraftPromptEditOpen && !manualDraftPrompt) {
      setManualDraftPrompt(constructDraftPrompt());
    }
    setDraftPromptEditOpen(!isDraftPromptEditOpen);
  };

  // --- API Calls ---

  // Step 1: Generate Structure
  const generateStructure = async () => {
    // Allow empty key - backend will check env var
    if (!apiKey && inputText.length < 5) { setIsSettingsOpen(true); return; }

    setLoading(true);
    setLoadingMessage("解析中... (構造化)");
    try {
      const prompt = `
            あなたはプロの編集者です。以下のテキストをインフォグラフィックにするための構成案を作成し、
            **JSON形式のみ** で出力してください。
            Markdownのコードブロックは使わず、純粋なJSON文字列のみを返してください。

            【入力テキスト】
            ${inputText}

            【指定構造】
            ${archetype}

            【出力言語 (Output Language)】
            ${targetLanguage}
            ※重要: 入力が何語であっても、出力JSONの"label"（図中の文字）や"summary"は、必ず「${targetLanguage}」に翻訳・統一してください。

            ${additionalInst ? `【追加指示】\n${additionalInst}` : ''}
            ${refImages.length > 0 ? `\n【参考画像あり】\n画像を参考に、その雰囲気や構造要素を取り入れてください。(画像の要素反映は「${isRefMandatory ? "必須" : "任意"}」です)` : ""}

            【出力JSONフォーマット】
            {
                "main_title": "タイトル",
                "summary": "この図解の目的・概要（1文で）",
                "recommended_style": "この内容に最適な具体的なデザインスタイル指示（例：清潔感のあるモダンなベクターイラスト。配色は...）",
                "archetype_name": "${archetype}",
                "steps": [
                    {
                        "label": "ステップ名（例：1. 給水タンク）",
                        "visual_desc": "具体的な絵の指示（例：水の入ったタンク）"
                    }
                ]
            }
            `;

      const res = await fetch('/api/generate-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey, prompt })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      let jsonStr = data.text.replace(/```json/g, '').replace(/```/g, '').trim();
      setDraftData(JSON.parse(jsonStr));
      setPhase('struct');
    } catch (e: any) {
      alert(`Error: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Update Structure (Retake)
  const updateStructure = async () => {
    // apiKey check handled by backend fallback if empty
    setLoading(true);
    try {
      const prompt = `
            現在の構成データに対して、ユーザーの修正指示を反映した新しいJSONを作成してください。

            【現在のデータ】
            ${JSON.stringify(draftData)}

            【ユーザーの修正指示】
            ${retakeInstr}

            【制約】
            出力言語は引き続き「${targetLanguage}」を維持してください。
            
            【出力】
            修正後のJSONのみを出力してください。Markdownタグ不要。
            `;
      const res = await fetch('/api/generate-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey, prompt })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      let jsonStr = data.text.replace(/```json/g, '').replace(/```/g, '').trim();
      setDraftData(JSON.parse(jsonStr));
      setRetakeInstr('');
    } catch (e: any) { alert(e.message); }
    finally { setLoading(false); }
  };

  // Step 3: Generate Draft
  const generateDraft = async () => {
    if (!apiKey) {
      setIsSettingsOpen(true);
      return;
    }
    setLoading(true);
    setPhase('draft'); // Move to draft view immediately to show loading

    try {
      let final_prompt_text = "";

      if (isDraftPromptEditOpen && manualDraftPrompt) {
        // USE MANUAL PROMPT
        final_prompt_text = manualDraftPrompt;
      } else {
        final_prompt_text = constructDraftPrompt();
      }

      setLoadingMessage("ラフスケッチ生成中...");

      // Update finalPrompt state for next step editing
      setFinalPrompt(final_prompt_text);

      const res = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: final_prompt_text,
          apiKey: apiKey,
          refImages: refImages // Ensure refImages are passed
        })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      if (data.type === 'image') {
        setDraftImage(`data:${data.mimeType};base64,${data.data}`);
      } else if (data.type === 'svg') {
        setDraftImage(`data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(data.content)))}`);
      } else {
        alert("モデルが画像を返しませんでした。テキスト: " + data.content.substring(0, 50) + "...");
      }
      setPhase('draft');
    } catch (e: any) { alert(e.message); }
    finally { setLoading(false); }
  };

  // Step 4: Final Generation
  const generateFinal = async (isRefine = false) => {
    if (!apiKey) { setIsSettingsOpen(true); return; }
    setLoading(true);
    setLoadingMessage(isRefine ? "微調整中..." : "清書中... (高品質生成)");

    try {
      let promptToUse = "";

      // 1. Determine Prompt Source
      if (isRefine) {
        promptToUse = `
The user wants to refine the previous image based on this feedback: "${refineInst}".
Keep the original composition but apply the correction.
original_prompt: ${finalPrompt}
            `;
      } else {
        // If manual prompt edit is OPEN, use that.
        if (isPromptEditOpen && finalPrompt) {
          promptToUse = finalPrompt;
        } else {
          // Otherwise construct standard Final Prompt
          const styleP = STYLE_PROMPTS[selectedStyle] || "";
          // Use draftData if available, else fallback
          const mainTitle = draftData.main_title || "Untitled";

          let langInstruction = targetLanguage === 'Japanese'
            ? "Ensure all text labels properly rendered in valid Japanese characters."
            : `Ensure all text labels are in **${targetLanguage}**.`;

          promptToUse = `
**Role:** Expert Infographic Illustrator
**Goal:** Create a polished, high-quality infographic based on the signed-off draft logic.

**Visual Style:** ${selectedStyle.split('(')[0]}
${styleP}

**Content Requirements:**
* **Title:** ${mainTitle}
* **Language:** ${langInstruction}
* **Structure:** Follow the 'Content Mapping' strictly.

**Technical Constraints:**
* Aspect Ratio: 3:4 (Vertical) or 16:9 (if requested) - Optimized for SNS.
* Text: Must be legible, distinct from background.
* Output: High Fidelity, rich colors, professional finish.

${draftData.summary ? `**Context:** ${draftData.summary}` : ""}
`;
          // Also update the finalPrompt state so user sees it in "Advanced" if they open it
          setFinalPrompt(promptToUse);
        }
      }

      const res = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: promptToUse,
          apiKey: apiKey,
          refImages: isRefine ? [] : (draftImage ? [{ data: draftImage.split(',')[1], mimeType: "image/png" }] : []) // Use draft as ref for final if possible, or just raw prompt
          // Note: For pure Gemini 1.5 Pro image gen, structure adherence from image input is tricky.
          // Better strategy: Just use the strong prompt + style. We pass draftImage just in case model supports it.
        })
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error);

      let resultUrl = "";
      if (data.type === 'image') {
        resultUrl = `data:${data.mimeType};base64,${data.data}`;
        setFinalImage(resultUrl);
      } else {
        alert("Error format");
      }

      // Auto Save to History
      if (resultUrl) {
        saveToHistory(resultUrl, promptToUse);
      }

      setPhase('design');

    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };


  // --- Render Logic ---
  const ProgressBar = () => {
    const steps = [
      { id: 'input', label: '01. 入力' },
      { id: 'struct', label: '02. 構成' },
      { id: 'draft', label: '03. ドラフト' },
      { id: 'design', label: '04. デザイン' },
    ];

    // Define order for index comparison
    const phaseOrder = ['input', 'struct', 'draft', 'design'];
    const currentPhaseIdx = phaseOrder.indexOf(phase);

    return (
      <div className="flex w-full justify-between items-center bg-white/70 backdrop-blur-md rounded-xl p-3 border border-slate-200 shadow-sm mb-6">
        {steps.map((s, idx) => {
          const isActive = phase === s.id;
          const isPast = idx < currentPhaseIdx;
          const isClickable = isPast; // Only allow going back

          return (
            <div
              key={s.id}
              onClick={() => isClickable && setPhase(s.id as any)}
              className={`flex-1 text-center py-2 rounded-lg text-sm font-semibold transition-all
                ${isActive ? 'shadow-md' : ''}
                ${isClickable ? 'cursor-pointer hover:bg-slate-100 text-slate-600' : isActive ? '' : 'text-slate-300 cursor-not-allowed'}`}
              style={{
                backgroundColor: isActive ? '#2563EB' : 'transparent',
                color: isActive ? '#ffffff' : undefined
              }}
            >
              {s.label}
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-[#F8FAFC] font-sans text-slate-800 pb-20">

      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-blue-600 to-indigo-600 text-white w-8 h-8 rounded-lg flex items-center justify-center font-bold text-lg shadow-blue-500/30 shadow-lg">
              B
            </div>
            <h1 className="font-bold text-xl tracking-tight bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
              ブループリントエンジン24
            </h1>
          </div>
          <div className="flex gap-4">
            <button
              onClick={() => setIsHistoryOpen(true)}
              className="p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-all"
              title="履歴"
            >
              <Clock className="w-6 h-6" />
            </button>
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-all"
              title="設定"
            >
              <Settings className="w-6 h-6" />
            </button>
          </div>
        </div>
      </header>

      {/* History Modal */}
      {isHistoryOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex justify-end transition-opacity">
          <div className="w-96 bg-white h-full shadow-2xl p-6 overflow-y-auto animate-in slide-in-from-right duration-300">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-500" /> 生成履歴
              </h2>
              <button onClick={() => setIsHistoryOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            {history.length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-10">履歴はまだありません。</p>
            ) : (
              <div className="space-y-4">
                {history.map(item => (
                  <div key={item.id} className="group relative bg-slate-50 rounded-xl overflow-hidden border border-slate-200 hover:border-blue-400 transition-all cursor-pointer" onClick={() => loadHistoryItem(item)}>
                    <div className="aspect-video bg-slate-200 relative">
                      <img src={item.finalImage} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                    </div>
                    <div className="p-3">
                      <h3 className="font-bold text-sm text-slate-800 truncate mb-1">{item.main_title}</h3>
                      <p className="text-xs text-slate-500">{new Date(item.timestamp).toLocaleString()}</p>
                    </div>
                    <button
                      onClick={(e) => deleteHistory(item.id, e)}
                      className="absolute top-2 right-2 bg-white/80 p-1.5 rounded-full text-red-500 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white"
                      title="削除"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Settings Modal - Keep as is but ensure close handler */}
      {isSettingsOpen && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Settings className="w-5 h-5 text-slate-500" /> API設定
            </h2>
            <p className="text-sm text-slate-500 mb-4">
              Google Gemini APIキーを入力してください。<br />
              <span className="text-xs text-slate-400">※ブラウザに保存され、サーバーには保存されません。</span>
            </p>
            <input
              type="password"
              placeholder="AIzaSy..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="w-full border border-slate-300 rounded-lg p-3 mb-6 focus:ring-2 focus:ring-blue-500 outline-none font-mono text-sm"
            />
            <button
              onClick={() => setIsSettingsOpen(false)}
              className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              設定を保存して閉じる
            </button>
            <div className="mt-4 text-center">
              <a href="https://aistudio.google.com/app/apikey" target="_blank" className="text-xs text-blue-500 hover:underline">APIキーを取得する (Google AI Studio)</a>
            </div>
          </div>
        </div>
      )}

      <ProgressBar />

      {/* --- PHASE 1: INPUT --- */}
      {phase === 'input' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

          {/* Introduction Section */}
          <div className="bg-slate-50/50 rounded-2xl p-6 border border-slate-100">
            <h2 className="text-2xl font-bold mb-4 text-slate-900 leading-snug">
              複雑を、美しく。あなたの頭脳のもう一つの設計エンジン。
            </h2>
            <div className="space-y-4 text-slate-700 leading-relaxed">
              <p>
                Blueprint Engine は、あなたの思考を“構造化された設計図”として瞬時に可視化するための知的エンジンです。
                複雑な情報を理解し、要点を抽出し、最適な形式で図解・体系へと変換します。
              </p>
              <p>
                企画・戦略・構造設計・教育資料・フレームワーク設計など、従来数時間かかっていた整理作業を数秒へ。
                人間の論理思考とAIの構造化能力を融合させ、誰でも即座に「伝わる図解」を作れる世界を実現します。
              </p>
            </div>

            {/* Collapsible Details */}
            <div className="mt-6">
              <button
                onClick={() => setIsDetailsOpen(!isDetailsOpen)}
                className="flex items-center gap-2 w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium px-4 py-3 rounded-lg transition-colors border-l-4 border-red-400"
              >
                <ChevronRight className={`w-5 h-5 transition-transform ${isDetailsOpen ? 'rotate-90' : ''}`} />
                詳細な機能紹介
              </button>

              {isDetailsOpen && (
                <div className="mt-3 p-4 bg-white rounded-lg border border-slate-100 text-slate-600 space-y-4 text-sm leading-relaxed animate-in fade-in zoom-in-95 duration-200">
                  <p>
                    <span className="font-bold text-slate-800">Blueprint Engine</span> は、ビジネス文脈で求められる高度な「構造化」「図解化」「体系設計」を自動で行う生成ツールです。
                    入力された文章・情報・メモから、最適な形式のブループリント（設計図）を瞬時に生成します。
                  </p>
                  <p>
                    階層構造図、KPIツリー、業務フロー、戦略マップ、要因分解、スキーム図など、多様なビジネスフレームに対応。
                  </p>
                  <p>
                    シンプルな指示だけで、<br />
                    ・論理が一貫した構造<br />
                    ・美しいインフォグラフィック<br />
                    ・そのまま顧客提案に使える完成度<br />
                    が整います。
                  </p>
                  <p>
                    「説明が伝わらない」「考えを整理する時間がない」「資料作成に時間が取られる」
                    そんな課題を解消し、あなたの知的生産性を最大化します。
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur rounded-2xl p-6 border border-blue-100 shadow-sm">
            <h2 className="text-xl font-bold mb-2 text-slate-800">01. 図解したい内容を入力</h2>
            <p className="text-sm text-slate-500 mb-4">テキスト、メモ、アイデアを入力してください。AIが最適な構造に変換します。</p>
            <textarea
              className="w-full h-48 p-4 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none bg-white/90 resize-none font-medium"
              placeholder="例：マーケティング戦略の比較、コーヒーの淹れ方手順..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
            />
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white/80 backdrop-blur rounded-2xl p-6 border border-slate-200">
              <h3 className="flex items-center gap-2 font-bold text-slate-700 mb-4">
                <ImageIcon className="w-5 h-5 text-blue-500" /> 参考画像・キャラクター (任意)
              </h3>
              <div className="flex items-center gap-4 mb-4">
                <label className="cursor-pointer bg-slate-100 hover:bg-slate-200 text-slate-600 px-4 py-2 rounded-lg flex items-center gap-2 transition-colors">
                  <Upload className="w-4 h-4" /> アップロード
                  <input type="file" multiple accept="image/*" className="hidden" onChange={handleImageUpload} />
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-600">
                  <input type="checkbox" checked={isRefMandatory} onChange={(e) => setIsRefMandatory(e.target.checked)} className="rounded text-blue-600" />
                  画像要素を必須にする
                </label>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {refImages.map((img, i) => (
                  <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden border border-slate-200 flex-shrink-0">
                    <img src={`data:${img.mimeType};base64,${img.data}`} className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur rounded-2xl p-6 border border-slate-200 shadow-sm">
              <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2"><Settings className="w-5 h-5 text-slate-400" /> 詳細設定</h3>
              <div className="space-y-4">
                <select value={archetype} onChange={(e) => setArchetype(e.target.value)} className="w-full p-2 rounded-lg border border-slate-200 bg-white/50">
                  {ARCHETYPES.map(a => <option key={a} value={a}>{a}</option>)}
                </select>

                {/* Language Selector */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1 ml-1">出力言語 (Output Language)</label>
                  <select
                    value={targetLanguage}
                    onChange={(e) => setTargetLanguage(e.target.value)}
                    className="w-full p-2 rounded-lg border border-slate-200 bg-white/50 text-sm"
                  >
                    <option value="Japanese">日本語 (Japanese)</option>
                    <option value="English">英語 (English)</option>
                    <option value="Chinese">中国語 (Chinese)</option>
                    <option value="Korean">韓国語 (Korean)</option>
                    <option value="Spanish">スペイン語 (Spanish)</option>
                    <option value="French">フランス語 (French)</option>
                  </select>
                </div>

                <textarea
                  value={additionalInst}
                  onChange={(e) => setAdditionalInst(e.target.value)}
                  placeholder="追加の指示 (例: 青を基調に...)"
                  className="w-full h-20 p-3 rounded-lg border border-slate-200 bg-white/50 text-sm"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <button
              onClick={generateStructure}
              disabled={loading || !inputText}
              className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-blue-500/30 hover:shadow-blue-500/40 hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? '解析中...' : <>構造化を開始する <ChevronRight className="w-5 h-5" /></>}
            </button>
          </div>
        </div>
      )}

      {/* --- PHASE 2: STRUCTURE --- */}
      {phase === 'struct' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="bg-white/90 rounded-2xl p-6 border border-slate-200 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-800">02. 構成案の確認</h2>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="修正指示 (AI)"
                  value={retakeInstr}
                  onChange={(e) => setRetakeInstr(e.target.value)}
                  className="border border-slate-200 rounded-lg px-3 py-1 text-sm w-64"
                />
                <button onClick={updateStructure} disabled={loading} className="text-sm bg-slate-100 hover:bg-slate-200 px-3 py-1 rounded-lg">AI修正</button>
              </div>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-blue-500" /> タイトル (Title)
                </label>
                <input
                  value={draftData.main_title || ''}
                  onChange={(e) => setDraftData({ ...draftData, main_title: e.target.value })}
                  className="w-full text-lg font-bold p-3 border border-slate-300 rounded-lg bg-white shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  placeholder="タイトルを入力..."
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-blue-500" /> 概要・目的 (Summary)
                </label>
                <textarea
                  value={draftData.summary || ''}
                  onChange={(e) => setDraftData({ ...draftData, summary: e.target.value })}
                  className="w-full text-base text-slate-700 p-3 border border-slate-300 rounded-lg bg-white shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all resize-none h-24"
                  placeholder="概要を入力..."
                />
              </div>

              <div className="space-y-4 mt-8">
                <h3 className="font-bold text-slate-800 border-b pb-2 flex items-center gap-2">
                  <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-sm">STEP</span> 構成要素の編集
                </h3>
                {draftData.steps?.map((step: any, idx: number) => (
                  <div key={idx} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex gap-4 items-start">
                      <div className="w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-sm shrink-0 mt-1">
                        {idx + 1}
                      </div>
                      <div className="flex-1 space-y-3">
                        <div>
                          <label className="text-xs font-bold text-slate-500 mb-1 block">ラベル (Label)</label>
                          <input
                            value={step.label}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                              const newSteps = [...(draftData.steps || [])];
                              newSteps[idx].label = e.target.value;
                              setDraftData({ ...draftData, steps: newSteps });
                            }}
                            className="w-full font-bold text-slate-800 p-2 border border-slate-300 rounded-md bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="項目名..."
                          />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-slate-500 mb-1 block">視覚イメージ (Visual Description)</label>
                          <input
                            value={step.visual_desc}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                              const newSteps = [...(draftData.steps || [])];
                              newSteps[idx].visual_desc = e.target.value;
                              setDraftData({ ...draftData, steps: newSteps });
                            }}
                            className="w-full text-sm text-slate-600 p-2 border border-slate-300 rounded-md bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="具体的な絵の指示..."
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Advanced Draft Prompt Editor */}
            <div className="bg-blue-50 p-4 rounded-xl border-2 border-blue-200 mt-8 shadow-md">
              <button
                onClick={handleDraftPromptEditToggle}
                className="flex items-center justify-between w-full text-left font-bold text-slate-700 text-sm hover:text-blue-600 transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Settings className="w-4 h-4 text-slate-400" /> 上級者向け: ドラフト生成プロンプトの編集
                </span>
                <ChevronRight className={`w-4 h-4 transition-transform ${isDraftPromptEditOpen ? 'rotate-90' : ''}`} />
              </button>

              {isDraftPromptEditOpen && (
                <div className="mt-4 animate-in fade-in zoom-in-95 duration-200">
                  <div className="p-3 bg-yellow-50 text-yellow-800 text-xs rounded-lg mb-3 border border-yellow-100 flex gap-2 items-start">
                    <span className="text-lg">⚠️</span>
                    <div>
                      <strong>注意:</strong> こちらを編集・有効化している間は、<strong>上のフォームの内容（タイトル変更など）は無視され</strong>、以下のプロンプトがそのまま使用されます。
                    </div>
                  </div>
                  <textarea
                    value={manualDraftPrompt}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setManualDraftPrompt(e.target.value)}
                    className="w-full h-64 p-3 text-xs font-mono bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none leading-relaxed"
                  />
                </div>
              )}
            </div>
            <div className="flex justify-between pt-6 border-t border-slate-100 mt-6">
              <button onClick={() => setPhase('input')} className="px-6 py-3 text-slate-600 bg-white border border-slate-300 hover:bg-slate-50 rounded-xl font-bold transition-all shadow-sm">
                ← 戻る
              </button>
              <button
                onClick={generateDraft}
                disabled={loading}
                className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-10 py-3 rounded-xl font-bold shadow-lg shadow-blue-500/30 hover:shadow-blue-500/40 hover:-translate-y-0.5 transition-all flex items-center gap-2 disabled:opacity-70 disabled:cursor-wait"
              >
                {loading ? '生成中...' : <>ドラフト作成 <ChevronRight className="w-5 h-5" /></>}
              </button>
            </div>
          </div>
        </div>
      )
      }

      {/* --- PHASE 3: DRAFT --- */}
      {
        phase === 'draft' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid md:grid-cols-2 gap-8">
              {/* Left: Draft Image */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
                <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
                  <Edit3 className="w-5 h-5 text-slate-400" /> ドラフト (ラフ画)
                </h3>
                <div className="flex-1 bg-slate-100 rounded-xl overflow-hidden flex items-center justify-center min-h-[400px]">
                  {draftImage ? (
                    <img src={draftImage} className="max-w-full max-h-full object-contain" />
                  ) : (
                    <div className="text-slate-400">画像なし</div>
                  )}
                </div>
                <div className="mt-4 p-4 bg-yellow-50 border border-yellow-100 rounded-lg text-sm text-yellow-800">
                  💡 <strong>Check:</strong> 配置や矢印の流れは正しいですか？配色はまだ適用されていません。
                </div>

                {/* Layout Feedback */}
                <div className="mt-4">
                  <label className="text-xs font-bold text-slate-500 mb-1 block">レイアウトの修正指示 (ドラフト再生成)</label>
                  <div className="flex gap-2">
                    <input
                      value={layoutFeedback}
                      onChange={(e) => setLayoutFeedback(e.target.value)}
                      placeholder="例: タイトルをもっと大きく、Step1と2を離して..."
                      className="flex-1 p-2 text-sm border border-slate-200 rounded-lg"
                    />
                    <button
                      onClick={generateDraft}
                      disabled={loading}
                      className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-lg text-xs font-bold"
                    >
                      再ドラフト
                    </button>
                  </div>
                </div>
              </div>

              {/* Right: Style & Finalize */}
              <div className="space-y-6">
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
                    <ImageIcon className="w-5 h-5 text-blue-500" /> デザインスタイルの選択
                  </h3>
                  <div className="grid grid-cols-1 gap-3 max-h-[400px] overflow-y-auto pr-2">
                    {Object.keys(STYLE_PROMPTS).map((styleName) => {
                      const meta = STYLE_ICONS[styleName] || { icon: '🎨', color: '#f0f0f0' };
                      return (
                        <div
                          key={styleName}
                          onClick={() => setSelectedStyle(styleName)}
                          className={`p-3 rounded-xl border-2 cursor-pointer transition-all flex items-center gap-3 ${selectedStyle === styleName
                            ? 'border-blue-500 bg-blue-50/50'
                            : 'border-slate-100 hover:border-blue-200'
                            }`}
                        >
                          <div className="w-10 h-10 rounded-lg flex items-center justify-center text-xl" style={{ backgroundColor: meta.color }}>
                            {meta.icon}
                          </div>
                          <div>
                            <div className={`font-bold text-sm ${selectedStyle === styleName ? 'text-blue-700' : 'text-slate-700'}`}>
                              {styleName}
                            </div>
                          </div>
                          {selectedStyle === styleName && <Check className="w-5 h-5 text-blue-500 ml-auto" />}
                        </div>
                      ))}
                  </div>
                </div>

                {/* Advanced Prompt Editor */}
                <div className="bg-blue-50 p-4 rounded-2xl border-2 border-blue-200 mt-4 shadow-md">
                  <button
                    onClick={() => setIsPromptEditOpen(!isPromptEditOpen)}
                    className="flex items-center justify-between w-full text-left font-bold text-slate-700 text-sm"
                  >
                    <span className="flex items-center gap-2">
                      <Settings className="w-4 h-4 text-slate-400" /> 上級者向け: プロンプト（指示文）の編集
                    </span>
                    <ChevronRight className={`w-4 h-4 transition-transform ${isPromptEditOpen ? 'rotate-90' : ''}`} />
                  </button>

                  {isPromptEditOpen && (
                    <div className="mt-3 animate-in fade-in zoom-in-95 duration-200">
                      <p className="text-xs text-slate-500 mb-2">
                        ※ここはAIへの最終的な指示文です。自動生成された内容を直接調整したい場合のみ編集してください。
                      </p>
                      <textarea
                        value={finalPrompt}
                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFinalPrompt(e.target.value)}
                        className="w-full h-64 p-3 text-xs font-mono bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none leading-relaxed"
                      />
                    </div>
                  )}
                </div>

                <div className="pt-4">
                  <button
                    onClick={() => generateFinal(false)}
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-blue-600 to-cyan-500 text-white py-4 rounded-xl font-bold shadow-xl shadow-blue-500/20 hover:shadow-blue-500/30 hover:-translate-y-0.5 transition-all text-lg flex justify-center items-center gap-2"
                  >
                    {loading ? '生成中...' : <>デザイン清書を実行 <Download className="w-5 h-5" /></>}
                  </button>
                  <div className="text-center mt-3">
                    <button onClick={() => setPhase('struct')} className="text-slate-400 text-sm hover:text-slate-600">
                      ← 構成に戻る
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      }

      {/* --- PHASE 4: DESIGN & RESULT --- */}
      {
        phase === 'design' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {!finalImage ? (
              <>
                <h2 className="text-xl font-bold text-slate-800 mb-4">04. デザインスタイル選択</h2>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  {Object.keys(STYLE_PROMPTS).map((styleName) => {
                    const meta = STYLE_ICONS[styleName];
                    const isSelected = selectedStyle === styleName;
                    return (
                      <button
                        key={styleName}
                        onClick={() => setSelectedStyle(styleName)}
                        className={`relative p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 text-center
                                        ${isSelected ? 'border-blue-600 bg-blue-50/80 shadow-md transform scale-105' : 'border-slate-100 bg-white/60 hover:border-slate-300'}
                                    `}
                      >
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center text-xl" style={{ backgroundColor: meta.color }}>
                          {meta.icon}
                        </div>
                        <span className={`text-xs font-bold leading-tight ${isSelected ? 'text-blue-800' : 'text-slate-600'}`}>{styleName.split('(')[0]}</span>
                      </button>
                    )
                  })}
                </div>

                <div className="flex justify-center mt-8">
                  <button
                    onClick={() => generateFinal(false)}
                    disabled={loading}
                    className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-10 py-3 rounded-xl font-bold text-lg shadow-lg shadow-blue-500/30 hover:shadow-blue-500/40 hover:-translate-y-0.5 transition-all flex items-center gap-2 disabled:opacity-70 disabled:cursor-wait"
                  >
                    {loading ? '清書中...' : '💫 完成画像を生成する'}
                  </button>
                </div>
              </>
            ) : (
              // RESULT VIEW
              <div className="space-y-6">
                <div className="bg-white rounded-2xl p-2 md:p-4 border border-slate-200 shadow-lg max-w-4xl mx-auto">
                  <div className="flex justify-between items-center mb-4 px-2">
                    <h3 className="font-bold text-slate-700">🎉 Completed</h3>
                    <div className="flex gap-2">
                      <button onClick={() => setFinalImage(null)} className="text-sm text-slate-500 hover:underline">スタイル選択に戻る</button>
                    </div>
                  </div>
                  <div className="rounded-xl overflow-hidden border border-slate-100 bg-slate-50">
                    <img src={finalImage} className="w-full h-auto" alt="Final" />
                  </div>
                </div>

                {/* Refine & Download */}
                <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-6">
                  <div className="bg-white/80 backdrop-blur rounded-xl p-6 border border-slate-200">
                    <h4 className="font-bold text-slate-700 mb-3 flex items-center gap-2"><Edit3 className="w-4 h-4" /> 修正・微調整</h4>
                    <div className="flex gap-2">
                      <input
                        className="flex-1 border border-slate-200 rounded-lg p-2 text-sm"
                        placeholder="例：もっと明るく、文字を大きく..."
                        value={refineInst}
                        onChange={(e) => setRefineInst(e.target.value)}
                      />
                      <button
                        onClick={() => generateFinal(true)}
                        disabled={loading}
                        className="bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-bold"
                      >
                        実行
                      </button>
                    </div>
                  </div>

                  <div className="bg-white/80 backdrop-blur rounded-xl p-6 border border-slate-200 flex flex-col justify-center items-center">
                    <a
                      href={finalImage}
                      download="blueprint_output.png"
                      className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold text-center hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                    >
                      <Download className="w-5 h-5" /> 画像をダウンロード
                    </a>
                  </div>
                </div>

                <div className="text-center pt-8">
                  <button onClick={() => window.location.reload()} className="text-slate-400 hover:text-slate-600 text-sm flex items-center gap-2 mx-auto">
                    <RotateCcw className="w-4 h-4" /> 最初から作り直す
                  </button>
                </div>
              </div>
            )}
          </div>
        )
      }

      {/* Global Loading Overlay */}
      {
        loading && (
          <div className="fixed inset-0 bg-white/80 z-[100] flex flex-col items-center justify-center backdrop-blur-sm">
            <div className="w-16 h-16 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin mb-4"></div>
            <p className="text-slate-700 font-bold animate-pulse">{loadingMessage}</p>
          </div>
        )
      }
    </main >
  );
}
