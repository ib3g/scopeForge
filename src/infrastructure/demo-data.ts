import { normalizeSource } from "@/domain/source";
import type {
  ChangeProposal,
  EstimateLine,
  ProjectAnalysis,
  Question,
  WorkspaceState,
  Workstream,
} from "@/domain/schemas";

const visionBrief = `# Morrow Ridge experience brief

## Context
Morrow Ridge is a demonstration project for a small-group creative retreat operator in a remote coastal region. The team needs a digital platform that helps guests understand each retreat, learn about the hosts, and apply for a place without turning the experience into a hotel booking flow.

## Guest experience
Visitors should browse upcoming retreats, compare dates and themes, read host profiles, review accommodation and accessibility information, and submit an application. Launch content will be in English, with French planned as a separately estimated option.

## Brand and content
The experience should feel editorial, warm, precise, and quiet. Photography, copy, and the existing visual identity will be supplied by the client. The product team is responsible for content structures and responsive presentation, not brand creation.

## Boundaries
Travel booking, public guest reviews, community forums, and a native mobile application are not part of the first release.`;

const operationsWorkshop = `# Morrow Ridge operations workshop

## Product objective
Create one web platform for retreat discovery, applications, accepted-guest payments, and the operational preparation of each cohort. The first launch covers six retreats and no more than twenty-four guests per retreat.

## Applications and accounts
Applicants create an account, select a retreat, answer suitability questions, add dietary and accessibility needs, and submit their application. They can return to view status, update their profile, and access arrival information after acceptance.

## Review and acceptance
Every application is reviewed by a coordinator. Accepted applicants receive a place offer that expires after seventy-two hours. The exact wait-list promotion rule remains undecided and must not be invented by the implementation team.

## Payment
An accepted guest pays a 30% deposit online through Stripe to confirm the place. The remaining balance is requested thirty days before arrival. Refund rules are managed manually in version one, but payment events and balances must remain visible to operations.

## Operations
Coordinators manage retreats, capacity, applications, offers, guest status, room notes, dietary requirements, accessibility needs, balances, and exports for on-site teams. Room assignment itself stays in a spreadsheet for launch.

## Communication
Transactional email is required for application receipt, acceptance, expiring offers, payment receipt, balance reminder, and arrival information. SMS is optional and should be estimated separately.

## Technical direction
The launch is a responsive web application with role-based access for applicants, coordinators, and administrators. It needs audit history for status and payment changes, basic automated tests, deployment, and operational handover.`;

const readinessNotes = `# Launch readiness and risk notes

## Delivery constraints
The target launch is ten weeks after kickoff. Retreat content and photography may arrive in batches, so the content model and preview workflow must support progressive population without blocking product development.

## Accessibility and safeguarding
Accessibility needs are sensitive guest information and should be visible only to authorized operations roles. The public experience must meet WCAG 2.2 AA expectations, and consent copy must explain why dietary and accessibility data is collected.

## Measurement and handover
The team wants privacy-conscious analytics for retreat views, application starts, submissions, accepted offers, and completed deposits. A concise admin guide and a live training session are required before launch.

## Open launch decisions
The team has not selected the transactional email provider, confirmed whether French is required at launch, or defined who may export sensitive guest details.`;

export const demoSources = [
  normalizeSource(
    "SRC-01",
    "Experience brief",
    "Founder brief · Source A",
    visionBrief,
  ),
  normalizeSource(
    "SRC-02",
    "Operations workshop",
    "Product workshop · Source B",
    operationsWorkshop,
  ),
  normalizeSource(
    "SRC-03",
    "Launch readiness notes",
    "Delivery review · Source C",
    readinessNotes,
  ),
];

const cite = (sourceId: string, paragraphId: string, excerpt: string) => ({
  sourceId,
  paragraphId,
  excerpt,
  excerptLocale: "en",
  translatedExcerpt: null,
});

