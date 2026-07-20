import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import type { ClientDocumentLine, ClientDocumentModel } from "@/domain/schemas";

const copy = {
  fr: {
    validated: "VALIDÉE",
    project: "Projet",
    client: "Client",
    reference: "Référence",
    version: "Version",
    issued: "Date d’émission",
    validUntil: "Valable jusqu’au",
    context: "Contexte et objectifs",
    approach: "Approche proposée",
    scope: "Périmètre inclus",
    workstream: "Lot",
    service: "Prestation",
    description: "Description",
    effort: "Charge",
    unit: "Unité",
    rate: "Taux",
    amount: "Montant",
    options: "Options",
    exclusions: "Exclusions",
    assumptions: "Hypothèses de travail",
    planning: "Planning indicatif",
    conditions: "Conditions",
    payment: "Modalités de paiement",
    start: "Conditions de démarrage",
    responsibilities: "Responsabilités du client",
    changes: "Modification du périmètre",
    subtotal: "Sous-total HT",
    reserve: "Réserve incluse",
    discount: "Remise",
    tax: "Taxes",
    totalExclTax: "Total HT",
    totalInclTax: "Total TTC",
    optionsTotal: "Total des options",
    acceptance: "Acceptation",
    name: "Nom",
    role: "Fonction",
    date: "Date",
    signature: "Signature",
    page: "Page",
    days: "j/h",
    hours: "h",
  },
  en: {
    validated: "VALIDATED",
    project: "Project",
    client: "Client",
    reference: "Reference",
    version: "Version",
    issued: "Issue date",
    validUntil: "Valid until",
    context: "Context and objectives",
    approach: "Proposed approach",
    scope: "Included scope",
    workstream: "Workstream",
    service: "Service",
    description: "Description",
    effort: "Effort",
    unit: "Unit",
    rate: "Rate",
    amount: "Amount",
    options: "Options",
    exclusions: "Exclusions",
    assumptions: "Working assumptions",
    planning: "Indicative plan",
    conditions: "Conditions",
    payment: "Payment terms",
    start: "Start conditions",
    responsibilities: "Client responsibilities",
    changes: "Scope changes",
    subtotal: "Subtotal",
    reserve: "Included reserve",
    discount: "Discount",
    tax: "Tax",
    totalExclTax: "Total excl. tax",
    totalInclTax: "Total incl. tax",
    optionsTotal: "Options total",
    acceptance: "Acceptance",
    name: "Name",
    role: "Role",
    date: "Date",
    signature: "Signature",
    page: "Page",
    days: "p/d",
    hours: "h",
  },
} as const;

const styles = StyleSheet.create({
  page: {
    paddingTop: 42,
    paddingRight: 44,
    paddingBottom: 54,
    paddingLeft: 44,
    fontFamily: "Helvetica",
    fontSize: 9.2,
    lineHeight: 1.45,
    color: "#20241f",
    backgroundColor: "#ffffff",
  },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", paddingBottom: 18, borderBottomWidth: 1, borderBottomColor: "#d9ddd8" },
  identity: { maxWidth: 315 },
  logo: { width: 72, height: 28, objectFit: "contain", marginBottom: 10 },
  issuer: { fontSize: 8.5, color: "#596057", marginBottom: 10 },
  title: { fontSize: 22, lineHeight: 1.08, fontFamily: "Helvetica-Bold", letterSpacing: -0.35, marginBottom: 7 },
  projectName: { fontSize: 12, color: "#3f4740" },
  status: { fontSize: 7.5, fontFamily: "Helvetica-Bold", letterSpacing: 1, paddingVertical: 5, paddingHorizontal: 8, color: "#ffffff", borderRadius: 2 },
  metaGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12, paddingVertical: 18 },
  meta: { width: "30%" },
  label: { fontSize: 7.2, color: "#6b736a", textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 2 },
  value: { fontSize: 9.2, fontFamily: "Helvetica-Bold" },
  section: { marginTop: 18 },
  sectionTitle: { fontSize: 13.5, fontFamily: "Helvetica-Bold", marginBottom: 8, paddingBottom: 5, borderBottomWidth: 1, borderBottomColor: "#d9ddd8" },
  paragraph: { marginBottom: 7, color: "#3f4740" },
  approach: { marginTop: 7, padding: 10, backgroundColor: "#f3f5f2", borderLeftWidth: 3 },
  table: { marginTop: 7, borderWidth: 1, borderColor: "#d9ddd8" },
  tableHeader: { flexDirection: "row", backgroundColor: "#eef1ed", borderBottomWidth: 1, borderBottomColor: "#cdd3cc", minHeight: 25, alignItems: "center" },
  tableRow: { flexDirection: "row", minHeight: 30, borderBottomWidth: 0.6, borderBottomColor: "#e5e8e3", alignItems: "flex-start" },
  cell: { paddingVertical: 6, paddingHorizontal: 6 },
  cellHead: { fontSize: 7.2, fontFamily: "Helvetica-Bold", color: "#4c544b", textTransform: "uppercase", letterSpacing: 0.35 },
  cellText: { fontSize: 8.2 },
  cellMuted: { fontSize: 7.5, color: "#697168", marginTop: 2 },
  colWorkstream: { minWidth: 0 },
  colService: { minWidth: 0 },
  colDescription: { minWidth: 0 },
  colEffort: { minWidth: 0, textAlign: "right" },
  colAmount: { minWidth: 0, textAlign: "right" },
  listItem: { flexDirection: "row", gap: 7, marginBottom: 5 },
  bullet: { width: 8, color: "#6b736a" },
  listText: { flex: 1 },
  totals: { marginTop: 12, marginLeft: "42%", width: "58%", borderTopWidth: 1, borderTopColor: "#cdd3cc", paddingTop: 5 },
  totalRow: { flexDirection: "row", alignItems: "flex-start", paddingVertical: 3 },
  totalLabel: { width: "55%", paddingRight: 8 },
  totalValue: { width: "45%", textAlign: "right", fontVariant: "tabular-nums" },
  totalStrong: { fontFamily: "Helvetica-Bold", fontSize: 10.5, paddingTop: 5, marginTop: 3, borderTopWidth: 1, borderTopColor: "#aeb5ad" },
  conditionsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  condition: { width: "48%", padding: 9, backgroundColor: "#f7f8f6" },
  acceptance: { flexDirection: "row", gap: 18, marginTop: 12 },
  signatureField: { flex: 1, height: 52, borderBottomWidth: 1, borderBottomColor: "#9da59c", justifyContent: "flex-end", paddingBottom: 3, color: "#697168" },
  footer: { position: "absolute", left: 44, right: 44, bottom: 24, flexDirection: "row", justifyContent: "space-between", paddingTop: 7, borderTopWidth: 1, borderTopColor: "#d9ddd8", fontSize: 7, color: "#6b736a" },
});

