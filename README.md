# AI Fashion Gift（iPhone対応・Instagram向け）


友達の奥様に「AIコーデ画像」を贈れる、**コピペ即デプロイ**のNext.jsアプリです。
顔写真をアップ、要望を入力 → AIが**コーデ提案（3案）**と**画像**を作成。
エディタで「顔はめ」して画像を書き出し、**Instagramにそのまま投稿**できます。


> ✅ **初心者OK**：GitHubとVercelの画面操作だけで動きます
> ✅ **iPhone**：カメラから直接アップ、共有シートでInstagramへ
> ✅ **プライバシー**：顔画像は**端末内のCanvasのみ**で編集／サーバー保存しません


---


## 1) 準備するもの
- OpenAI APIキー（https://platform.openai.com/）
- GitHubアカウント（無料）
- Vercelアカウント（無料）


> **Instagram自動投稿（任意）**を使う場合のみ、Instagramビジネスアカウント + Facebook開発者設定が必要です。


---


## 2) 最短デプロイ手順（GitHub → Vercel）


**A. GitHubにリポジトリを作成**
1. 右上「＋」→ New repository
2. Repository name：`ai-fashion-gift` → Create repository
3. Upload files → このフォルダの中身をドラッグ＆ドロップ → Commit changes


**B. Vercelでデプロイ**
1. https://vercel.com/new → Add New Project → GitHub連携 → `ai-fashion-gift` を Import
2. Environment Variables に `OPENAI_API_KEY` を追加
3. Deploy → 数十秒で `https://xxxxx.vercel.app` が表示


---


## 3) 使い方（iPhoneおすすめ）
1. 生成URLをiPhoneで開く
2. 顔写真をアップ
3. 欲しいテイスト・色・予算など入力 → 「AIにコーデ案を作ってもらう」
4. 好きな案で「この案で画像を作る」→ 顔はめで調整
5. ダウンロード or 共有シートからInstagramへ


> ホーム画面に追加（PWA）するとアプリのように使えます。


---


## 4) 技術メモ
- コーデ提案：OpenAI Responses（gpt-4o-mini）
- 画像生成：gpt-image-1（縦長、シンプル背景）
- 顔はめ：Canvas（ローカル処理）
- Instagram自動投稿：Graph API（ビジネスのみ・任意）


---


## 5) プライバシー
- 顔写真は本人同意のうえで使用してください
- 顔画像は端末内のみで合成・保存（サーバーへ保存／送信はしません）
