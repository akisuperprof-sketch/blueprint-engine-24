# スキームメーカー開発ログ＆仕様書

## プロジェクト概要
**名称:** Blueprint Engine 24 (スキームメーカー)
**目的:** ユーザーの入力テキストや画像から、構造化されたインフォグラフィック（図解）を自動生成する。
**コア機能:**
1.  **構造解析 (Step 1-2):** テキストをJSON構造データに変換。
2.  **ドラフト生成 (Step 3):** レイアウト確認用の白黒ラフ画を強制出力。
3.  **デザイン清書 (Step 4):** 10種類の定義済みスタイルで高品質な最終レンダリング。

## 主要機能仕様 (v2.1 Update)

### 1. UI/UXデザイン
*   **ヘッダー:**
    *   **ロゴ:** 左側に配置 (`logo.png`, w:200, h:50)。
    *   **タイトル:** 中央配置。「ブループリントエンジン24」（カタカナ表記）。
    *   **エフェクト:** タイトル文字に `animate-text-shimmer` による常時シマー（光沢）アニメーションを適用。
    *   **アイコン:** 履歴・設定アイコンの視認性を向上（サイズ拡大、色調整）。
    *   **ファビコン:** 専用アイコン (`src/app/icon.png`) を設定済み。
*   **Step 2 (構成案確認):**
    *   AI生成された構造（タイトル、概要、各ステップのラベル・視覚指示）は全て編集可能。
    *   明確な入力ボックス形式のUIを採用し、編集可能であることを視覚的に強調。
    *   編集内容は `draftData` ステートに即時反映され、後続の画像生成プロンプトに使用される。

### 2. 多言語対応 (Multi-language Support)
*   **機能:** 入力言語と出力言語を柔軟に組み合わせ可能（例：日本語入力 → 英語図解）。
*   **UI:** Step 1 設定エリアに「出力言語 (Output Language)」選択肢を追加（日・英・中・韓・仏・西）。
*   **ロジック:**
    *   **Structure Prompt:** JSON生成時に、`label` 等のテキストを指定言語へ翻訳・統一するよう指示。
    *   **Image Prompt:** 画像生成プロンプト内の「言語指定」セクションを動的に書き換え (`All text labels... MUST be in ${targetLanguage}`)。
*   **デフォルト:** "Japanese"

### 3. プロンプトエンジニアリング (High-Fidelity)
*   **God Prompt:** リバースエンジニアリングに基づいた詳細な役割定義・目的・構造定義・コンテンツマッピングを使用。
*   **Draft Mode:** スタイル指定を無視し、白黒のラフスケッチを強制するオーバーライドブロックを実装。
*   **Final Mode:** ドラフトの構図を維持しつつ、指定スタイル（ビジネス・プロ、ポップ・インフォ等）を厳密に適用するオーバーライドブロックを実装。

### 3.5. Advanced Prompt Editing (Safety Locks)
*   **Step 2 (Draft Prompt) & Step 3 (Final Prompt):**
    *   上級者向けのアコーディオンメニュー内にプロンプト編集エリアを配置。
    *   **安全措置 (Safety Lock):** 「手動プロンプトを適用する (Override with manual prompt)」チェックボックスを導入。
    *   **ロジック:** チェックボックスが **ON** の場合のみ、フォームの設定（タイトル変更など）を無視し、テキストエリアの手動プロンプトをそのままAIに送信する。OFFの場合は自動生成ロジックが優先される。
    *   **UI:** チェックOFF時はテキストエリアを無効化（グレーアウト）し、誤操作を防止。

### 3.6. History System
*   **Functionality:**
    *   Automatically saves generated final images and their metadata (prompts, title, settings) to `localStorage`.
    *   "History" button in the header opens a modal to view past creations.
    *   Users can load a previous state or delete items.
*   **Data Stored:** Timestamp, Final Image (Base64), Title, Prompts, Config.

### 3.7. System & Deployment
*   **API Key Handling:**
    *   クライアントサイドでの厳格な入力チェックを緩和。
    *   入力がない場合、サーバーサイド (`route.ts`) で環境変数 `GEMINI_API_KEY` へのフォールバックを許容する仕様に変更（Vercel対応）。

## 4. Implementation Details
*   **Framework:** Next.js (App Router), React, Tailwind CSS.
*   **Icons:** Lucide React.
*   **State Management:** React `useState` & `localStorage` for history.
*   **AI Integration:**
    *   Text/Structure: `gemini-1.5-pro` via `/api/generate-text`.
    *   Image Generation: `gemini-1.5-pro` (or equivalent) via `/api/generate-image`.
*   **UI/UX:**
    *   Clean, step-by-step wizard.
    *   Blue-themed aesthetics.
    *   Animated transitions.
    *   Visual feedback for loading/actions.

## 直近の変更履歴 (2025-12-18)
1.  **プロンプト完全刷新:** 4段階の生成フローにおけるプロンプトを「Scheme Maker」完全再現仕様に更新。
2.  **多言語対応実装:** 言語選択UIと動的プロンプト変数の導入。
3.  **UI/Brand改修:** ロゴ・ファビコンの実装、ヘッダータイトルのアニメーション化、アイコン視認性向上。
4.  **安全なプロンプト編集機能:** 上級者向け編集機能に「適用チェックボックス」を追加し、意図しない上書きを防止。
5.  **デプロイ対応:** Vercel環境変数利用のためのAPIキー検証ロジック緩和。
