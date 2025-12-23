"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Settings, Clock, Check, ChevronRight, RotateCcw, Download, Upload, Image as ImageIcon, Copy, Search, Edit3 } from 'lucide-react';
import { ARCHETYPES, STYLE_PROMPTS, STYLE_ICONS, STYLE_PREVIEWS } from '@/lib/constants';
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
  const [refImageRole, setRefImageRole] = useState<'general' | 'narrator'>('general');
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
  const [useManualDraftPrompt, setUseManualDraftPrompt] = useState(false);
  const [manualDraftPrompt, setManualDraftPrompt] = useState('');

  // Step 3 Extended (Final Prompt Edit)
  const [useManualFinalPrompt, setUseManualFinalPrompt] = useState(false);

  // Loading States
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');

  // Load Settings on Mount
  useEffect(() => {
    const savedHistory = localStorage.getItem('scheme_maker_history');
    if (savedHistory) {
      try { setHistory(JSON.parse(savedHistory)); } catch (e) { console.error(e); }
    }
    const savedKey = localStorage.getItem('gemini_api_key');
    if (savedKey) {
      setApiKey(savedKey);
    }
  }, []);

  const saveApiKey = (key: string) => {
    setApiKey(key);
    localStorage.setItem('gemini_api_key', key);
  };

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

    // 容量制限対策: 古い履歴を削除してスペースを確保する
    let currentHistory = [...history];
    const MAX_ATTEMPTS = 5;

    for (let i = 0; i < MAX_ATTEMPTS; i++) {
      try {
        const newHistoryJson = JSON.stringify([newItem, ...currentHistory]);
        localStorage.setItem('scheme_maker_history', newHistoryJson);
        setHistory([newItem, ...currentHistory]);
        console.log("History saved successfully.");
        return; // Success
      } catch (e: any) {
        if (e.name === 'QuotaExceededError' || e.message.includes('quota')) {
          console.warn("LocalStorage quota exceeded. Removing oldest item and retrying...");
          if (currentHistory.length > 0) {
            currentHistory.pop(); // Remove the oldest item
          } else {
            console.error("Cannot save history: Storage full and no items to remove.");
            return; // Give up
          }
        } else {
          console.error("Failed to save history:", e);
          return; // Unknown error
        }
      }
    }
    console.error("Failed to save history after multiple attempts.");
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
        reader.onload = (event) => {
          const img = new (window as any).Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            // SPECIFICATION.md: Upload images resized to 512px (max-side)
            const MAX_DIM = 512;
            let width = img.width;
            let height = img.height;

            if (width > height) {
              if (width > MAX_DIM) {
                height *= MAX_DIM / width;
                width = MAX_DIM;
              }
            } else {
              if (height > MAX_DIM) {
                width *= MAX_DIM / height;
                height = MAX_DIM;
              }
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx?.drawImage(img, 0, 0, width, height);

            // SPECIFICATION.md: Compression quality set to 0.5 (JPEG)
            const compressedBase64 = canvas.toDataURL('image/jpeg', 0.5).split(',')[1];
            setRefImages(prev => [...prev, { data: compressedBase64, mimeType: 'image/jpeg' }]);
          };
          img.src = event.target?.result;
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

    const charRef = refImages.length > 0
      ? (refImageRole === 'narrator'
        ? "Please use the character from the reference image as a 'narrator/commentator' who explains the content (placed at the side with a speech bubble)."
        : "Capture the visual style/elements from the input reference images and incorporate them into the main diagram.")
      : "なし";

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
    if (inputText.length < 5) {
      alert("テキストを5文字以上入力してください。");
      return;
    }

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

  // --- Error Handler ---
  const handleError = (error: any) => {
    console.error(error);
    setLoading(false);

    const rawMsg = error.message || error.toString();
    const msg = rawMsg.toLowerCase();

    // Check for LocalStorage Quota Exceeded (not API quota)
    if (msg.includes('setitem') && msg.includes('quota')) {
      alert(`⚠️ 【保存容量エラー】\nブラウザの履歴保存容量がいっぱいです。\n古い履歴を削除するか、キャッシュをクリアしてください。\n(画像は生成されていますが、履歴には保存されませんでした)`);
      return;
    }

    if (msg.includes('quota') || msg.includes('429') || msg.includes('resource_exhausted')) {
      alert(`⚠️ 【API利用制限】\nGoogle Gemini APIの無料枠上限(Quota)に達しました。\n\n[詳細]: ${rawMsg}\n\n・しばらく時間をおいて試す\n・有料プランのキーを確認する\n・別のキーを設定する\n等の対応が必要です。`);
    } else {
      alert(`エラーが発生しました:\n${rawMsg}`);
    }
  };

  // Step 2: Update Structure (Retake)
  const updateStructure = async () => {
    // apiKey check handled by backend fallback if empty
    setLoading(true);
    setLoadingMessage("AIが構成を修正中...");
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
    } catch (e: any) { handleError(e); }
    finally { setLoading(false); }
  };

  // Step 3: Generate Draft
  const generateDraft = async () => {
    // Allow empty key - backend will check env var
    setLoading(true);
    setPhase('draft'); // Move to draft view immediately to show loading

    try {
      let final_prompt_text = "";

      if (useManualDraftPrompt && manualDraftPrompt) {
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
    } catch (e: any) { handleError(e); }
    finally { setLoading(false); }
  };

  // Step 4: Final Generation
  const generateFinal = async (isRefine = false) => {
    // Allow empty key - backend will check env var
    setLoading(true);
    setLoadingMessage(isRefine ? "微調整中..." : "最終工程で清書中です... (高品質生成)");

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
        // If manual prompt edit is ENABLED, use that.
        if (useManualFinalPrompt && finalPrompt) {
          promptToUse = finalPrompt;
        } else {
          // Otherwise construct standard Final Prompt
          const styleP = STYLE_PROMPTS[selectedStyle] || "";
          // Use draftData if available, else fallback
          const mainTitle = draftData.main_title || "Untitled";

          const langInstruction = targetLanguage === 'Japanese'
            ? "Ensure all text labels properly rendered in valid Japanese characters."
            : `Ensure all text labels are in **${targetLanguage}**.`;

          const charInstruction = refImageRole === 'narrator'
            ? "Important: Place the person/character from the reference image as a 'narrator' (e.g., at the corner, pointing to the key info)."
            : "Incorporate the style of the provided reference image into the final rendering.";

          promptToUse = `
**Role:** Expert Infographic Illustrator
**Goal:** Create a polished, high-quality infographic based on the signed-off draft logic.

**Visual Style:** ${selectedStyle.split('(')[0]}
${styleP}

**Content Requirements:**
* **Title:** ${mainTitle}
* **Language:** ${langInstruction}
* **Structure:** Follow the 'Content Mapping' strictly.
* **Character Role:** ${charInstruction}

**Technical Constraints:**
* Output: High Fidelity, rich colors, professional finish.
* Text: Must be legible, distinct from background.

${draftData.summary ? `**Context:** ${draftData.summary}` : ""}
`;
          // Also update the finalPrompt state so user sees it in "Advanced" if they open it
          setFinalPrompt(promptToUse);
        }
      }

      const getDownscaledImage = async (dataUrl: string): Promise<string> => {
        return new Promise((resolve) => {
          const img = new (window as any).Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            const MAX = 1000;
            let w = img.width;
            let h = img.height;
            if (w > h) { if (w > MAX) { h *= MAX / w; w = MAX; } }
            else { if (h > MAX) { w *= MAX / h; h = MAX; } }
            canvas.width = w; canvas.height = h;
            canvas.getContext('2d')?.drawImage(img, 0, 0, w, h);
            resolve(canvas.toDataURL('image/jpeg', 0.8).split(',')[1]);
          };
          img.src = dataUrl;
        });
      };

      const finalRefData = (draftImage && draftImage.includes('image/'))
        ? await getDownscaledImage(draftImage)
        : null;

      const res = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: promptToUse,
          apiKey: apiKey,
          // refImages: isRefine ? [] : (finalRefData
          //   ? [{ data: finalRefData, mimeType: "image/jpeg" }]
          //   : [])
          // SPECIFICATION.md: Draft images are NOT sent as visual references during final rendering to save bandwidth and quota.
          refImages: []
        })
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error);

      let resultUrl = "";
      if (data.type === 'image') {
        resultUrl = `data:${data.mimeType};base64,${data.data}`;
        setFinalImage(resultUrl);
      } else if (data.type === 'svg') {
        resultUrl = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(data.content)))}`;
        setFinalImage(resultUrl);
      } else {
        throw new Error("画風の生成に失敗しました。別のスタイルを試してください。");
      }

      // Auto Save to History
      if (resultUrl) {
        saveToHistory(resultUrl, promptToUse);
      }

      setPhase('design');

    } catch (e: any) {
      handleError(e);
    } finally {
      setLoading(false);
    }
  };


  // --- Render Logic ---
  const LoadingOverlay = () => {
    if (!loading) return null;
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200] flex items-center justify-center animate-in fade-in duration-300">
        <div className="bg-white rounded-2xl p-8 shadow-2xl flex flex-col items-center max-w-sm w-full mx-4">
          <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4" />
          <h3 className="text-lg font-bold text-slate-800 mb-2">Processing...</h3>
          <p className="text-slate-500 text-sm text-center">{loadingMessage || '処理中...'}</p>
        </div>
      </div>
    );
  };

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
      <LoadingOverlay />

      {/* Header */}
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => setPhase('input')} className="flex items-center justify-center hover:opacity-80 transition-opacity">
              <Image src="/logo.png" alt="Blueprint Engine Logo" width={200} height={50} className="h-10 w-auto object-contain" />
            </button>
            <button onClick={() => setPhase('input')} className="font-bold text-xl tracking-tight bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent animate-text-shimmer hover:opacity-80 transition-opacity">
              ブループリントエンジン24
            </button>
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
            <div className="mb-4">
              <label className="text-sm font-bold text-slate-700 block mb-1">Google Gemini APIキー</label>
              <div className="flex items-center gap-2 mb-2">
                <span className={`w-3 h-3 rounded-full ${apiKey ? 'bg-green-500' : 'bg-amber-500 animate-pulse'}`}></span>
                <span className="text-xs font-bold text-slate-600">
                  {apiKey
                    ? `個人のキーを適用中 (末尾: ...${apiKey.slice(-4)})`
                    : '共有キーを使用中 (利用制限あり)'}
                </span>
              </div>
              <input
                type="password"
                placeholder="AIzaSy..."
                value={apiKey}
                onChange={(e) => saveApiKey(e.target.value)}
                className="w-full border border-slate-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none font-mono text-sm"
              />
              {!apiKey && (
                <p className="text-[10px] text-amber-600 mt-1 leading-tight">
                  ※共有キーは回数制限が厳しいため、エラーが出る場合はご自身のキーを設定してください。
                </p>
              )}
            </div>
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
                Blueprint Engineは、あなたの思考を瞬時に「構造化された設計図」へ可視化する知的エンジンです。
              </p>
              <p>
                企画・戦略整理などの知的作業時間を劇的に短縮し、論理とAIの融合で、誰でも即座に「伝わる図解」を作成できます。
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
                <div className="mt-3 p-5 bg-white rounded-lg border border-slate-100 text-slate-600 space-y-6 text-sm leading-relaxed animate-in fade-in zoom-in-95 duration-200">
                  {/* Section 1: Why Needed */}
                  <section>
                    <h3 className="font-bold text-slate-800 text-lg mb-2 flex items-center gap-2">
                      なぜ今、図解ツールが必要なのか
                    </h3>
                    <p className="mb-2 text-xs text-slate-400">ここ、けっこう大事な話なんですけど...</p>
                    <div className="space-y-3">
                      <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                        <strong className="block text-slate-800 mb-1">● 情報過多の時代に「一瞬で伝わる」が武器になる</strong>
                        <p>文字だけの情報って、正直スルーされちゃいません？私もタイムライン流し見してるとき、文字びっしりの投稿はスーッと通り過ぎちゃいます。でも図解があると、手が止まるんですよね。「お、なんかわかりやすそう」って。</p>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                        <strong className="block text-slate-800 mb-1">● デザイナーさんに頼むと高い問題</strong>
                        <p>これ、地味にキツくないですか？インフォグラフィック1枚で5,000円〜数万円。週に3本コンテンツ出すなら、月に6万円以上... 私も最初は外注してたんですけど、「これ、自分で作れたらなあ」ってずっと思ってました。</p>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                        <strong className="block text-slate-800 mb-1">● アイデアは鮮度が命</strong>
                        <p>「今これ思いついた！」ってときに、「来週デザイン上がります」じゃ遅いんですよね。そのときの熱量で出したいじゃないですか。結局、自分で作れる人が最強の時代になったんです。</p>
                      </div>
                    </div>
                  </section>

                  {/* Section 2: Mechanism */}
                  <section>
                    <h3 className="font-bold text-slate-800 text-lg mb-2 mt-2 text-indigo-700">
                      3. ここがヤバい！3ステップ生成の仕組み
                    </h3>
                    <p className="mb-3">
                      このツールの最大の特徴... <strong className="marker:text-red-500 text-red-500 font-bold">いきなり完成画像を作らない</strong>んです。
                      「え、それ遠回りじゃない？」って思うかもしれないんですけど、これがミソで。プロのデザイナーさんって、いきなり色塗り始めないですよね？まず構成考えて、ラフ描いて、それから仕上げる。その流れをAIが再現してるんです。
                    </p>

                    <div className="space-y-4 pl-2 border-l-2 border-slate-200 ml-1">
                      <div>
                        <h4 className="font-bold text-slate-800">■ Step 1: 構造化 (Structure)</h4>
                        <p className="text-xs mt-1">
                          最新の言語モデル <code>gemini-3-pro-preview</code> が、入力されたテキストを読み解きます。
                          <br />
                          ここがすごいのは、<strong>「これは比較図がいいな」「タイムラインで見せよう」みたいな判断を、AIが勝手にやってくれる</strong>んです。
                          もちろん手動で変えることもできます。
                        </p>
                        <p className="text-[10px] text-slate-400 mt-1">
                          (対応: 比較・対比 / プロセス・手順 / 年表・タイムライン / 階層・ピラミッド / 循環・サイクル / マインドマップ / マトリックス / 解剖図)
                        </p>
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-800">■ Step 2: ラフスケッチ (Draft)</h4>
                        <p className="text-xs mt-1">
                          次に、画像モデル <code>Nano Banana Pro (gemini-3-pro-image-preview)</code> が、白黒のラフ画を描きます。
                          <br />
                          「この配置でいい？」って確認できるから、失敗がないんですよね。今は「もうちょい左」とか「要素増やして」とか、この段階で調整できるから本当に助かってます。
                        </p>
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-800">■ Step 3: 仕上げ (Final Design)</h4>
                        <p className="text-xs mt-1">
                          最後に、選んだスタイルで色塗って、ディテール描き込んで完成！30秒〜1分で出てきます。正直、最初見たときシビれましたね...
                        </p>
                      </div>
                    </div>
                  </section>

                  {/* Section 3: Styles */}
                  <section>
                    <h3 className="font-bold text-slate-800 text-lg mb-3 mt-4 text-pink-600">
                      4. 選べるデザインスタイル13種類
                    </h3>
                    <p className="mb-3">今の気分とか、使う場所に合わせて、いろんなスタイルが選べます！</p>
                    <ul className="grid grid-cols-2 gap-2 text-xs">
                      <li><span className="font-bold">・ビジネス・プロ</span> → プレゼン資料に信頼感</li>
                      <li><span className="font-bold">・ポップ・インフォ</span> → 鮮やかで視認性抜群</li>
                      <li><span className="font-bold">・手書きスケッチ</span> → 親しみやすいホワイトボード風</li>
                      <li><span className="font-bold">・ミニマリスト</span> → シンプルイズベスト</li>
                      <li><span className="font-bold">・3Dアイソメトリック</span> → 箱庭っぽくて可愛い</li>
                      <li><span className="font-bold">・サイバーパンク</span> → ネオンでかっこいい</li>
                      <li><span className="font-bold">・漫画風</span> → インパクト重視</li>
                      <li><span className="font-bold">・クレイアニメ風</span> → 粘土っぽい温かみ</li>
                      <li><span className="font-bold">・レトロゲーム風</span> → ドット絵テイスト</li>
                      <li><span className="font-bold">・水彩画風</span> → アートっぽい質感</li>
                      <li><span className="font-bold">・切り絵風</span> → 和のテイスト</li>
                      <li><span className="font-bold">・黒板アート風</span> → 教育系に最適</li>
                      <li><span className="font-bold">・ネオンガラス風</span> → モダンで洗練された感じ</li>
                    </ul>
                    <p className="mt-3 text-xs bg-pink-50 text-pink-700 p-2 rounded">
                      💡 さらに、色味とか雰囲気も自然言語で「パステルピンクと水色で優しい感じに」とか伝えるだけでOKです！
                    </p>
                  </section>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur rounded-2xl p-6 border border-blue-100 shadow-sm">
            <h2 className="text-xl font-bold mb-2 text-slate-800">01. 図解したい内容を入力</h2>
            <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 mb-4 text-xs text-blue-800 flex items-start gap-2">
              <span className="text-base">💡</span>
              <div>
                <strong>入力のコツ:</strong> 比較なら「強み・弱み」、手順なら「Step1, 2...」を意識して書くとAIが構造を捉えやすくなります。
              </div>
            </div>
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
              <div className="flex flex-col gap-3 mb-4">
                <div className="flex items-center gap-4">
                  <label className="cursor-pointer bg-slate-100 hover:bg-slate-200 text-slate-600 px-4 py-2 rounded-lg flex items-center gap-2 transition-colors">
                    <Upload className="w-4 h-4" /> アップロード
                    <input type="file" multiple accept="image/*" className="hidden" onChange={handleImageUpload} />
                  </label>
                  <label className="flex items-center gap-2 text-sm text-slate-600">
                    <input type="checkbox" checked={isRefMandatory} onChange={(e) => setIsRefMandatory(e.target.checked)} className="rounded text-blue-600" />
                    画像要素を必須にする
                  </label>
                </div>

                {refImages.length > 0 && (
                  <div className="flex bg-slate-50 p-1.5 rounded-lg border border-slate-200 w-fit">
                    <button
                      onClick={() => setRefImageRole('general')}
                      className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${refImageRole === 'general' ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:bg-slate-100'}`}
                    >
                      メインとして利用
                    </button>
                    <button
                      onClick={() => setRefImageRole('narrator')}
                      className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${refImageRole === 'narrator' ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:bg-slate-100'}`}
                    >
                      解説者として配置
                    </button>
                  </div>
                )}
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
            <h2 className="text-xl font-bold text-slate-800">02. 構成案の確認</h2>
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

            {/* AI Update Section */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mt-8">
              <label className="text-sm font-bold text-slate-700 block mb-2">
                AIに修正指示を出す (AI Update)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="例: 全体的にもっと簡潔に、Step3を削除して..."
                  value={retakeInstr}
                  onChange={(e) => setRetakeInstr(e.target.value)}
                  className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
                <button
                  onClick={updateStructure}
                  disabled={loading}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm transition-all"
                >
                  AI修正実行
                </button>
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
                  <div className="flex items-center gap-2 mb-3">
                    <input
                      type="checkbox"
                      id="useManualDraftPrompt"
                      checked={useManualDraftPrompt}
                      onChange={(e) => {
                        setUseManualDraftPrompt(e.target.checked);
                        if (e.target.checked && !manualDraftPrompt) {
                          setManualDraftPrompt(constructDraftPrompt());
                        }
                      }}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    <label htmlFor="useManualDraftPrompt" className="text-sm font-bold text-slate-700 cursor-pointer">
                      手動プロンプトを適用する (Override with manual prompt)
                    </label>
                  </div>

                  {useManualDraftPrompt && (
                    <div className="p-3 bg-yellow-50 text-yellow-800 text-xs rounded-lg mb-3 border border-yellow-100 flex gap-2 items-start">
                      <span className="text-lg">⚠️</span>
                      <div>
                        <strong>注意:</strong> ここをチェックしている間は、<strong>上のフォームの内容（タイトル変更など）は無視され</strong>、以下のプロンプトがそのまま使用されます。
                      </div>
                    </div>
                  )}
                  <textarea
                    value={manualDraftPrompt}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setManualDraftPrompt(e.target.value)}
                    disabled={!useManualDraftPrompt}
                    placeholder={useManualDraftPrompt ? "プロンプトを編集してください..." : "チェックを入れると編集できます"}
                    className={`w-full h-64 p-3 text-xs font-mono border rounded-lg outline-none leading-relaxed transition-colors
                      ${useManualDraftPrompt ? 'bg-white border-slate-300 focus:ring-2 focus:ring-blue-500' : 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'}`}
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
                  <div className="grid grid-cols-2 gap-3 max-h-[400px] overflow-y-auto p-1">
                    {Object.keys(STYLE_PROMPTS).map((styleName) => {
                      const meta = STYLE_ICONS[styleName] || { icon: '🎨', color: '#f0f0f0' };
                      const previewClass = STYLE_PREVIEWS[styleName] || "bg-slate-100";
                      const isSelected = selectedStyle === styleName;

                      return (
                        <div
                          key={styleName}
                          onClick={() => setSelectedStyle(styleName)}
                          className={`relative group cursor-pointer transition-all duration-200 rounded-xl overflow-hidden border-2 flex flex-col
                            ${isSelected ? 'border-blue-600 shadow-md scale-[1.02]' : 'border-transparent hover:border-blue-200 hover:shadow-sm'}
                          `}
                        >
                          {/* Visual Preview Area */}
                          <div className={`h-20 w-full flex items-center justify-center ${previewClass} transition-opacity ${isSelected ? 'opacity-100' : 'opacity-80 group-hover:opacity-100'}`}>
                            <div className="bg-white/80 backdrop-blur-sm p-2 rounded-full shadow-sm text-2xl">
                              {meta.icon}
                            </div>
                          </div>

                          {/* Label Area */}
                          <div className={`p-2 text-xs font-bold text-center truncate w-full ${isSelected ? 'bg-blue-600 text-white' : 'bg-slate-50 text-slate-600'}`}>
                            {styleName.split('(')[0]}
                          </div>

                          {/* Check Indicator */}
                          {isSelected && (
                            <div className="absolute top-1 right-1 bg-blue-600 text-white rounded-full p-0.5 shadow-sm">
                              <Check className="w-3 h-3" />
                            </div>
                          )}
                        </div>
                      );
                    })}
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
                      <div className="flex items-center gap-2 mb-3">
                        <input
                          type="checkbox"
                          id="useManualFinalPrompt"
                          checked={useManualFinalPrompt}
                          onChange={(e) => setUseManualFinalPrompt(e.target.checked)}
                          className="rounded text-blue-600 focus:ring-blue-500"
                        />
                        <label htmlFor="useManualFinalPrompt" className="text-sm font-bold text-slate-700 cursor-pointer">
                          手動プロンプトを適用する (Override with manual prompt)
                        </label>
                      </div>

                      <p className="text-xs text-slate-500 mb-2">
                        ※ここはAIへの最終的な指示文です。自動生成された内容を直接調整したい場合のみ編集してください。
                      </p>
                      <textarea
                        value={finalPrompt}
                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFinalPrompt(e.target.value)}
                        disabled={!useManualFinalPrompt}
                        className={`w-full h-64 p-3 text-xs font-mono border rounded-lg outline-none leading-relaxed transition-colors
                            ${useManualFinalPrompt ? 'bg-slate-50 border-slate-300 focus:ring-2 focus:ring-blue-500' : 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'}`}
                      />
                    </div>
                  )}
                </div>

                <div className="pt-4 flex flex-col gap-3">
                  <button
                    onClick={() => generateFinal(false)}
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-4 rounded-xl font-bold shadow-xl shadow-blue-500/20 hover:shadow-blue-500/30 hover:-translate-y-0.5 transition-all text-lg flex justify-center items-center gap-2 disabled:opacity-50"
                  >
                    {loading ? '生成中...' : <>{selectedStyle.split('(')[0]}スタイルで清書 <Download className="w-5 h-5" /></>}
                  </button>
                  <button
                    onClick={() => setPhase('struct')}
                    className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-xl font-bold transition-all flex items-center justify-center gap-2"
                  >
                    <RotateCcw className="w-4 h-4" /> 構成の確認に戻る
                  </button>
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
                      <button
                        onClick={() => {
                          setFinalImage(null);
                          setPhase('draft');
                        }}
                        className="flex items-center gap-1.5 text-sm bg-slate-100 px-3 py-1.5 rounded-lg text-slate-600 font-bold hover:bg-slate-200 transition-colors"
                      >
                        <RotateCcw className="w-4 h-4" /> スタイル変更
                      </button>
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
