import { readFile } from 'node:fs/promises';
import { validateProductionTuning } from '../src/prototype/productionTuningValidation.js';
import { TUNING_FIELDS } from '../src/prototype/devTuning.js';

try {
  const input = JSON.parse(await readFile(new URL('../src/prototype/productionTuning.json', import.meta.url), 'utf8'));
  validateProductionTuning(input);
  console.log(`公開設定：${TUNING_FIELDS.length}項目の型・範囲・必須キーを確認しました。`);
} catch (error) {
  console.error(`公開設定エラー：${error.message}`);
  process.exitCode = 1;
}
