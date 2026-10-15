import { TUNING_FIELDS, validateTuning } from './devTuning.js';

// Compatibility stays available for user imports. Shipping presets must be complete.
export function validateProductionTuning(input) {
  const clean = validateTuning(input);
  const missing = TUNING_FIELDS.filter(([group, key]) => !Object.hasOwn(input[group] ?? {}, key));
  if (missing.length) {
    throw new Error(`公開設定に不足があります：${missing.map(([g, k]) => `${g}.${k}`).join(', ')}`);
  }
  return clean;
}
