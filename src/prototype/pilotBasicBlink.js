import settings from './pilotBasicBlink.json' with {type:'json'};

export const BASIC_PORTRAITS = [
  ['hannme_01', '基本・半目', new URL('../assets/pilot/sukosi_itai_04.jpg', import.meta.url).href],
  ['hannme_02', '閉じかけ', new URL('../assets/pilot/sukosi_itai_04.jpg', import.meta.url).href],
  ['hannme_03', '完全閉眼', new URL('../assets/pilot/sukosi_itai_04.jpg', import.meta.url).href],
].map(([id, label, src]) => ({id, label, src, filename:'sukosi_itai_04.jpg', crop: {x:0, y:0, width:180, height:213, sourceWidth:180, sourceHeight:213, referenceWidth:180}}));

export function validateBasicBlink(input) {
  const {intervalMs, durationMs, frameDurationsMs} = input ?? {};
  if (!Number.isFinite(intervalMs) || intervalMs < 1000 || intervalMs > 30000) throw new Error('瞬き間隔は1000〜30000msで指定してください');
  if (!Number.isFinite(durationMs) || durationMs < 120 || durationMs > 200) throw new Error('瞬き全体は120〜200msで指定してください');
  if (!Array.isArray(frameDurationsMs) || frameDurationsMs.length !== 4 || frameDurationsMs.some(n => !Number.isFinite(n) || n <= 0)) throw new Error('各コマに正の表示時間を4つ指定してください');
  return {intervalMs, durationMs, frameDurationsMs: [...frameDurationsMs]};
}
export const BASIC_BLINK = validateBasicBlink(settings);
const sequence = [0, 1, 2, 1];
// The four durations are proportions when the overall duration is adjusted.
export function basicBlinkFrame(elapsedMs, reducedMotion = false, config = BASIC_BLINK) {
  if (reducedMotion || !Number.isFinite(elapsedMs) || elapsedMs < 0) return 0;
  const phase = elapsedMs % (config.intervalMs + config.durationMs) - config.intervalMs;
  if (phase < 0) return 0;
  const total = config.frameDurationsMs.reduce((sum, n) => sum + n, 0);
  let boundary = 0;
  for (let i = 0; i < sequence.length; i++) {
    boundary += config.frameDurationsMs[i] * config.durationMs / total;
    if (phase < boundary) return sequence[i];
  }
  return 0;
}
