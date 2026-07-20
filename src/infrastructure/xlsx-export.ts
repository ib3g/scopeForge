import { calculateTotals } from "@/domain/estimation";
import type { EstimateSnapshot, WorkspaceState } from "@/domain/schemas";

export type XlsxExportMode = "internal" | "client";

type XmlSheet = { name: string; rows: Array<Array<string | number | boolean | { formula: string; value: number }>> };

const encoder = new TextEncoder();

function xml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&apos;");
}

function columnName(index: number) {
  let result = "";
  let value = index + 1;
  while (value > 0) {
    const remainder = (value - 1) % 26;
    result = String.fromCharCode(65 + remainder) + result;
    value = Math.floor((value - 1) / 26);
  }
  return result;
}

function cell(value: XmlSheet["rows"][number][number], address: string) {
  if (typeof value === "object" && value !== null && "formula" in value) {
    return `<c r="${address}"><f>${xml(value.formula.replace(/^=/, ""))}</f><v>${value.value}</v></c>`;
  }
  if (typeof value === "number") return `<c r="${address}"><v>${Number.isFinite(value) ? value : 0}</v></c>`;
  if (typeof value === "boolean") return `<c r="${address}" t="b"><v>${value ? 1 : 0}</v></c>`;
  return `<c r="${address}" t="inlineStr"><is><t xml:space="preserve">${xml(String(value ?? ""))}</t></is></c>`;
}

function sheetXml(sheet: XmlSheet) {
  const rows = sheet.rows.map((row, rowIndex) => `<row r="${rowIndex + 1}">${row.map((value, columnIndex) => cell(value, `${columnName(columnIndex)}${rowIndex + 1}`)).join("")}</row>`).join("");
  const maxColumn = columnName(Math.max(...sheet.rows.map((row) => row.length), 1) - 1);
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><dimension ref="A1:${maxColumn}${Math.max(sheet.rows.length, 1)}"/><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/><selection pane="bottomLeft" activeCell="A2" sqref="A2"/></sheetView></sheetViews><sheetData>${rows}</sheetData><autoFilter ref="A1:${maxColumn}${Math.max(sheet.rows.length, 1)}"/></worksheet>`;
}

function crc32(bytes: Uint8Array) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function u16(value: number) { return new Uint8Array([value & 255, (value >>> 8) & 255]); }
function u32(value: number) { return new Uint8Array([value & 255, (value >>> 8) & 255, (value >>> 16) & 255, (value >>> 24) & 255]); }
function concatBytes(parts: Uint8Array[]) {
  const size = parts.reduce((total, part) => total + part.length, 0);
  const result = new Uint8Array(size);
  let offset = 0;
  parts.forEach((part) => { result.set(part, offset); offset += part.length; });
  return result;
}

function zipStore(files: Array<{ name: string; content: string }>) {
  const locals: Uint8Array[] = [];
  const centrals: Uint8Array[] = [];
  let offset = 0;
  files.forEach((file) => {
    const name = encoder.encode(file.name);
    const content = encoder.encode(file.content);
    const crc = crc32(content);
    locals.push(concatBytes([new Uint8Array([0x50, 0x4b, 0x03, 0x04]), u16(20), u16(0), u16(0), u16(0), u16(0), u32(crc), u32(content.length), u32(content.length), u16(name.length), u16(0), name, content]));
    centrals.push(concatBytes([new Uint8Array([0x50, 0x4b, 0x01, 0x02]), u16(20), u16(20), u16(0), u16(0), u16(0), u16(0), u32(crc), u32(content.length), u32(content.length), u16(name.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(offset), name]));
    offset += locals[locals.length - 1].length;
  });
  const central = concatBytes(centrals);
  return concatBytes([...locals, central, new Uint8Array([0x50, 0x4b, 0x05, 0x06]), u16(0), u16(0), u16(files.length), u16(files.length), u32(central.length), u32(offset), u16(0)]);
}

function workbookXml(sheets: XmlSheet[]) {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${sheets.map((sheet, index) => `<sheet name="${xml(sheet.name)}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`).join("")}</sheets><calcPr calcId="191029" fullCalcOnLoad="1"/></workbook>`;
}

