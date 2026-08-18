// src/compatibility/rulesCatalogue.ts
//
// Turns COMPATIBILITY_RULES.md's rule tables into structured data,
// for the rule-by-rule reference page (part of item 4's compatibility
// SEO surface). This describes the 103 rules already implemented in
// ./engine.ts -- it does not implement or evaluate any of them.
//
// The markdown file is the single source of truth: every id, rule
// description, form, fields-needed and severity cell is parsed
// straight out of it, so this can't hand-copy-and-drift from the doc.
// The one exception is IMPLEMENTED_BY below, a small hand-verified
// map from rule ID to the engine.ts function that implements it --
// kept as plain data (rather than parsed from engine.ts's source at
// request time) because the compiled Docker image only ships dist/
// *.js, not the original .ts, so there is no engine.ts source text to
// read at runtime there. Verified against engine.ts's JSDoc headers
// directly (every `/** R-XX-## ... */` comment above an `export
// function`) on 2026-08-16; re-check this map if a rule is re-homed
// to a different function.

import fs from 'fs';
import path from 'path';

export interface RuleFormDef {
  key: string; // 'A'..'F'
  shape: string;
  example: string;
}

export interface RuleEntry {
  id: string;
  sectionNumber: number;
  sectionTitle: string;
  rule: string;
  form: string;
  fields: string | null;
  /** Normalised to one of critical | warning | info | advisory. */
  severity: string;
  /** The full "Severity" cell, including any note after the leading word. */
  severityDetail: string;
  /** engine.ts function whose JSDoc names this rule ID, or null if none does (shouldn't happen for any of the 103 -- see IMPLEMENTED_BY below). */
  implementedBy: string | null;
}

