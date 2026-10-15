import { TUNING_FIELDS, validateTuning } from './devTuning.js';

export function compareTuning(current, saved, published) {
  const values = [current, saved, published].map(validateTuning);
  return TUNING_FIELDS.map(([group, key, label]) => {
    const [current, saved, published] = values.map(value => value[group][key]);
    return {
      key: `${group}.${key}`, label, current, saved, published,
      savedDiffers: current !== saved,
      publishedDiffers: current !== published,
    };
  });
}
