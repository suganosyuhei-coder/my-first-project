import { compareTuning } from './tuningComparison.js';
import { productionTuning } from './runtimeTuning.js';
import { DEV_SCENARIOS } from './devScenarios.js';
import React, { useState } from 'react';
import {
  defaultTuning, TUNING_FIELDS, readTuning, saveTuning, validateTuning,
} from './devTuning.js';
import './devTuning.css';

function download(value) {
  const blob = new Blob(
    [JSON.stringify(validateTuning(value), null, 2) + '\n'],
    { type: 'application/json' },
  ),
    url = URL.createObjectURL(blob),
    link = document.createElement('a');
  link.href = url;
  link.download = 'shutle-tuning.json';
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function DevTuningPanel({ game, telemetry, onScenario }) {
  const [initial] = useState(() => {
    try {
      return readTuning(localStorage);
    } catch (e) {
      return { value: defaultTuning(), error: e.message };
    }
  });
  const [saved, setSaved] = useState(initial.value);
  const [scene, setScene] = useState('normal');
  const [showAll, setShowAll] = useState(false);
  const [published] = useState(productionTuning);
  const [value, setValue] = useState(() => game.current.tuning ?? initial.value),
    [baseline, setBaseline] = useState(() => game.current.tuning ?? initial.value),
    [open, setOpen] = useState(false),
    [message, setMessage] = useState(initial.error ?? ''),
    [json, setJson] = useState(''),
    [drafts, setDrafts] = useState({});

  function apply(next, clearDrafts = true) {
    try {
      const clean = validateTuning(next);
      game.current.tuning = clean;
      setValue(clean);
      if (clearDrafts) setDrafts({});
      setMessage('未確定の変更を反映中');
    } catch (e) {
      setMessage(e.message);
    }
  }

  function confirm() {
    try {
      const clean = saveTuning(localStorage, value);
      setBaseline(clean);
      setSaved(clean);
      setMessage('保存成功：次回の開発起動時にも反映されます');
    } catch (e) {
      setMessage(`保存失敗：${e.message}。JSON出力で保存できます`);
    }
  }

  function exportJSON() {
    try {
      download(value);
      setMessage('JSONを出力しました');
    } catch (e) {
      setMessage(`JSON出力失敗：${e.message}`);
    }
  }

  function importJSON(text) {
    try {
      apply(validateTuning(JSON.parse(text)));
      setMessage('JSONを読み込みました（未確定）');
    } catch (e) {
      setMessage(`読込失敗：${e.message}`);
    }
  }

  const comparisons = compareTuning(value, saved, published);
  const differences = comparisons.filter(row => row.savedDiffers || row.publishedDiffers);
  const recentHits = telemetry?.damageReport?.hits ?? [];
  const dirty = JSON.stringify(value) !== JSON.stringify(baseline);

  return (
    <aside className="dev-tuning" aria-label="開発者用調整">
      <button
        className="dev-tuning-toggle"
        aria-expanded={open}
        onClick={() => setOpen(v => !v)}
      >
        {open ? '調整パネルを閉じる' : 'DEV 調整'}
      </button>
      {open && (
        <div className="dev-tuning-panel">
          <h2>リアルタイム調整 <small>DEV ONLY</small></h2>
          <p>航行状態は維持。確定値はこのブラウザだけに保存。本番への反映は別途指示。</p>
          <section className="dev-tuning-tools" aria-label="開発用の場面選択">
            <h3>場面選択</h3>
            <p>現在の航行をテスト航行に置き換えます。調整値は維持し、航行履歴・累計時間には加算しません。開始時は一時停止します（終了画面の場面を除く）。</p>
            <label>テスト場面
              <select aria-label="テスト場面" value={scene} onChange={e => setScene(e.target.value)}>
                {DEV_SCENARIOS.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}
              </select>
            </label>
            <button onClick={async () => {
              try { await onScenario(scene); setMessage('テスト場面を開始しました（記録対象外）'); }
              catch (error) { setMessage(`場面を開始できません：${error.message}`); }
            }}>テスト航行に置き換える</button>
            {game.current.developmentScenario && <p role="status">テスト航行中 · 記録対象外</p>}
          </section>
          <details className="dev-tuning-tools">
            <summary>設定の比較 · 差分{differences.length}項目 / 全{comparisons.length}項目</summary>
            <p>現在値／このブラウザの保存値／公開用JSON。公開サイトの更新状況とは別の比較です。</p>
            <label><input type="checkbox" checked={showAll} onChange={e => setShowAll(e.target.checked)}/>全項目を表示</label>
            <table aria-label="調整設定の比較">
              <thead><tr><th>項目</th><th>現在</th><th>保存</th><th>公開JSON</th></tr></thead>
              <tbody>{(showAll ? comparisons : differences).map(row => (
                <tr key={row.key}><th scope="row">{row.label}</th><td>{row.current}</td>
                  <td className={row.savedDiffers ? 'is-different' : ''}>{row.saved}</td>
                  <td className={row.publishedDiffers ? 'is-different' : ''}>{row.published}</td></tr>
              ))}</tbody>
            </table>
            {!differences.length && <p>全36項目が一致しています。</p>}
          </details>
          <details className="dev-tuning-tools">
            <summary>直近10秒の被ダメージ · {recentHits.length}件</summary>
            <p>実際に減ったHPを表示（最大80件）。通常の航行・戦闘への介入はありません。</p>
            <ol className="dev-damage-list">{recentHits.slice().reverse().map(hit => (
              <li key={hit.sequence}>T+{hit.at.toFixed(1)}s · {hit.source}<br/>
                セル {hit.cell.x}/{hit.cell.y} · −{hit.damage.toFixed(1)}HP
                {' · '}損傷セル率 {Math.round(hit.ratioBefore * 100)}% → {Math.round(hit.ratioAfter * 100)}%</li>
            ))}</ol>
            {!recentHits.length && <p>この期間の被ダメージなし</p>}
          </details>
          {TUNING_FIELDS.map(([group, key, label, min, max, step]) => (
            <div className="dev-tuning-field" key={`${group}.${key}`}>
              <label htmlFor={`tune-${group}-${key}`}>{label}</label>
              <input
                aria-label={`${label} スライダー`}
                type="range"
                min={min}
                max={max}
                step={step}
                value={value[group][key]}
                onChange={e => apply({
                  ...value,
                  [group]: { ...value[group], [key]: Number(e.target.value) },
                })}
              />
              <input
                id={`tune-${group}-${key}`}
                aria-label={`${label} 数値`}
                type="number"
                min={min}
                max={max}
                step={step}
                value={drafts[`${group}.${key}`] ?? value[group][key]}
                onBlur={() => setDrafts(d => {
                  const next = { ...d };
                  delete next[`${group}.${key}`];
                  return next;
                })}
                onChange={e => {
                  const text = e.target.value;
                  setDrafts(d => ({ ...d, [`${group}.${key}`]: text }));
                  if (text !== '') apply({
                    ...value,
                    [group]: { ...value[group], [key]: Number(text) },
                  }, false);
                }}
              />
            </div>
          ))}
          <div className="dev-tuning-actions">
            <button onClick={() => apply(baseline)}>未確定の変更を破棄</button>
            <button onClick={() => apply(defaultTuning())}>初期値へ戻す</button>
            <button onClick={confirm}>設定を確定</button>
            <button onClick={exportJSON}>JSON出力</button>
          </div>
          <p>{dirty ? '未確定の変更あり' : '確定値と一致'}</p>
          <label>
            JSONファイル読み込み
            <input
              type="file"
              accept=".json,application/json"
              onChange={async e => {
                const file = e.target.files?.[0];
                if (!file) return;
                try {
                  if (file.size > 20000) throw new Error('設定ファイルが大きすぎます');
                  importJSON(await file.text());
                } catch (err) {
                  setMessage(`読込失敗：${err.message}`);
                }
                e.target.value = '';
              }}
            />
          </label>
          <label>
            JSONテキスト
            <textarea
              aria-label="設定JSON"
              value={json}
              onChange={e => setJson(e.target.value)}
              placeholder="JSONを貼り付け"
            />
          </label>
          <button onClick={() => importJSON(json)}>JSONを読み込む</button>
          <p role="status">{message}</p>
        </div>
      )}
    </aside>
  );
}