function contentTypes(sheets: XmlSheet[]) {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${sheets.map((_, index) => `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("")}</Types>`;
}

function workbookRelationships(sheets: XmlSheet[]) {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>${sheets.map((_, index) => `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`).join("")}</Relationships>`;
}

const rootRelationships = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`;
const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Aptos"/></font><font><b/><sz val="11"/><name val="Aptos"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="solid"><fgColor rgb="EAF2EE"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/><xf numFmtId="0" fontId="1" fillId="1" borderId="0" applyFont="1" applyFill="1"/></cellXfs></styleSheet>`;

function rowsForProject(state: WorkspaceState, snapshot: EstimateSnapshot | null, mode: XlsxExportMode, locale: "fr" | "en"): XmlSheet[] {
  if (mode === "client") {
    const clientDocument = state.proposalSnapshot?.document;
    const text = locale === "fr";
    if (clientDocument && (!snapshot || clientDocument.estimateSnapshotId === snapshot.id)) {
      const unit = clientDocument.included[0]?.unit === "hour" ? "h" : (text ? "j/h" : "p/d");
      const showAmount = clientDocument.settings.showPrices && clientDocument.settings.pricingMode !== "effort_only";
      const showRate = showAmount && clientDocument.settings.showRates;
      const headers: Array<string | number> = [text ? "Lot" : "Workstream", text ? "Prestation" : "Service", text ? "Description" : "Description"];
      if (clientDocument.settings.showEffort) headers.push(text ? "Charge" : "Effort");
      if (showRate) headers.push(text ? "Taux" : "Rate");
      if (showAmount) headers.push(text ? "Montant" : "Amount");
      const detailRows: XmlSheet["rows"] = [headers];
      clientDocument.included.forEach((line) => {
        const row: Array<string | number> = [line.workstream, line.name, line.description];
        if (clientDocument.settings.showEffort) {
          const displayedEffort = clientDocument.settings.effortDisplay === "low"
            ? `${line.low}`
            : clientDocument.settings.effortDisplay === "high"
              ? `${line.high}`
              : clientDocument.settings.effortDisplay === "range"
                ? `${line.low}-${line.high}`
                : clientDocument.settings.effortDisplay === "full"
                  ? `${line.low} / ${line.likely} / ${line.high}`
                  : `${line.likely}`;
          row.push(`${displayedEffort} ${unit}`);
        }
        if (showRate) row.push(line.rate ?? "");
        if (showAmount) row.push(line.amount ?? "");
        detailRows.push(row);
      });
      const summaryRows: XmlSheet["rows"] = [
        [text ? "Projet" : "Project", clientDocument.project.name],
        [text ? "Client" : "Client", clientDocument.project.clientName],
        [text ? "Référence" : "Reference", clientDocument.settings.reference],
        [text ? "Date" : "Date", clientDocument.settings.issueDate],
        [text ? "Statut" : "Status", text ? "Validée" : "Validated"],
      ];
      if (clientDocument.settings.showEffort) summaryRows.push([text ? "Charge estimée" : "Estimated effort", `${clientDocument.totals.effortLikely} ${unit}`]);
      if (showAmount && clientDocument.totals.subtotal !== null) summaryRows.push([text ? "Sous-total" : "Subtotal", clientDocument.totals.subtotal]);
      if (showAmount && clientDocument.totals.totalIncludingTax !== null) summaryRows.push([clientDocument.settings.showTaxes ? (text ? "Total TTC" : "Total incl. tax") : (text ? "Total HT" : "Total excl. tax"), clientDocument.totals.totalIncludingTax]);
      const clientSheets: XmlSheet[] = [
        { name: text ? "Synthèse" : "Summary", rows: summaryRows },
        { name: text ? "Périmètre" : "Scope", rows: detailRows },
      ];
      if (clientDocument.settings.showOptions && clientDocument.options.length > 0) clientSheets.push({ name: text ? "Options" : "Options", rows: [[text ? "Prestation" : "Service", text ? "Description" : "Description"], ...clientDocument.options.map((line) => [line.name, line.description])] });
      if (clientDocument.settings.showAssumptions && clientDocument.assumptions.length > 0) clientSheets.push({ name: text ? "Hypothèses" : "Assumptions", rows: [[text ? "Hypothèse" : "Assumption"], ...clientDocument.assumptions.map((assumption) => [assumption])] });
      if (clientDocument.settings.showExclusions && clientDocument.exclusions.length > 0) clientSheets.push({ name: text ? "Exclusions" : "Exclusions", rows: [[text ? "Élément" : "Item", text ? "Description" : "Description"], ...clientDocument.exclusions.map((item) => [item.name, item.description])] });
      return clientSheets;
    }
  }
  const modules = state.workstreams.flatMap((workstream) => workstream.modules);
  const lines = snapshot?.estimateLines ?? state.estimateLines;
  const totals = snapshot?.totals ?? calculateTotals(lines, modules, state.project.contingencyRate, state.project.preferences);
  const revision = snapshot?.revision ?? "draft";
  const unit = state.project.estimationUnit === "day" ? (locale === "fr" ? "j/h" : "p/d") : "h";
  const text = locale === "fr";
  const sheets: XmlSheet[] = [];
  if (mode === "client") {
    return [
      { name: text ? "Synthèse" : "Summary", rows: [
        [text ? "Projet" : "Project", state.project.name],
        [text ? "Statut" : "Status", text ? "Brouillon" : "Draft"],
        [text ? "Unité" : "Unit", unit],
        [text ? "Charge estimée" : "Estimated effort", `${totals.proposed.likely} ${unit}`],
      ] },
      { name: text ? "Périmètre" : "Scope", rows: [
        [text ? "Lot" : "Workstream", text ? "Module" : "Module", text ? "Description" : "Description", text ? "Charge" : "Effort"],
        ...state.workstreams.flatMap((workstream) => workstream.modules.filter((module) => module.status === "included").map((module) => {
          const line = lines.find((item) => item.moduleId === module.id);
          return [workstream.name, module.name, module.description, line ? `${line.likely} ${unit}` : ""];
        })),
      ] },
      { name: text ? "Options" : "Options", rows: [[text ? "Module" : "Module", text ? "Description" : "Description"], ...modules.filter((module) => module.status === "optional").map((module) => [module.name, module.description])] },
      { name: text ? "Hypothèses" : "Assumptions", rows: [[text ? "Hypothèse" : "Assumption"], ...Array.from(new Set(modules.flatMap((module) => module.assumptions))).map((assumption) => [assumption])] },
    ];
  }
  const estimateRows: XmlSheet["rows"] = [[text ? "Lot" : "Workstream", text ? "Module" : "Module", text ? "Description" : "Description", text ? "Statut" : "Status", "Low", "Likely", "High", "Low total", "Likely total", "High total", text ? "Hypothèse" : "Assumption", text ? "Confiance" : "Confidence"]];
  state.workstreams.forEach((workstream) => workstream.modules.forEach((module) => {
    const line = lines.find((item) => item.moduleId === module.id);
    if (!line) return;
    estimateRows.push([workstream.name, module.name, module.description, module.status, line.low, line.likely, line.high, line.low, line.likely, line.high, module.assumptions.join("; "), line.confidence]);
  }));
  const lastDataRow = estimateRows.length;
  const sumRange = (column: string) => lastDataRow > 1 ? `SUM(${column}2:${column}${lastDataRow})` : "0";
  estimateRows.push([text ? "Total" : "Total", "", "", "", "", "", "", { formula: sumRange("H"), value: totals.proposed.low }, { formula: sumRange("I"), value: totals.proposed.likely }, { formula: sumRange("J"), value: totals.proposed.high }, "", ""]);
  const estimateSheetName = text ? "Estimation" : "Estimate";
  sheets.push({ name: text ? "Synthèse" : "Summary", rows: [
    [text ? "Projet" : "Project", state.project.name],
    [text ? "Version" : "Version", revision],
    [text ? "Statut" : "Status", snapshot?.status ?? (text ? "Brouillon" : "Draft")],
    [text ? "Unité" : "Unit", unit],
    [text ? "Total bas" : "Low total", { formula: `${estimateSheetName}!H${lastDataRow + 1}`, value: totals.proposed.low }],
    [text ? "Total likely" : "Likely total", { formula: `${estimateSheetName}!I${lastDataRow + 1}`, value: totals.proposed.likely }],
    [text ? "Total haut" : "High total", { formula: `${estimateSheetName}!J${lastDataRow + 1}`, value: totals.proposed.high }],
    [text ? "Réserve" : "Reserve", state.project.contingencyRate],
  ] });
  sheets.push({ name: estimateSheetName, rows: estimateRows });
  sheets.push({ name: text ? "Décisions" : "Decisions", rows: [[text ? "Question" : "Question", text ? "Réponse" : "Answer", text ? "Date" : "Date"], ...state.decisions.map((decision) => [state.questions.find((question) => question.id === decision.sourceQuestionId)?.text ?? "", decision.statement, decision.createdAt])] });
  sheets.push({ name: text ? "Sources" : "Sources", rows: [[text ? "Source" : "Source", text ? "Langue" : "Language", text ? "Paragraphe" : "Paragraph", text ? "Extrait" : "Excerpt", "Checksum"], ...state.sources.flatMap((source) => source.paragraphs.map((paragraph) => [source.title, source.language.userOverride ?? source.language.detectedLocale ?? "", paragraph.id, paragraph.text, source.document?.checksum ?? ""]))] });
  if (state.referenceCaseIds.length) sheets.push({ name: text ? "Références" : "References", rows: [[text ? "Référence" : "Reference", text ? "Proximité" : "Proximity"], ...state.referenceMatches.filter((match) => state.referenceCaseIds.includes(match.referenceId)).map((match) => [match.referenceId, match.score])] });
  return sheets;
}

export function createXlsxWorkbook(state: WorkspaceState, snapshot: EstimateSnapshot | null, mode: XlsxExportMode, locale: "fr" | "en") {
  const sheets = rowsForProject(state, snapshot, mode, locale);
  const files = [
    { name: "[Content_Types].xml", content: contentTypes(sheets) },
    { name: "_rels/.rels", content: rootRelationships },
    { name: "xl/workbook.xml", content: workbookXml(sheets) },
    { name: "xl/_rels/workbook.xml.rels", content: workbookRelationships(sheets) },
    { name: "xl/styles.xml", content: stylesXml },
    ...sheets.map((sheet, index) => ({ name: `xl/worksheets/sheet${index + 1}.xml`, content: sheetXml(sheet) })),
  ];
  return zipStore(files);
}