// Hand-verified against src/compatibility/engine.ts -- see file header
// comment above for why this isn't parsed from that file at runtime.
// Two functions joined with " / " means the doc lists one rule ID for
// a pair of near-identical front/rear or bolt/direct-mount functions.
const IMPLEMENTED_BY: Record<string, string> = {
  'R-HS-01': 'checkHeadsetTaper', 'R-HS-02': 'checkHeadsetCups', 'R-HS-03': 'checkCrownRace',
  'R-FRK-01': 'checkSteererLength', 'R-FRK-02': 'checkForkTravel', 'R-FRK-03': 'checkAxleToCrown',
  'R-FRK-04': 'checkForkWheelDiameter', 'R-FRK-05': 'checkRigidForkCorrection', 'R-FRK-06': 'checkForkOffset',
  'R-BB-01': 'checkBbShellMatch', 'R-BB-02': 'checkSpindleMatch', 'R-BB-03': 'checkBbShellWidth',
  'R-BB-04': 'checkBbThreadDirection', 'R-BB-05': 'checkSpindleLength',
  'R-CRK-01': 'checkChainline', 'R-CRK-02': 'checkChainringClearance', 'R-CRK-03': 'checkQFactor', 'R-CRK-04': 'checkCrankLength',
  'R-CHR-01': 'checkChainringMount', 'R-CHR-02': 'checkChainringMount',
  'R-CHR-03': 'checkChainringOffset', 'R-CHR-04': 'checkNarrowWide',
  'R-DRV-01': 'checkShifterDerailleurPull', 'R-DRV-02': 'checkShifterDerailleurSpeeds',
  'R-DRV-03': 'checkElectronicEcosystem', 'R-DRV-04': 'checkMaxCog', 'R-DRV-05': 'checkTotalCapacity',
  'R-DRV-06': 'checkCageLength', 'R-DRV-07': 'checkChainSpeeds', 'R-DRV-08': 'checkChainStandard',
  'R-DRV-09': 'checkChainLength', 'R-DRV-10': 'checkCassetteShifterSpeeds',
  'R-FH-01': 'checkFreehubBody', 'R-FH-02': 'checkXdrSpacer', 'R-FH-03': 'checkHgSpacer', 'R-FH-04': 'checkFreehubBody',
  'R-HGR-01': 'checkUdhTransmission', 'R-HGR-02': 'checkHangerFit', 'R-HGR-03': 'checkDerailleurMount',
  'R-BRK-01': 'checkRearBrakeMount', 'R-BRK-02': 'checkFrontBrakeMount',
  'R-BRK-03': 'checkFrontRotorAdapter / checkRearRotorAdapter',
  'R-BRK-04': 'checkFrontRotorMax / checkRearRotorMax',
  'R-BRK-05': 'checkRotorHubMount', 'R-BRK-06': 'checkLockringClearance', 'R-BRK-07': 'checkBrakeFluid',
  'R-BRK-08': 'checkBrakeSystemFamily', 'R-BRK-09': 'checkBrakeActuation', 'R-BRK-10': 'checkPadShape',
  'R-BRK-11': 'checkRotorThickness', 'R-BRK-12': 'checkRimBrakeTrack',
  'R-TIR-01': 'checkFrontTyreClearance / checkRearTyreClearance',
  'R-TIR-02': 'checkFrontTyreClearance / checkRearTyreClearance',
  'R-TIR-03': 'checkTyreRimWidth', 'R-TIR-04': 'checkHookless', 'R-TIR-05': 'checkTubelessRim',
  'R-TIR-06': 'checkValveHole', 'R-TIR-07': 'checkValveLength', 'R-TIR-08': 'checkTubeSize', 'R-TIR-09': 'checkRimPlusTyreClearance',
  'R-AXL-01': 'checkRearAxleMatch', 'R-AXL-02': 'checkFrontAxleMatch', 'R-AXL-03': 'checkRearAxleThreadPitch',
  'R-AXL-04': 'checkDropoutType', 'R-AXL-05': 'checkRearAxleMatch / checkFrontAxleMatch',
  'R-SHK-01': 'checkShockSize', 'R-SHK-02': 'checkShockMount', 'R-SHK-03': 'checkShockHardware',
  'R-SHK-04': 'checkShockSizingStandard', 'R-SHK-05': 'checkShockReservoir', 'R-SHK-06': 'checkCoilSpringRate',
  'R-SHK-07': 'checkCoilSuitability',
  'R-SP-01': 'checkSeatpostDiameter', 'R-SP-02': 'checkDropperRouting', 'R-SP-03': 'checkSeatpostInsertion',
  'R-SP-04': 'checkDropperTravel', 'R-SP-05': 'checkSeatClamp', 'R-SP-06': 'checkSaddleRails', 'R-SP-07': 'checkDropperRemote',
  'R-CKP-01': 'checkStemBarClamp', 'R-CKP-02': 'checkStemSteerer', 'R-CKP-03': 'checkControlClampDiameter',
  'R-CKP-04': 'checkBarControlType', 'R-CKP-05': 'checkIntegratedCockpit', 'R-CKP-06': 'checkBarInternalRouting',
  'R-CKP-07': 'checkCockpitFit',
  'R-PDL-01': 'checkPedalThread', 'R-PDL-02': 'checkCleatSystem', 'R-PDL-03': 'checkSoleDrilling',
  'R-FD-01': 'checkFdMount', 'R-FD-02': 'checkFdPullDirection', 'R-FD-03': 'checkFdChainring', 'R-FD-04': 'checkFdSpeeds',
  'R-MNT-01': 'checkChainGuideMount', 'R-MNT-02': 'checkCableRouting', 'R-MNT-03': 'checkHosePorts',
  'R-MNT-04': 'checkBottleMounts', 'R-MNT-05': 'checkEyelets', 'R-MNT-06': 'checkHousingType',
  'R-FIT-01': 'checkFrameSizeHeight', 'R-FIT-02': 'checkStandover', 'R-FIT-03': 'checkReachStack',
  'R-FIT-04': 'checkCrankLength',
};

const RULES_MD_PATH = path.join(__dirname, '..', '..', 'COMPATIBILITY_RULES.md');

function splitRow(line: string): string[] {
  const trimmed = line.trim().replace(/^\|/, '').replace(/\|$/, '');
  return trimmed.split('|').map((c) => c.trim());
}

function isSeparatorRow(cells: string[]): boolean {
  return cells.length > 0 && cells.every((c) => /^:?-+:?$/.test(c));
}