export const demoAnalysis: ProjectAnalysis = {
  executiveSummary:
    "Morrow Ridge needs an editorial retreat discovery experience connected to a controlled application, acceptance, deposit, and cohort-operations workflow. The three sources are complementary: the vision brief defines the guest experience and boundaries, the workshop introduces transactional and operational detail, and the readiness notes refine privacy, accessibility, analytics, and delivery constraints.",
  coverageScore: 82,
  findings: [
    {
      id: "F-01",
      category: "goal",
      statement:
        "Launch a trusted retreat discovery and application platform for small cohorts.",
      confidence: 0.99,
      evidenceType: "confirmed",
      citations: [
        cite("SRC-01", "SRC-01-P002", "helps guests understand each retreat"),
        cite("SRC-02", "SRC-02-P002", "one web platform for retreat discovery"),
      ],
    },
    {
      id: "F-02",
      category: "requirement",
      statement:
        "Guests browse retreats, hosts, dates, accommodation and accessibility information before applying.",
      confidence: 0.99,
      evidenceType: "explicit",
      citations: [
        cite(
          "SRC-01",
          "SRC-01-P003",
          "browse upcoming retreats, compare dates and themes",
        ),
      ],
    },
    {
      id: "F-03",
      category: "requirement",
      statement:
        "Applications capture suitability, dietary and accessibility information in a guest account.",
      confidence: 1,
      evidenceType: "explicit",
      citations: [
        cite(
          "SRC-02",
          "SRC-02-P003",
          "answer suitability questions, add dietary and accessibility needs",
        ),
      ],
    },
    {
      id: "F-04",
      category: "constraint",
      statement:
        "Every application requires coordinator review before a time-limited place offer.",
      confidence: 1,
      evidenceType: "explicit",
      citations: [cite("SRC-02", "SRC-02-P004", "reviewed by a coordinator")],
    },
    {
      id: "F-05",
      category: "requirement",
      statement:
        "Accepted guests pay a 30% Stripe deposit, with balances tracked for operations.",
      confidence: 1,
      evidenceType: "explicit",
      citations: [
        cite(
          "SRC-02",
          "SRC-02-P005",
          "pays a 30% deposit online through Stripe",
        ),
      ],
    },
    {
      id: "F-06",
      category: "constraint",
      statement:
        "Sensitive accessibility details require role-restricted access and explicit consent.",
      confidence: 1,
      evidenceType: "confirmed",
      citations: [
        cite("SRC-02", "SRC-02-P003", "accessibility needs"),
        cite(
          "SRC-03",
          "SRC-03-P003",
          "visible only to authorized operations roles",
        ),
      ],
    },
    {
      id: "F-07",
      category: "exclusion",
      statement:
        "Travel booking, guest reviews, forums, native mobile and room assignment are excluded from launch.",
      confidence: 1,
      evidenceType: "explicit",
      citations: [
        cite("SRC-01", "SRC-01-P005", "not part of the first release"),
        cite(
          "SRC-02",
          "SRC-02-P006",
          "Room assignment itself stays in a spreadsheet",
        ),
      ],
    },
    {
      id: "F-08",
      category: "unknown",
      statement:
        "The wait-list promotion rule and export permission for sensitive details are unresolved.",
      confidence: 1,
      evidenceType: "explicit",
      citations: [
        cite(
          "SRC-02",
          "SRC-02-P004",
          "wait-list promotion rule remains undecided",
        ),
        cite("SRC-03", "SRC-03-P005", "who may export sensitive guest details"),
      ],
    },
    {
      id: "F-09",
      category: "assumption",
      statement:
        "English is the launch language unless French is explicitly approved as an option.",
      confidence: 0.86,
      evidenceType: "inferred",
      citations: [
        cite(
          "SRC-01",
          "SRC-01-P003",
          "French planned as a separately estimated option",
        ),
        cite(
          "SRC-03",
          "SRC-03-P005",
          "not confirmed whether French is required at launch",
        ),
      ],
    },
  ],
  sourceContributions: [
    {
      id: "SC-01",
      sourceId: "SRC-01",
      topic: "Guest experience",
      contribution:
        "Introduces the editorial discovery journey, public information architecture and launch boundaries.",
      relation: "introduces",
      relatedFindingIds: ["F-01", "F-02", "F-07"],
      citations: [cite("SRC-01", "SRC-01-P003", "browse upcoming retreats")],
    },
    {
      id: "SC-02",
      sourceId: "SRC-02",
      topic: "Application lifecycle",
      contribution:
        "Complements discovery with accounts, applications, coordinator review, offers and payments.",
      relation: "complements",
      relatedFindingIds: ["F-03", "F-04", "F-05"],
      citations: [cite("SRC-02", "SRC-02-P003", "submit their application")],
    },
    {
      id: "SC-03",
      sourceId: "SRC-02",
      topic: "Launch operations",
      contribution:
        "Introduces cohort administration, transactional communication and audit history.",
      relation: "introduces",
      relatedFindingIds: ["F-05", "F-06"],
      citations: [
        cite(
          "SRC-02",
          "SRC-02-P006",
          "manage retreats, capacity, applications",
        ),
      ],
    },
    {
      id: "SC-04",
      sourceId: "SRC-03",
      topic: "Sensitive guest data",
      contribution:
        "Refines the operational scope with permission, consent and safeguarding requirements.",
      relation: "refines",
      relatedFindingIds: ["F-06", "F-08"],
      citations: [cite("SRC-03", "SRC-03-P003", "sensitive guest information")],
    },
    {
      id: "SC-05",
      sourceId: "SRC-03",
      topic: "Delivery readiness",
      contribution:
        "Complements the build with phased content, analytics, training and a ten-week constraint.",
      relation: "complements",
      relatedFindingIds: ["F-01"],
      citations: [cite("SRC-03", "SRC-03-P002", "target launch is ten weeks")],
    },
    {
      id: "SC-06",
      sourceId: "SRC-03",
      topic: "Accessibility",
      contribution:
        "Confirms and strengthens the accessibility information introduced in the guest journey.",
      relation: "confirms",
      relatedFindingIds: ["F-02", "F-06"],
      citations: [
        cite("SRC-01", "SRC-01-P003", "accessibility information"),
        cite("SRC-03", "SRC-03-P003", "WCAG 2.2 AA"),
      ],
    },
  ],
  duplicatesMerged: [
    { statement: "Accessibility information and needs", citationCount: 3 },
    { statement: "Responsive web experience", citationCount: 2 },
  ],
  inconsistencies: [],
  suggestedNextStep:
    "Resolve wait-list handling and sensitive export permissions, then build the scope.",
  referenceInfluences: [
    {
      id: "RI-DEMO-01",
      referenceId: "reference-harborline-portal",
      area: "analysis",
      statement: "The Harborline case was used as a review prompt for search, forms and accessible content; it did not add a requirement.",
      provenance: "reference_case",
      confidence: "medium",
    },
  ],
};

