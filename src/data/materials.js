// Density: kg/m³. Rendering and mass calculations use the same definitions.
export const MATERIALS = {
  lead: { name: '鉛', density: 11340, color: '#676b73', metalness: .45, roughness: .85 },
  iron: { name: '鉄', density: 7870, color: '#8794a4', metalness: .9, roughness: .32 },
  gold: { name: '金', density: 19300, color: '#e8b948', metalness: 1, roughness: .22 },
  concrete: { name: 'コンクリート', density: 2400, color: '#a6a69c', metalness: 0, roughness: .98 },
  aluminum: { name: 'アルミニウム', density: 2700, color: '#d9e3e9', metalness: .85, roughness: .25 },
  resin: { name: '樹脂', density: 1100, color: '#6bb5aa', metalness: 0, roughness: .28 },
};
export function shapeVolume(shape, [x,y,z]) {
  if (shape === 'sphere') return 4 / 3 * Math.PI * (x / 2) ** 3;
  if (shape === 'pillar') return Math.PI * (x / 2) ** 2 * y;
  if (shape === 'cone') return Math.PI * (x / 2) ** 2 * y / 3;
  if (shape === 'pyramid') return x * z * y / 3;
  if (shape === 'prism' || shape === 'wedge') return x * y * z / 2;
  return x * y * z;
}
export const shapeMass = (shape, size, material = 'resin') => shapeVolume(shape, size) * MATERIALS[material].density;
export const massLabel = mass => mass >= 1000 ? `${(mass / 1000).toFixed(2)} t` : `${mass.toFixed(mass < 10 ? 2 : 1)} kg`;
