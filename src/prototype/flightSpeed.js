import { poweredThrust } from './equipment.js';

export const TUNING = {
  minimumSpeed: 12,
  cruiseMultiplier: 1.44,
  maxSpeed: 60,
  observation: 140,
};

// Preserve the existing distinction: initial velocity is uncapped; flight ticks
// cap the base cruise speed before applying the configured multiplier.
export function cruiseSpeed(ship, energy, tuning, { initial = false } = {}) {
  const base = (TUNING.minimumSpeed + poweredThrust(ship, energy)) * TUNING.cruiseMultiplier;
  const multiplier = tuning?.ship.speedMultiplier ?? 1;
  return initial
    ? base * multiplier
    : Math.max(TUNING.minimumSpeed, Math.min(TUNING.maxSpeed, base) * multiplier);
}
