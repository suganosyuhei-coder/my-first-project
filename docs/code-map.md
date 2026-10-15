# SHuTLe — 変更箇所の案内

必要な機能の行だけを起点に調査するための索引。製品要件は `requirements.md`、設計案は `design.md` を参照する。ここには設定値を複製しない。

## 調整設定

| 役割 | ファイル（`src/prototype/`） |
| --- | --- |
| 項目名・範囲・開発初期値・v1互換検証 | `devTuning.js` の `TUNING_FIELDS` |
| 公開版へ明示採用した全項目 | `productionTuning.json` |
| 開発／公開の読み分け | `runtimeTuning.js` |
| 調整・保存・JSON入出力・設定比較UI（開発限定） | `DevTuningPanel.jsx`、`tuningComparison.js` |
| 公開設定の必須キー・範囲チェック | `productionTuningValidation.js` |
| 開発用の場面選択 | `devScenarios.js`（本番には含めない） |
| 起動・リトライへの引き渡し | `useFlight.js` |

公開値・初期適用・継続の検証は、リポジトリ直下の `tests/runtime-tuning.test.js`。

開発では同一ブラウザ・同一オリジンの保存値を使用し、公開では公開用JSONを使用する。調整パネルの確定操作では、ソースファイルや公開版は更新されない。

`boost.js` の `BOOST` や `planetFlow.js` の `PLANET_FLOW` などにも、調整設定が渡されない場合の既定値がある。公開プリセット、開発初期値、未指定時の既定値は役割が違うため、同じ数値が見つかっても一括置換しない。共通化する場合は依存関係と設定未指定のテストを先に確認する。

## 機能ごとの起点

| 変更したい内容 | 主なファイル（`src/prototype/`） |
| --- | --- |
| 初期化・更新処理の呼び出し順 | `game.js` |
| 基本速度・旋回 | `flightSpeed.js`、`game.js`、`model.js` |
| Shift推進・亜空間ダイブ | `boost.js`、`boostInput.js`、`weaponInput.js` |
| 表示倍率・機体の画面内位置 | `camera.js`、`render.js` |
| 惑星・銀河の流れ | `planetFlow.js` |
| 星雲の物理・描画 | `nebula.js`、`NebulaRenderer.js` |
| 通常弾・チャージ攻撃 | `railgun.js`、`weaponInput.js` |
| フォース攻撃 | `force.js`、`forceContact.js` |
| 敵の行動・種類 | `enemies.js`、`enemyTypes.json`、`campaign.js` |
| 補給PAW・白PAW・ミサイル | `supplyPaw.js`、`escortPaw.js`、`missiles.js` |
| 船体損傷・終了判定 | `damage.js`、`shipDamage.js` |
| 被ダメージ履歴・終了直前レポート | `flightDiagnostics.js`、`AngelDamageReport.jsx` |
| 観測済み補給先の低VITAL案内 | `supplyGuidance.js`、`SupplyBearing.jsx` |
| バイタル | `vital.js` |
| 表情・セリフ | `pilotExpressions.js`、`pilotStory.js`、`pilotStoryDialogue.json`、`pilotDialogue.json` |
| 航行履歴・ANGELpack報告 | `angelRecords.js`、`angelReportDialogue.json` |
| 本星撃破後の継続 | `victory.js` |
| 真ボスの出現・区画破壊・追跡・コア判定 | `trueBoss.js`、`trueBossGeometry.js`、`trueBossDamage.js` |
| 真ボス描画・琥珀色のエンディング | `TrueBossVisuals.js`、`TrueEnding.jsx` |
| 開始・停止時の操作説明 | `flightGuide.js`、`useFlight.js` |

## 確認

- 関連する `tests/*.test.js` を先に特定する。ロジック変更時は関連テストに加えて `npm test` と `npm run build` を実行する。
- 整形だけの変更は変換後のJavaScriptを変更前と比較すると、JSX内の空白や文字列を含む意図しない変更も検出できる。
- ローカル確認と公開更新は別作業。公開は明示されたタイミングで行う。
- `npm run check` でテスト・公開設定検証・ビルドをまとめて実行する。`npm run build` 単独でも事前に公開設定を検証する。
