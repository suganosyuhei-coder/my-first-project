import React from 'react';
import {angelReports} from './angelReports.js';
export default function AngelReport({telemetry,records}){
 const reports=angelReports(telemetry,records);if(!reports.length)return null;
 return <section className="proto-angel-report" aria-label="ANGELpack報告" data-testid="angel-report"><h3>&lt;ANGELpack /Report&gt;</h3>{reports.map(report=><div key={report.id} data-report={report.id}>{report.id.startsWith('cause-')&&<span>{report.label}</span>}<p>{report.line}</p></div>)}</section>;
}
