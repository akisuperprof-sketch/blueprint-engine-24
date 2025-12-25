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
    *   **画像サイズ選択:** Step 1 (入力画面) の生成ボタン直上に、アスペクト比選択ボタン（正方形/A4縦/A4横/ワイド）を配置。アクセス性を向上。
*   **Step 2 (構成案確認):**
    *   AI生成された構造（タイトル、概要、各ステップのラベル・視覚指示）は全て編集可能。
    *   **統一されたUI:** ヘッダー・フッターの編集カードを、Step要素（Blocks）と同じ「白カード＋バッジ」デザインに統一。
    *   **削除機能:** ヘッダー・フッターに「削除」ボタンを追加し、不要なセクションを構成から除外可能に変更。
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
    *   **Image Model Priority:** `imagen-3.0-generate-001` -> `gemini-3-pro-image-preview` -> `nano-banana-pro-preview` -> `gemini-2.0-flash-exp`
    *   **Retry Delay:** Automatic 2-second interval before retrying after a "Quota Exceeded (429)" error.

### 3.10. Settings & API Management
*   **Persistence:** Personal API keys are saved in `localStorage`.
*   **Status Indicator:** Settings modal displays key status and last 4 digits.
*   **Storage Error Handling:** Automatically handles `QuotaExceededError` for LocalStorage by removing oldest history items to ensure successful saving.

### 3.11 Draft Richness Configuration
*   **Purpose:** Allows users to control the detail level of the generated draft structure.
*   **Modes:**
    *   **Simple:** Minimalist sketch for structure verification.
    *   **Normal:** Standard balanced draft.
    *   **Rich (Default):** High-end commercial storyboard quality. Emphasizes hatching, motion lines, bold arrows, and dramatic character poses.
*   **UI:** 3-mode selector with tooltip descriptions above the aspect ratio settings.

#### 3.12. 納品用「文字なし素材」作成機能 (Text-Free Material)
*   **目的:** ココナラ等のプロフェッショナルな納品において、ユーザー（制作者）が外部ツール（Photoshop, Canva等）で高品質な文字を自ら入れるための「背景素材」を提供。
*   **ロジック (Targeted Erasure):** 
    *   構成案（`draftData`）からタイトルやステップ名を抽出し、AIに対して「これらの特定の単語を画像から完全に削除せよ」と明示的に命令。
    *   **物理的指示:** 「背景色で塗りつぶし」「フェイク文字禁止」「枠組みは維持」という、デザイン意図に則った日本語プロンプトを使用。
*   **モデルスイッチ戦略 (Model Switching):**
    *   通常の清書には描写力の高い `Imagen 3` や `Gemini 3 Pro` を使用。
    *   文字消しタスクには、禁止命令（負の制約）に強い `gemini-1.5-pro-002` または `gemini-2.0-flash-exp` を動的に選択して実行。

### 3.13. 画質の限界突破 (Ultra-Resolution Engine)
*   **プロンプト密度2倍化:** APIへの指示に「8k解像度」「超高精細テクスチャ」「マスターワーク」等のキーワードを常時付与し、1024px内の視覚密度を最大化。
*   **高精細モード (SVG優先):** 
    *   UIにトグルボタンを追加。ONの場合、AIに「無限解像度のSVGベクターコード」での出力を最強レベルで要求。
    *   ノートPCや大型ディスプレイでも一切荒れない、圧倒的な鮮明さを実現。
*   **無劣化エクスポート (Lossless Export):**
    *   キャンバスからの保存形式を `PNG 100% Quality` に固定。保存時の再圧縮による劣化を完全に排除。

## 4. Expansion of Contents
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

### Phase 5: プロフェッショナル品質への進化 (Professional Polish)
14. **ドラフト生成エンジンの強化:**
    *   **リッチネス選択機能:** Draft生成時に書き込み量を「Simple / Normal / Rich」から選択可能に。
    *   **Richモードのプロンプト刷新:**
        *   「High-End Commercial Storyboard」から「Masterpiece Hand-Drawn Infographic」へ指示を昇華。
        *   **ハッチング（陰影）**、**極太の曲線矢印**、**漫画的なキャラクター演技**、**明確なパネル割り**を必須要件化。
15. **モバイル最適化 (Responsive):**
    *   タイトル文字サイズの自動縮小。
    *   スタイル選択・リッチ度選択・アスペクト比選択などのグリッドを、スマホ画面では2列表示に変更しタップしやすく改善。
    *   履歴・設定モーダルをスマホ全幅表示に対応。
16. **API不具合修正:**
    *   Gemini 3 Pro Image Previewにおける「AspectRatio指定エラー」を回避するため、アスペクト比指示をSystem ConfigからPrompt Textへ移動。


### Phase 6: 文字なし素材化と究極の画質向上 (Pro-Delivery & Ultra-Resolution)
17. **納品エコシステムの構築:**
    *   清書完了画面に「文字なし背景素材を作成」ボタンを追加。
    *   AIに文字を「模様」ではなく「除去対象物」と認識させる「指名手配（Keyword Removal）」プロンプトを開発。
18. **画質クオリティの再定義:**
    *   「高精細モード (SVG優先)」を実装し、ドット絵の制約を超えたベクター図解の出力を強化。
    *   保存品質を無劣化PNG(1.0)に固定。
    *   プロンプトエンジニアリングにより、標準解像度内での情報の描き込み密度を大幅に向上。
19. **インテリジェント・モデルスイッチ:**
    *   タスクの性質（描画 vs 編集）に合わせて、バックエンドで Gemini 3 Pro / 1.5 Pro / 2.0 Flash を秒単位で切り替えて最適化するロジックを実装。