export const demoQuestions: Question[] = [
  {
    id: "Q-01",
    text: "How should a place be offered when an accepted guest does not pay within 72 hours?",
    priority: "blocking",
    rationale:
      "This defines capacity release, wait-list states and notification timing.",
    estimationImpact:
      "Automated promotion adds scheduled jobs, expiry rules and exception handling.",
    citations: [
      cite(
        "SRC-02",
        "SRC-02-P004",
        "offer that expires after seventy-two hours",
      ),
    ],
    status: "open",
    answer: null,
  },
  {
    id: "Q-02",
    text: "Which roles may view and export accessibility and dietary details?",
    priority: "blocking",
    rationale: "Sensitive guest data needs an explicit least-privilege rule.",
    estimationImpact:
      "Granular export permissions add authorization and audit scenarios.",
    citations: [
      cite("SRC-03", "SRC-03-P003", "authorized operations roles"),
      cite("SRC-03", "SRC-03-P005", "who may export sensitive guest details"),
    ],
    status: "open",
    answer: null,
  },
  {
    id: "Q-03",
    text: "Is French required for launch or should it remain a priced option?",
    priority: "framing",
    rationale: "The vision and readiness notes leave launch language open.",
    estimationImpact:
      "Launch localization adds routing, content workflows and QA effort.",
    citations: [
      cite(
        "SRC-01",
        "SRC-01-P003",
        "French planned as a separately estimated option",
      ),
    ],
    status: "open",
    answer: null,
  },
  {
    id: "Q-04",
    text: "Which transactional email provider should be assumed for estimation?",
    priority: "optional",
    rationale: "A provider is not selected, but the notification set is known.",
    estimationImpact:
      "Provider choice mainly affects integration and template setup.",
    citations: [
      cite(
        "SRC-03",
        "SRC-03-P005",
        "not selected the transactional email provider",
      ),
    ],
    status: "open",
    answer: null,
  },
];