function normaliseSeverity(cell: string): { severity: string; detail: string } {
  const detail = cell.trim();
  const m = detail.match(/^(critical|warning|info|advisory)/i);
  return { severity: m ? m[1].toLowerCase() : 'info', detail };
}

/** Parses the "Rule forms" A–F legend table near the top of the doc. */
function parseRuleForms(lines: string[]): RuleFormDef[] {
  const forms: RuleFormDef[] = [];
  let inTable = false;
  for (const line of lines) {
    if (/^\|\s*Form\s*\|\s*Shape\s*\|\s*Example\s*\|/.test(line)) { inTable = true; continue; }
    if (!inTable) continue;
    if (!line.trim().startsWith('|')) { if (forms.length) break; else continue; }
    const cells = splitRow(line);
    if (isSeparatorRow(cells) || cells.length < 3) continue;
    const keyMatch = cells[0].match(/^\*\*([A-F])\s*—/) || cells[0].match(/^([A-F])\s*—/);
    if (!keyMatch) continue;
    forms.push({ key: keyMatch[1], shape: cells[1], example: cells[2] });
  }
  return forms;
}

/**
 * Parses every `## N. <title>` section (1–16) and the rule table(s)
 * beneath it. Column count differs by section (section 16 has no
 * "Fields needed" column) so header cells are read fresh per table
 * rather than assumed fixed-width.
 */
function parseRules(lines: string[]): Omit<RuleEntry, 'implementedBy'>[] {
  const rules: Omit<RuleEntry, 'implementedBy'>[] = [];
  let sectionNumber = 0;
  let sectionTitle = '';
  let headers: string[] | null = null;

  for (const line of lines) {
    const sectionMatch = line.match(/^## (\d+)\.\s*(.+)$/);
    if (sectionMatch) {
      sectionNumber = Number(sectionMatch[1]);
      sectionTitle = `${sectionMatch[1]}. ${sectionMatch[2].trim()}`;
      headers = null;
      continue;
    }
    if (/^## /.test(line)) {
      // A non-numbered heading ("Implementation status", "Rule forms")
      // is never a rule table -- stop tracking headers until the next
      // numbered section, and stop entirely once past section 16.
      if (sectionNumber >= 16) break;
      headers = null;
      continue;
    }
    if (sectionNumber < 1 || !line.trim().startsWith('|')) continue;

    const cells = splitRow(line);
    if (cells[0] === 'ID') { headers = cells; continue; }
    if (!headers || isSeparatorRow(cells)) continue;

    const idMatch = cells[0].match(/^(R-[A-Z]+-\d+)/);
    if (!idMatch) continue; // a stray table row that isn't a rule (shouldn't occur)

    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = cells[i] ?? ''; });
    const { severity, detail } = normaliseSeverity(row['Severity'] ?? '');

    rules.push({
      id: idMatch[1],
      sectionNumber,
      sectionTitle,
      rule: row['Rule'] ?? '',
      form: row['Form'] ?? '',
      fields: row['Fields needed'] || null,
      severity,
      severityDetail: detail,
    });
  }
  return rules;
}

let cache: { rules: RuleEntry[]; forms: RuleFormDef[] } | null = null;

export function getRuleCatalogue(): { rules: RuleEntry[]; forms: RuleFormDef[] } {
  if (cache) return cache;
  try {
    const md = fs.readFileSync(RULES_MD_PATH, 'utf8');
    const lines = md.split(/\r?\n/);
    const forms = parseRuleForms(lines);
    const rules = parseRules(lines).map((r) => ({ ...r, implementedBy: IMPLEMENTED_BY[r.id] ?? null }));
    cache = { rules, forms };
  } catch (err) {
    // A missing/unreadable doc shouldn't take the whole API down --
    // the rule-reference routes just report an empty catalogue.
    // eslint-disable-next-line no-console
    console.error('rulesCatalogue: failed to read/parse COMPATIBILITY_RULES.md', err);
    cache = { rules: [], forms: [] };
  }
  return cache;
}

export function getRuleById(id: string): RuleEntry | undefined {
  const { rules } = getRuleCatalogue();
  return rules.find((r) => r.id.toLowerCase() === id.toLowerCase());
}
