import React, { useRef } from 'react';
import { createPilotController, PILOT_EXPRESSIONS, PILOT_SHEET } from './pilotExpressions.js';

export default function PilotPortrait({ telemetry }) {
  const controller = useRef(null);
  if (!controller.current) controller.current = createPilotController();
  const action = controller.current(telemetry);
  const expression = PILOT_EXPRESSIONS[action.expression] ?? PILOT_EXPRESSIONS.neutral;
  const standalone = Boolean(expression.src);
  const style = {
    backgroundImage: `url("${expression.src ?? PILOT_SHEET.src}")`,
    backgroundSize: standalone ? 'cover' : `${PILOT_SHEET.columns * 100}% 100%`,
    backgroundPosition: standalone ? 'center' : `${expression.frame / (PILOT_SHEET.columns - 1) * 100}% 0`,
    aspectRatio: expression.aspectRatio ?? PILOT_SHEET.aspectRatio,
  };
  return <figure className="proto-pilot" data-testid="pilot-portrait" data-action={action.id} data-expression={action.expression}>
    <div className="proto-pilot-image" role="img" aria-label={`パイロット：${expression.label}`} style={style}/>
    <figcaption><span className="proto-label">PILOT</span><span>{action.label}</span></figcaption>
  </figure>;
}