export const demoWorkstreams: Workstream[] = [
  {
    id: "WS-01",
    name: "Experience & discovery",
    description: "Framing, editorial content and retreat discovery.",
    order: 1,
    modules: [
      {
        id: "M-01",
        name: "Discovery & experience design",
        description:
          "Journeys, information architecture, prototype and responsive system.",
        status: "included",
        features: ["Guest journey", "Content model", "Responsive prototype"],
        dependencies: [],
        assumptions: ["Existing identity and photography supplied"],
        citations: [
          cite(
            "SRC-01",
            "SRC-01-P004",
            "existing visual identity will be supplied",
          ),
        ],
      },
      {
        id: "M-02",
        name: "Retreat discovery website",
        description: "Editorial retreat, host and accommodation presentation.",
        status: "included",
        features: [
          "Retreat catalogue",
          "Host profiles",
          "Dates and availability",
          "Accessibility content",
        ],
        dependencies: ["M-01"],
        assumptions: ["English launch content supplied in batches"],
        citations: [cite("SRC-01", "SRC-01-P003", "browse upcoming retreats")],
      },
      {
        id: "M-03",
        name: "French localization",
        description: "Localized content model, routing and launch QA.",
        status: "optional",
        features: ["French routes", "Translation workflow", "Localization QA"],
        dependencies: ["M-02"],
        assumptions: ["Translations supplied by client"],
        citations: [
          cite(
            "SRC-01",
            "SRC-01-P003",
            "French planned as a separately estimated option",
          ),
        ],
      },
    ],
  },
  {
    id: "WS-02",
    name: "Applications & payments",
    description: "Guest account, controlled acceptance and deposit flow.",
    order: 2,
    modules: [
      {
        id: "M-04",
        name: "Guest account & application",
        description: "Secure profile, retreat application and status tracking.",
        status: "included",
        features: [
          "Account access",
          "Application form",
          "Dietary and accessibility needs",
          "Application status",
        ],
        dependencies: ["M-01"],
        assumptions: ["Consent copy approved before launch"],
        citations: [cite("SRC-02", "SRC-02-P003", "submit their application")],
      },
      {
        id: "M-05",
        name: "Review, offers & wait-list",
        description:
          "Coordinator review, place offers, expiry and wait-list states.",
        status: "included",
        features: [
          "Review queue",
          "Acceptance decision",
          "72-hour offer",
          "Manual wait-list promotion",
        ],
        dependencies: ["M-04"],
        assumptions: ["Promotion remains manual for launch"],
        citations: [cite("SRC-02", "SRC-02-P004", "reviewed by a coordinator")],
      },
      {
        id: "M-06",
        name: "Stripe deposits & balances",
        description: "Deposit checkout, payment events and balance visibility.",
        status: "included",
        features: [
          "30% deposit",
          "Stripe checkout",
          "Payment webhooks",
          "Balance tracking",
        ],
        dependencies: ["M-05"],
        assumptions: ["Refunds handled manually"],
        citations: [
          cite("SRC-02", "SRC-02-P005", "30% deposit online through Stripe"),
        ],
      },
    ],
  },
  {
    id: "WS-03",
    name: "Operations & launch",
    description:
      "Cohort operations, communications, measurement and readiness.",
    order: 3,
    modules: [
      {
        id: "M-07",
        name: "Cohort operations",
        description:
          "Retreat, guest, capacity and sensitive-data administration.",
        status: "included",
        features: [
          "Retreat setup",
          "Capacity dashboard",
          "Guest operations",
          "Permissioned exports",
        ],
        dependencies: ["M-04", "M-05"],
        assumptions: ["Coordinator and administrator roles"],
        citations: [
          cite("SRC-02", "SRC-02-P006", "Coordinators manage retreats"),
        ],
      },
      {
        id: "M-08",
        name: "Email notifications",
        description:
          "Transactional messages across application, offer and payment states.",
        status: "included",
        features: [
          "Application receipt",
          "Offer expiry",
          "Payment receipt",
          "Arrival information",
        ],
        dependencies: ["M-05", "M-06"],
        assumptions: ["Transactional provider selected during discovery"],
        citations: [
          cite("SRC-02", "SRC-02-P007", "Transactional email is required"),
        ],
      },
      {
        id: "M-09",
        name: "SMS reminders",
        description: "Optional time-sensitive guest reminders.",
        status: "optional",
        features: ["Offer reminder", "Balance reminder"],
        dependencies: ["M-08"],
        assumptions: ["Provider account supplied"],
        citations: [cite("SRC-02", "SRC-02-P007", "SMS is optional")],
      },
      {
        id: "M-10",
        name: "Quality, analytics & handover",
        description:
          "Accessible launch, funnel measurement, tests and training.",
        status: "included",
        features: [
          "WCAG 2.2 AA review",
          "Privacy-conscious events",
          "Critical tests",
          "Admin training",
        ],
        dependencies: ["M-02", "M-07"],
        assumptions: ["Analytics consent model approved"],
        citations: [
          cite("SRC-03", "SRC-03-P003", "WCAG 2.2 AA"),
          cite("SRC-03", "SRC-03-P004", "live training session"),
        ],
      },
      {
        id: "M-11",
        name: "Travel and room assignment",
        description: "Travel purchasing and room allocation automation.",
        status: "excluded",
        features: ["Travel booking", "Room assignment"],
        dependencies: [],
        assumptions: [],
        citations: [
          cite("SRC-01", "SRC-01-P005", "Travel booking"),
          cite("SRC-02", "SRC-02-P006", "stays in a spreadsheet"),
        ],
      },
    ],
  },
];