function date(value: string, locale: "fr" | "en") {
  return new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-GB", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(`${value.slice(0, 10)}T00:00:00.000Z`));
}

export function formatPdfNumber(value: number, locale: "fr" | "en", minimumFractionDigits = 0) {
  return new Intl.NumberFormat(locale === "fr" ? "fr-FR" : "en-GB", {
    minimumFractionDigits,
    maximumFractionDigits: 2,
    useGrouping: true,
  }).format(value).replace(/[\u00a0\u202f]/g, " ");
}

export function formatPdfMoney(value: number, document: ClientDocumentModel) {
  const number = formatPdfNumber(value, document.locale, 2);
  return document.locale === "fr"
    ? `${number} ${document.settings.currency}`
    : `${document.settings.currency} ${number}`;
}

function tableColumns(showEffort: boolean, showRate: boolean, showAmount: boolean) {
  const numericColumns = Number(showEffort) + Number(showRate) + Number(showAmount);
  const numericWidth = numericColumns === 3 ? 13 : numericColumns === 2 ? 15 : 17;
  const workstreamWidth = numericColumns === 3 ? 14 : 16;
  const serviceWidth = numericColumns === 3 ? 19 : 21;
  const descriptionWidth = 100 - workstreamWidth - serviceWidth - numericColumns * numericWidth;
  return {
    workstream: { width: `${workstreamWidth}%` },
    service: { width: `${serviceWidth}%` },
    description: { width: `${descriptionWidth}%` },
    numeric: { width: `${numericWidth}%` },
  };
}

function effort(line: ClientDocumentLine, document: ClientDocumentModel) {
  const unit = line.unit === "day" ? copy[document.locale].days : copy[document.locale].hours;
  if (document.settings.effortDisplay === "low") return `${formatPdfNumber(line.low, document.locale)} ${unit}`;
  if (document.settings.effortDisplay === "high") return `${formatPdfNumber(line.high, document.locale)} ${unit}`;
  if (document.settings.effortDisplay === "range") return `${formatPdfNumber(line.low, document.locale)}-${formatPdfNumber(line.high, document.locale)} ${unit}`;
  if (document.settings.effortDisplay === "full") return `${formatPdfNumber(line.low, document.locale)} / ${formatPdfNumber(line.likely, document.locale)} / ${formatPdfNumber(line.high, document.locale)} ${unit}`;
  return `${formatPdfNumber(line.likely, document.locale)} ${unit}`;
}

