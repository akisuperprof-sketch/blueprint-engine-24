"use client";

import { useState, useEffect, useRef } from 'react';
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

export default function Home() {
  // Session State
  const [phase, setPhase] = useState<Phase>('input');
  const [apiKey, setApiKey] = useState('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  // Input Phase
  const [inputText, setInputText] = useState('');
  const [archetype, setArchetype] = useState(ARCHETYPES[0]);
  const [additionalInst, setAdditionalInst] = useState('');
  const [refImages, setRefImages] = useState<{ data: string, mimeType: string }[]>([]);
  const [isRefMandatory, setIsRefMandatory] = useState(false);

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

  // Loading States
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');

  // --- Helpers ---
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

  // --- API Calls ---

  // Step 1: Generate Structure
  const generateStructure = async () => {
    if (!apiKey) { setIsSettingsOpen(true); return; }
    setLoading(true);
    setLoadingMessage("解析中... (構造化)");
    try {
      const prompt = `
            あなたは優秀な情報デザイナーです。以下のテキストを可視化・図解するための構成案を作成し、
            **JSON形式のみ** で出力してください。
            Markdownのコードブロックは使わず、純粋なJSON文字列のみを返してください。

            【テキスト】
            ${inputText}

            【指定構造】
            ${archetype}

            【追加指示】
            ${additionalInst}
            
            ${refImages.length > 0 ? `\n【参考画像あり】\n画像を参考に、その雰囲気や構造要素を取り入れてください。(画像の要素反映は「${isRefMandatory ? "必須" : "任意"}」です)` : ""}

            【出力JSON形式】
            {
                "main_title": "タイトル",
                "summary": "要約(1文)",
                "recommended_style": "デザイン指示",
                "archetype_name": "${archetype}",
                "steps": [
                    { "label": "見出し", "visual_desc": "絵の指示" }
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
    if (!apiKey) return;
    setLoading(true);
    try {
      const prompt = `修正指示: ${retakeInstr}\n現在のJSON: ${JSON.stringify(draftData)}\n\n上記に基づきJSONを修正して出力してください。JSONのみ。`;
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
    if (!apiKey) return;
    setLoading(true);
    setLoadingMessage("ラフスケッチ生成中...");

    // Prepare prompt
    const stepsStr = draftData.steps?.map((s, i) => `${i + 1}. ${s.label}: ${s.visual_desc}`).join('\n') || "";
    const basePrompt = `Title: ${draftData.main_title}\nSummary: ${draftData.summary}\nStyle: ${draftData.recommended_style}\nStructure: ${draftData.archetype_name}\nSteps:\n${stepsStr}\nTarget Language: Japanese.`;
    setFinalPrompt(basePrompt);

    const fullPrompt = `${basePrompt}\n${layoutFeedback ? 'Fix layout: ' + layoutFeedback : ''}\n [DRAFT MODE] Simple Black & White sketch wireframe.`;

    try {
      const res = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey, prompt: fullPrompt, refImages })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      if (data.type === 'image') {
        setDraftImage(`data:${data.mimeType};base64,${data.data}`);
      } else {
        // Fallback for text response (e.g. SVG code or description) currently just showing as alert or logic needed
        alert("モデルが画像を返しませんでした。テキスト: " + data.content.substring(0, 100) + "...");
      }
      setPhase('draft');
    } catch (e: any) { alert(e.message); }
    finally { setLoading(false); }
  };

  // Step 4: Final Generation
  const generateFinal = async (isRefine = false) => {
    if (!apiKey) return;
    setLoading(true);
    setLoadingMessage(isRefine ? "修正中..." : `「${selectedStyle}」で清書中...`);

    const styleInstr = STYLE_PROMPTS[selectedStyle];
    const modification = isRefine ? `\n[MODIFICATION] ${refineInst}` : "";
    const prompt = `${finalPrompt}\n[FINAL STYLE] ${styleInstr}${modification}\nHigh Quality Render. ${isRefMandatory ? "\nCRITICAL: The character/object from the reference images MUST appear in the final output as the main subject." : ""}`;

    try {
      const res = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey, prompt, refImages })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      if (data.type === 'image') {
        setFinalImage(`data:${data.mimeType};base64,${data.data}`);
        if (!isRefine) setPhase('design'); // Ensure we are on design phase (or result view)
      } else {
        alert("モデルが画像を返しませんでした。テキスト: " + data.content.substring(0, 100) + "...");
      }
    } catch (e: any) { alert(e.message); }
    finally { setLoading(false); }
  }


  // --- Render Logic ---
  const ProgressBar = () => {
    const steps = [
      { id: 'input', label: '01. 入力' },
      { id: 'struct', label: '02. 構成' },
      { id: 'draft', label: '03. ドラフト' },
      { id: 'design', label: '04. デザイン' },
    ];

    return (
      <div className="flex w-full justify-between items-center bg-white/70 backdrop-blur-md rounded-xl p-3 border border-slate-200 shadow-sm mb-6">
        {steps.map((s, idx) => {
          const isActive = phase === s.id;
          // Logic checks: can only go back or stay, unless strictly debugging. 
          // Simple logic: Highlight current.
          return (
            <div key={s.id} className={`flex-1 text-center py-2 rounded-lg text-sm font-semibold transition-all ${isActive ? 'bg-primary text-white shadow-md' : 'text-slate-500 hover:bg-slate-100'}`}>
              {s.label}
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <main className="min-h-screen p-4 md:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-3">
          <div className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-blue-800">
            Blueprint Engine 24
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setIsSettingsOpen(!isSettingsOpen)} className="p-2 rounded-full bg-white border border-slate-200 hover:bg-slate-50 shadow-sm">
            <Settings className="w-5 h-5 text-slate-600" />
          </button>
        </div>
      </div>

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">設定</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-1">Gemini API Key</label>
              <input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Enter your key..." />
              <p className="text-xs text-slate-400 mt-1">※ブラウザに一時的に保存されます (Refreshで消えます)</p>
            </div>
            <button onClick={() => setIsSettingsOpen(false)} className="w-full bg-slate-900 text-white py-2 rounded-lg hover:bg-slate-800">閉じる</button>
          </div>
        </div>
      )}

      <ProgressBar />

      {/* --- PHASE 1: INPUT --- */}
      {phase === 'input' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
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

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Title</label>
                <input
                  value={draftData.main_title || ''}
                  onChange={(e) => setDraftData({ ...draftData, main_title: e.target.value })}
                  className="w-full text-lg font-bold p-2 border-b border-dashed border-slate-300 bg-transparent focus:border-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Summary</label>
                <input
                  value={draftData.summary || ''}
                  onChange={(e) => setDraftData({ ...draftData, summary: e.target.value })}
                  className="w-full text-md text-slate-600 p-2 border-b border-dashed border-slate-300 bg-transparent focus:border-blue-500 outline-none"
                />
              </div>

              <div className="space-y-3 mt-6">
                {draftData.steps?.map((step, idx) => (
                  <div key={idx} className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                    <div className="flex gap-4">
                      <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm shrink-0">
                        {idx + 1}
                      </div>
                      <div className="flex-1 space-y-2">
                        <input
                          value={step.label}
                          onChange={(e) => {
                            const newSteps = [...(draftData.steps || [])];
                            newSteps[idx].label = e.target.value;
                            setDraftData({ ...draftData, steps: newSteps });
                          }}
                          className="w-full font-semibold bg-transparent border-b border-transparent focus:border-slate-300 outline-none"
                        />
                        <input
                          value={step.visual_desc}
                          onChange={(e) => {
                            const newSteps = [...(draftData.steps || [])];
                            newSteps[idx].visual_desc = e.target.value;
                            setDraftData({ ...draftData, steps: newSteps });
                          }}
                          className="w-full text-sm text-slate-500 bg-transparent border-b border-transparent focus:border-slate-300 outline-none"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-between pt-4">
            <button onClick={() => setPhase('input')} className="px-6 py-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors">戻る</button>
            <button
              onClick={generateDraft}
              disabled={loading}
              className="bg-primary text-white px-8 py-3 rounded-xl font-bold hover:bg-blue-700 shadow-lg transition-all flex items-center gap-2"
            >
              {loading ? '生成中...' : <>ドラフト作成 <ChevronRight className="w-4 h-4" /></>}
            </button>
          </div>
        </div>
      )}

      {/* --- PHASE 3: DRAFT --- */}
      {phase === 'draft' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="bg-white/90 rounded-2xl p-6 border border-slate-200 shadow-sm text-center">
            <h2 className="text-xl font-bold text-slate-800 mb-6">03. ラフスケッチ確認</h2>

            {draftImage ? (
              <div className="relative w-full max-w-3xl mx-auto rounded-lg overflow-hidden border border-slate-200 shadow-md">
                <img src={draftImage} alt="Draft" className="w-full h-auto" />
              </div>
            ) : (
              <div className="w-full h-64 bg-slate-100 animate-pulse rounded-lg flex items-center justify-center text-slate-400">Loading Draft...</div>
            )}

            <div className="mt-6 flex gap-2 max-w-xl mx-auto">
              <input
                placeholder="レイアウト修正指示 (例: 文字をもっと大きく)"
                className="flex-1 p-2 border rounded-lg text-sm"
                value={layoutFeedback}
                onChange={(e) => setLayoutFeedback(e.target.value)}
              />
              <button
                onClick={() => generateDraft()} // Re-run with feedback
                className="bg-slate-800 text-white px-4 py-2 rounded-lg text-sm whitespace-nowrap"
              >
                再生成
              </button>
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <button
              onClick={() => setPhase('design')}
              className="bg-primary text-white px-8 py-3 rounded-xl font-bold hover:bg-blue-700 shadow-lg transition-all flex items-center gap-2"
            >
              デザイン選択へ <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* --- PHASE 4: DESIGN & RESULT --- */}
      {phase === 'design' && (
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
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-12 py-4 rounded-full font-bold text-lg shadow-xl shadow-blue-500/30 hover:scale-105 hover:shadow-blue-500/50 transition-all flex items-center gap-2"
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
      )}

      {/* Global Loading Overlay */}
      {loading && (
        <div className="fixed inset-0 bg-white/80 z-[100] flex flex-col items-center justify-center backdrop-blur-sm">
          <div className="w-16 h-16 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin mb-4"></div>
          <p className="text-slate-700 font-bold animate-pulse">{loadingMessage}</p>
        </div>
      )}
    </main>
  );
}