export const demoEstimateLines: EstimateLine[] = [
  [
    "E-01",
    "M-01",
    4,
    6,
    8,
    "high",
    "medium",
    "Three core roles and sensitive-data journeys need early validation.",
  ],
  [
    "E-02",
    "M-02",
    5,
    7,
    10,
    "high",
    "medium",
    "Editorial templates, progressive content and accessibility states.",
  ],
  [
    "E-03",
    "M-03",
    3,
    5,
    8,
    "medium",
    "medium",
    "Localized routing, content fields and regression QA.",
  ],
  [
    "E-04",
    "M-04",
    6,
    9,
    13,
    "medium",
    "high",
    "Account, application, consent and sensitive profile data.",
  ],
  [
    "E-05",
    "M-05",
    6,
    9,
    14,
    "medium",
    "high",
    "Review states, expiring offers and manual wait-list controls.",
  ],
  [
    "E-06",
    "M-06",
    5,
    8,
    12,
    "medium",
    "high",
    "Checkout, webhooks, failure states and balance reconciliation.",
  ],
  [
    "E-07",
    "M-07",
    7,
    10,
    15,
    "medium",
    "high",
    "Role-scoped operations and sensitive exports across cohorts.",
  ],
  [
    "E-08",
    "M-08",
    4,
    6,
    9,
    "high",
    "medium",
    "Six transactional templates and delivery event coverage.",
  ],
  [
    "E-09",
    "M-09",
    3,
    5,
    8,
    "low",
    "medium",
    "Optional provider setup, consent and reminder templates.",
  ],
  [
    "E-10",
    "M-10",
    5,
    8,
    12,
    "medium",
    "medium",
    "Accessibility, analytics, tests, deployment and training.",
  ],
  [
    "E-11",
    "M-11",
    0,
    0,
    0,
    "high",
    "low",
    "Explicitly excluded from the first release.",
  ],
].map(
  ([id, moduleId, low, likely, high, confidence, risk, rationale]) =>
    ({
      id,
      moduleId,
      low,
      likely,
      high,
      confidence,
      risk,
      rationale,
      manualOverride: false,
      updatedBy: "ai",
    }) as EstimateLine,
);

export function makeDemoChangeProposal(line: EstimateLine): ChangeProposal {
  const after = {
    ...line,
    low: line.low,
    likely: line.likely + 1,
    high: line.high + 2,
    rationale: `${line.rationale} The revised range makes integration failure states and permission-edge cases explicit.`,
  };
  return {
    id: `CP-${line.id}`,
    targetType: "estimate_line",
    targetId: line.id,
    before: line,
    after,
    explanation:
      "The source information indicates that the likely and high cases should include role boundaries and failure recovery. The low case remains possible if the pending decisions are made on time.",
    status: "pending",
  };
}

export function createInitialState(): WorkspaceState {
  const now = new Date().toISOString();
  return {
    project: {
      id: "demo",
      mode: "demo",
      name: "Morrow Ridge retreat platform",
      clientName: "Morrow Ridge",
      sector: "Hospitality experiences",
      description:
        "An editorial retreat discovery, application, deposit and cohort-operations platform.",
      status: "draft",
      estimationUnit: "day",
      currency: "EUR",
      contingencyRate: 0.15,
      projectLanguage: "en",
      resolvedProjectLanguage: "en",
      projectLanguageConfirmed: true,
      clientOutputLanguage: "same_as_project",
      estimationMethodId: "web-fixed-price",
      estimationMethodOverrides: {},
      preferences: {
        teamSize: 3,
        productiveDaysPerMonth: 17,
        includeReserveInOptions: false,
        rounding: 0.5,
        showEffortInClient: true,
        commercialModel: "fixed_price",
        deliverableType: "commercial_proposal",
      },
      createdAt: now,
      updatedAt: now,
      archivedAt: null,
    },
    sources: demoSources,
    questions: [],
    decisions: [],
    workstreams: [],
    estimateLines: [],
    activity: [
      {
        id: "A-01",
        label: "Morrow Ridge demo loaded",
        createdAt: now,
        kind: "project",
      },
    ],
    analysisVersions: [],
    aiExecutions: {},
    referenceCaseIds: ["reference-harborline-portal"],
    referenceMatches: [],
    referenceInfluences: [],
    estimateSnapshots: [],
    approvedEstimateSnapshotId: null,
    proposalSnapshot: null,
    acknowledgedValidationWarnings: [],
  };
}
