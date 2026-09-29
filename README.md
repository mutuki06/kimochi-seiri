# 気持ちの整理

嫌なことがあったとき、自分まで嫌いになってしまう前に、一緒に整理する場所。

鳥のマスコットと一緒に、
気持ち → 出来事 → 頭に浮かんだこと → 本当につらかったこと → 別の見方 → 今日のあなたへ
の順に気持ちをほどいていくセルフケア用 PWA。医療・診断・カウンセリングを目的としない。

- シマエナガ：気持ちを受け止める（最初の声かけ、選んだ考え・つらさへのひとこと、「こんな人もいる」）
- タカ：少し離れて見る（出来事と考えを分ける、別の可能性、別の見方）
- よくある自己否定のパターン（シナリオ）：甘えている気がする／嫌われた気がする／自分だけうまくできない気がする

## 起動

ビルド不要。任意の静的サーバーで配信する（Service Worker のため `file://` では PWA 機能が動かない）。

```bash
python3 -m http.server 8765
```

http://localhost:8765 を開く。

## 構成

| ファイル | 役割 |
|---|---|
| `index.html` / `style.css` | 画面の土台・デザイン（ライト/ダーク、文字サイズ2段階） |
| `js/app.js` | ハッシュルーティングと各画面（Home / Consultation / Reflection / History / Record / Memo / Settings / Support） |
| `js/data.js` | 選択肢・シナリオ別の出来事/考え/つらさ・相談先。**id は保存データに使うので変更しない**（旧版の選択肢は `legacy: true` で表示用に残す） |
| `js/birds.js` | マスコットの SVG |
| `js/db.js` | IndexedDB（`records` / `memos`）、正規化、JSON エクスポート/インポート |
| `js/logic.js` | ルールベースの整理ロジック（考えのタグ付け、シナリオ推定、鳥のひとこと、別の見方、「こんな人もいる」、今日の言葉、類似記録、安全確認）。文言ルール（診断しない・一般化しない等）は冒頭コメント参照 |
| `sw.js` | オフライン用キャッシュ。ファイル更新時は `CACHE` の番号を上げる |

## 方針

- ログイン・サーバー・外部 API なし。記録は端末内の IndexedDB のみ。localStorage は表示設定だけ。
- 自己肯定感スコア・連続記録・ログイン促しなどは実装しない。
- アドバイスはユーザーが開いたときだけ表示し、断定しない・相手の意図を推測しない。
- 深刻な内容（自傷・希死念慮など）を検知したら、整理より先に相談先を案内する（`logic.js` の `CRISIS_RE`）。
- 生成 AI を追加する場合は `logic.js` の `adviceProvider` を差し替える。

## データ

相談記録（`records`）の主なフィールド：
`id, createdAt, updatedAt, status(draft|saved), initialMood, eventText, emotions[], facts[], interpretations[], unknowns[], coreConcern, scenario, perspectiveResponse, todayMessage, chosenAction, adviceViewed, outcome, outcomeNote, outcomeDate, personalMemo, replyDraft, reflectionNote, safetyFlag, schemaVersion`

構造を変えるときは `db.js` の `DB_VERSION` / `SCHEMA_VERSION` を上げ、`normalizeRecord` と `onupgradeneeded` に移行処理を足す。インポートは既存データを消さず、同じ id は `updatedAt` が新しい方を残す。
