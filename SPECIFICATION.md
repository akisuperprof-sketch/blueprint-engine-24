# スキームメーカー開発ログ＆仕様書

## プロジェクト概要
**名称:** Blueprint Engine 24 (スキームメーカー)
**目的:** ユーザーの入力テキストや画像から、構造化されたインフォグラフィック（図解）を自動生成する。
**コア機能:**
1.  **構造解析 (Step 1-2):** テキストをJSON構造データに変換。
2.  **ドラフト生成 (Step 3):** レイアウト確認用の白黒ラフ画を強制出力。
3.  **デザイン清書 (Step 4):** 10種類以上のスタイルで高品質な最終レンダリング。選択可能なスタイル変更機能。
4.  **モバイル最適化:** 通信量・API制限（Quota）を考慮した画像処理とリトライ機能。

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
    *   **Step 1:** APIキー入力欄が空の場合、テキスト入力文字数（5文字以上）のみをチェックして処理を開始する（サーバーサイドの環境変数 `GEMINI_API_KEY` を利用）。
    *   **Step 3/4:** 生成ボタン押下時のクライアントサイドAPIキー必須チェックを削除。サーバーサイドでキーが存在すれば実行可能とする（Vercel対応）。

*   **AI修正指示 (AI Update):** ヘッダーエリアから削除し、構成要素編集エリアの下部（「上級者向けプロンプト編集」の直上）に移動配置。編集フローの自然な流れに最適化。

### 3.9. Mobile API Optimization (Critical)
*   **Image Compression:** 
    *   Upload images are automatically resized to **512px (max-side)**.
    *   Compression quality set to **0.5 (JPEG)** to minimize Token (TPM) consumption.
*   **Final Step (Step 4) Efficiency:** 
    *   Draft images are **NOT** sent as visual references during final rendering to save bandwidth and quota.
    *   Detailed text prompts are used exclusively to ensure structural adherence.
*   **Server-Side Fallback & Retry:**
    *   **Text Model Priority:** `gemini-3-pro-preview` -> `gemini-2.0-flash-exp` -> `gemini-1.5-pro` -> `gemini-1.5-flash`
    *   **Image Model Priority:** `gemini-3-pro-image-preview` -> `nano-banana-pro-preview` -> `gemini-2.0-flash-exp` -> `1.5-pro` -> `1.5-flash`
    *   **Retry Delay:** Automatic 2-second interval before retrying after a "Quota Exceeded (429)" error.

### 3.10. Settings & API Management
*   **Persistence:** Personal API keys are saved in `localStorage`.
*   **Status Indicator:** Settings modal displays key status and last 4 digits.
*   **Storage Error Handling:** Automatically handles `QuotaExceededError` for LocalStorage by removing oldest history items to ensure successful saving.

### 4. Expansion of Contents
*   **New Archetypes:** `マトリックス (4象限 / 2x2分析)`.
*   **New Styles:** `切り絵風 (Paper Cutout)`, `ネオンガラス風 (Neon Glass)`.
*   **Marketing Copy:** Updated "Detailed Feature Introduction" with fresh, user-provided marketing text.

## 直近の変更履歴 (2025-12-23)

### Phase 3: 最終調整と品質向上 (Final Optimization)
7.  **モデルエンジンの刷新:**
    *   **テキスト解析:** `gemini-3-pro-preview` を最優先モデルとして採用。
    *   **画像生成:** `gemini-3-pro-image-preview` をドラフト・清書の両方で優先採用。
8.  **API制限 (Quota) 対策の完遂:**
    *   Step 4（清書）でドラフト画像のリファレンス送信を廃止（トークン消費を大幅削減）。
    *   アップロード画像のサイズ(512px)・画質(0.5)をさらに軽量化。
    *   フォールバックチェーンに `gemini-1.5-pro` を追加し、リトライ待機時間を2秒に延長。
9.  **LocalStorage容量エラーへの対応:**
    *   ブラウザの保存容量不足（QuotaExceededError）発生時に、古い履歴を自動削除して保存を試みるロジックを実装。
    *   APIエラーと保存容量エラーを明確に区別してユーザーに通知。
10. **コンテンツの拡充:**
    *   新スタイル追加: 「切り絵風」「ネオンガラス風」（全13種類）。
    *   トップページの詳細説明文を、より訴求力の高いマーケティングテキストに刷新。

### Phase 1: 機能拡張とUI/UX改善 (Archive)
1.  **新機能追加:**
    *   「マトリックス (4象限 / 2x2分析)」構造の追加
    *   新スタイル「黒板アート (Blackboard Art)」の追加
    *   参考画像の役割選択機能（メイン利用 / 解説者として配置）
    *   入力ヒント「💡 入力のコツ」セクションの追加
2.  **UI/UX向上:**
    *   スタイル選択をグリッド形式に変更（視覚的プレビュー付き）
    *   「スタイル変更」ボタンの追加（構造を保持したままスタイルのみ変更可能）
    *   「構成の確認に戻る」ボタンの追加
    *   ヘッダーのロゴ・タイトルからトップ画面への戻り機能
3.  **APIキー管理の強化:**
    *   localStorage保存の復元と自動適用
    *   設定画面での「下4桁表示」による適用確認機能
    *   共有キー使用時の警告表示

### Phase 2: モバイルAPI制限への対応（試行と最適化）
4.  **サーバー側の堅牢化:**
    *   モデルフォールバックチェーンの実装（nano-banana → 2.0-flash → 1.5-pro → 1.5-flash）
    *   タイムアウト時間を90秒に延長（モバイル通信環境を考慮）
    *   制限エラー時の自動リトライ機能（1秒間隔）
5.  **画像処理の最適化:**
    *   参考画像: 1000px（品質とトークン消費のバランス）
    *   圧縮品質: 0.8（JPEG）
    *   清書時のドラフト画像参照: 有効（デザインの一貫性を確保）
6.  **エラーハンドリングの改善:**
    *   詳細なエラーメッセージの表示（Google APIからの生メッセージを含む）
### Phase 4: 構造化機能の深化とブランディング調整 (High-End Structure)
11. **JSON構造の多層化 (Rich Schema):**
    *   従来のフラットな構造から、`Header`, `Blocks` (Steps), `Footer` の3層構造へ拡張。
    *   各ブロックに `Visual Description` (視覚指示) と `Heading` (見出し) を明示的に持たせ、情報密度を向上。
    *   **キャラクター演技指導:** リファレンス画像のキャラクターに対し、「案内棒を持つ」「完成品を勧める」などの具体的なポーズ指定を自動生成プロンプトに組み込み。
12. **ブランディングの確定:**
    *   アプリ名を「Blueprint Engine 24 (ブループリントエンジン24)」に統一（一時的な「わど図解」名称から復帰）。
    *   ローディングメッセージも「Blueprint AI」に統一。
13. **UXの微調整:**
    *   履歴容量警告の実装（3件以上でアラート表示）。
    *   リファレンス画像エリアへのTips追加（白背景推奨など）。


