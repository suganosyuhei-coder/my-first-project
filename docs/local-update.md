# Macで最新変更を確認する

作業ブランチは `floating-workshop-preview` です。クラウドのファイルやブラウザ内設定はMacへ自動同期されません。GitHubへのpush後、Macでソースを取り込みます。

1. MacのCodexで `~/Documents/01_プロジェクト/my-first-project` をローカルプロジェクトとして開きます。Finderでフォルダーを選択すると、日本語フォルダー名の文字表現の違いを避けられます。
2. Macのプロジェクト内で `git status --short` を確認します。ローカル変更がある場合は取り込み前に内容を確認し、削除・リセット・無断の上書きを行いません。変更がない場合は次を実行します。

   ```bash
   git switch floating-workshop-preview
   git pull --ff-only origin floating-workshop-preview
   ```

3. `package.json` とロックファイルは変更していないため、既にインストール済みなら依存の再インストールは不要です。初回のみNode.js 24のarm64版で `npm ci` を実行します。
4. 起動中のViteを再利用して `http://localhost:5173/prototype.html` を開きます。取り込み後は一度再読み込みしてください。サーバーが止まっていたら `npm run dev -- --port 5173 --strictPort` を実行します。
5. 通常画面で表情・セリフ、タンク連結、エンジンの噴射、Shift急旋回・離して加速、惑星・銀河の流れを確認します。急旋回・急加速は稼働エンジン2基以上と蓄積エネルギーが必要です。高エネルギー星雲の敵を早く確認するには `http://localhost:5173/prototype.html?demo=enemies` を開きます。これは別の試行として起動する開発用デモです。
6. `npm test` と `npm run build` を実行します。ブラウザ自動テストを使う場合のみ `npx playwright install chromium` を実行し、`node tests/parts-browser.cjs` で確認します。`SHUTLE_DEV_URL` で開発サーバーのベースURLを指定できます。

回復・加速・旋回・環境流・敵・ビットの係数は右下「DEV 調整」で変更できます。確定済みの旧v1 JSONも利用できます。敵の種類別ステータスは `src/prototype/enemyTypes.json`、表情とセリフは `src/prototype/pilotDialogue.json` で編集します。

今後はMacで小さく修正し、起動中のサーバーのHMRで確認します。クラウドでの追加変更・push・GitHub Pages公開は明示的に指示された場合だけ行います。