function EstimateTable({ rows, document }: { rows: ClientDocumentLine[]; document: ClientDocumentModel }) {
  const t = copy[document.locale];
  const showAmount = document.settings.showPrices && document.settings.pricingMode !== "effort_only";
  const showEffort = document.settings.showEffort;
  const showRate = showAmount && document.settings.showRates;
  const columns = tableColumns(showEffort, showRate, showAmount);
  return (
    <View style={styles.table}>
      <View style={styles.tableHeader} fixed>
        <Text style={[styles.cell, styles.cellHead, styles.colWorkstream, columns.workstream]}>{t.workstream}</Text>
        <Text style={[styles.cell, styles.cellHead, styles.colService, columns.service]}>{t.service}</Text>
        <Text style={[styles.cell, styles.cellHead, styles.colDescription, columns.description]}>{t.description}</Text>
        {showEffort && <Text style={[styles.cell, styles.cellHead, styles.colEffort, columns.numeric]}>{t.effort}</Text>}
        {showRate && <Text style={[styles.cell, styles.cellHead, styles.colAmount, columns.numeric]}>{t.rate}</Text>}
        {showAmount && <Text style={[styles.cell, styles.cellHead, styles.colAmount, columns.numeric]}>{t.amount}</Text>}
      </View>
      {rows.map((line) => (
        <View key={line.id} style={styles.tableRow} wrap={false}>
          <Text style={[styles.cell, styles.cellText, styles.colWorkstream, columns.workstream]}>{line.workstream}</Text>
          <Text style={[styles.cell, styles.cellText, styles.colService, columns.service]}>{line.name}</Text>
          <Text style={[styles.cell, styles.cellText, styles.colDescription, columns.description]}>{line.description}</Text>
          {showEffort && <Text style={[styles.cell, styles.cellText, styles.colEffort, columns.numeric]}>{effort(line, document)}</Text>}
          {showRate && <Text style={[styles.cell, styles.cellText, styles.colAmount, columns.numeric]}>{line.rate === null ? "-" : formatPdfMoney(line.rate, document)}</Text>}
          {showAmount && <Text style={[styles.cell, styles.cellText, styles.colAmount, columns.numeric]}>{line.amount === null ? "-" : formatPdfMoney(line.amount, document)}</Text>}
        </View>
      ))}
    </View>
  );
}

function BulletList({ items }: { items: string[] }) {
  return <View>{items.map((item) => <View key={item} style={styles.listItem} wrap={false}><Text style={styles.bullet}>•</Text><Text style={styles.listText}>{item}</Text></View>)}</View>;
}

export function ClientProposalPdf({ document }: { document: ClientDocumentModel }) {
  const t = copy[document.locale];
  const issue = new Date(`${document.settings.issueDate}T00:00:00.000Z`);
  issue.setUTCDate(issue.getUTCDate() + document.settings.validityDays);
  const conditions = [
    [t.payment, document.settings.paymentTerms],
    [t.start, document.settings.startConditions],
    [t.responsibilities, document.settings.clientResponsibilities],
    [t.changes, document.settings.changePolicy],
  ].filter((item) => item[1]);
  return (
    <Document title={`${document.settings.title} - ${document.project.name}`} author={document.settings.issuerName} subject={document.settings.reference} language={document.locale}>
      <Page size="A4" style={styles.page} wrap>
        <View style={styles.header}>
          <View style={styles.identity}>
            {/* React PDF images are document primitives and do not expose an HTML alt prop. */}
            {/* eslint-disable-next-line jsx-a11y/alt-text */}
            {document.settings.logoDataUrl && <Image src={document.settings.logoDataUrl} style={styles.logo} />}
            <Text style={styles.issuer}>{document.settings.issuerName}</Text>
            <Text style={styles.title}>{document.settings.title}</Text>
            <Text style={styles.projectName}>{document.project.name}</Text>
          </View>
          <Text style={[styles.status, { backgroundColor: document.settings.accentColor }]}>{t.validated}</Text>
        </View>

        <View style={styles.metaGrid}>
          <View style={styles.meta}><Text style={styles.label}>{t.client}</Text><Text style={styles.value}>{document.project.clientName || "-"}</Text></View>
          <View style={styles.meta}><Text style={styles.label}>{t.reference}</Text><Text style={styles.value}>{document.settings.reference}</Text></View>
          <View style={styles.meta}><Text style={styles.label}>{t.issued}</Text><Text style={styles.value}>{date(document.settings.issueDate, document.locale)}</Text></View>
          <View style={styles.meta}><Text style={styles.label}>{t.validUntil}</Text><Text style={styles.value}>{date(issue.toISOString(), document.locale)}</Text></View>
        </View>

        {document.settings.showContext && <View style={styles.section} minPresenceAhead={90}>
          <Text style={styles.sectionTitle}>{t.context}</Text>
          <Text style={styles.paragraph}>{document.project.context}</Text>
          {document.project.objective && <Text style={styles.paragraph}>{document.project.objective}</Text>}
          <View style={[styles.approach, { borderLeftColor: document.settings.accentColor }]} wrap={false}><Text>{document.project.approach}</Text></View>
        </View>}

        <View style={styles.section} minPresenceAhead={100}>
          <Text style={styles.sectionTitle}>{t.scope}</Text>
          <EstimateTable rows={document.included} document={document} />
          {(document.settings.showPrices || document.settings.showEffort) && <View style={styles.totals} wrap={false}>
            {document.totals.subtotal !== null && <View style={styles.totalRow}><Text style={styles.totalLabel}>{t.subtotal}</Text><Text style={styles.totalValue}>{formatPdfMoney(document.totals.subtotal, document)}</Text></View>}
            {document.settings.showEffort && <View style={styles.totalRow}><Text style={styles.totalLabel}>{t.reserve}</Text><Text style={styles.totalValue}>{formatPdfNumber(document.totals.reserveLikely, document.locale)} {document.included[0]?.unit === "hour" ? t.hours : t.days}</Text></View>}
            {document.totals.discount !== null && document.totals.discount > 0 && <View style={styles.totalRow}><Text style={styles.totalLabel}>{t.discount}</Text><Text style={styles.totalValue}>-{formatPdfMoney(document.totals.discount, document)}</Text></View>}
            {document.totals.totalExcludingTax !== null && <View style={styles.totalRow}><Text style={styles.totalLabel}>{t.totalExclTax}</Text><Text style={styles.totalValue}>{formatPdfMoney(document.totals.totalExcludingTax, document)}</Text></View>}
            {document.settings.showTaxes && document.totals.tax !== null && <View style={styles.totalRow}><Text style={styles.totalLabel}>{t.tax} ({Math.round(document.settings.taxRate * 100)}%)</Text><Text style={styles.totalValue}>{formatPdfMoney(document.totals.tax, document)}</Text></View>}
            {document.totals.totalIncludingTax !== null && <View style={[styles.totalRow, styles.totalStrong]}><Text style={styles.totalLabel}>{document.settings.showTaxes ? t.totalInclTax : t.totalExclTax}</Text><Text style={styles.totalValue}>{formatPdfMoney(document.totals.totalIncludingTax, document)}</Text></View>}
          </View>}
        </View>

        {document.settings.showOptions && document.options.length > 0 && <View style={styles.section} minPresenceAhead={100}><Text style={styles.sectionTitle}>{t.options}</Text><EstimateTable rows={document.options} document={document} />{document.totals.optionsAmount !== null && <View style={styles.totals} wrap={false}><View style={[styles.totalRow, styles.totalStrong]}><Text style={styles.totalLabel}>{t.optionsTotal}</Text><Text style={styles.totalValue}>{formatPdfMoney(document.totals.optionsAmount, document)}</Text></View></View>}</View>}
        {document.exclusions.length > 0 && <View style={styles.section} minPresenceAhead={80}><Text style={styles.sectionTitle}>{t.exclusions}</Text><BulletList items={document.exclusions.map((item) => item.description ? `${item.name}: ${item.description}` : item.name)} /></View>}
        {document.assumptions.length > 0 && <View style={styles.section} minPresenceAhead={80}><Text style={styles.sectionTitle}>{t.assumptions}</Text><BulletList items={document.assumptions} /></View>}
        {document.settings.showPlanning && document.planning.length > 0 && <View style={styles.section} minPresenceAhead={80}><Text style={styles.sectionTitle}>{t.planning}</Text><BulletList items={document.planning.map((item) => item.description ? `${item.name}: ${item.description}` : item.name)} /></View>}
        {document.settings.showConditions && (conditions.length > 0 || document.settings.finalNotes) && <View style={styles.section} minPresenceAhead={100}><Text style={styles.sectionTitle}>{t.conditions}</Text><View style={styles.conditionsGrid}>{conditions.map(([label, value]) => <View key={label} style={styles.condition} wrap={false}><Text style={styles.label}>{label}</Text><Text>{value}</Text></View>)}</View>{document.settings.finalNotes && <Text style={[styles.paragraph, { marginTop: 10 }]}>{document.settings.finalNotes}</Text>}</View>}
        {document.settings.showAcceptance && <View style={styles.section} minPresenceAhead={110}><Text style={styles.sectionTitle}>{t.acceptance}</Text><View style={styles.acceptance} wrap={false}>{[t.name, t.role, t.date, t.signature].map((label) => <View key={label} style={styles.signatureField}><Text>{label}</Text></View>)}</View></View>}

        <View style={styles.footer} fixed>
          <Text>{document.settings.issuerName} | {document.settings.reference}</Text>
          <Text render={({ pageNumber, totalPages }) => `${t.page} ${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
