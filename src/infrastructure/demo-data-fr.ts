import type {
  ChangeProposal,
  EstimateLine,
  ProjectAnalysis,
  Question,
  WorkspaceState,
  Workstream,
} from "@/domain/schemas";
import { normalizeSource } from "@/domain/source";

const programme = `# Note de programme — Calyra

## Contexte
Calyra est un projet de démonstration consacré à la médiation culturelle itinérante. L’équipe souhaite réunir dans un même portail les ateliers, rencontres et ressources pédagogiques proposés dans plusieurs lieux partenaires.

## Publics et expérience
Les enseignants, associations et familles doivent pouvoir découvrir les programmes, filtrer par âge, accessibilité, lieu et période, puis déposer une demande de participation. L’expérience doit rester éditoriale et rassurante, sans donner l’impression d’une billetterie automatique.

## Contenus et visibilité
Chaque programme possède une présentation, des objectifs pédagogiques, des intervenants, des conditions d’accueil et des ressources téléchargeables. Le lancement est prévu en français. Une sélection de pages pourra être publiée en anglais après validation éditoriale.

## Limites
Le paiement en ligne, la gestion des transports, une application mobile native et les espaces communautaires ne font pas partie du lancement.`;

const atelier = `# Atelier fonctionnel

## Demandes
Une structure crée un compte, renseigne son groupe, ses besoins d’accessibilité et trois créneaux souhaités. Un coordinateur vérifie la demande, échange avec la structure puis confirme ou refuse la participation. Les places ne sont jamais attribuées automatiquement.

## Administration
Les coordinateurs gèrent les programmes, les capacités, les demandes, les statuts et les documents de préparation. Les responsables peuvent exporter une liste opérationnelle, mais les informations d’accessibilité doivent rester limitées aux personnes autorisées.

## Notifications
Des courriels sont nécessaires à la réception de la demande, à la demande d’informations complémentaires, à la confirmation et au rappel avant l’atelier. Le prestataire d’envoi n’est pas encore choisi.

## Point ouvert
La durée de conservation des demandes refusées et la personne autorisée à exporter les besoins sensibles restent à confirmer.`;

const technicalMemo = `# Technical launch memo

## Delivery constraints
The first release must be delivered within eight weeks. Content will arrive progressively, so preview and draft states are required. The platform should be a responsive web application with role-based access and an audit trail for request status changes.

## Qualité et conformité
Le service public doit viser WCAG 2.2 AA. Les téléchargements doivent être accessibles et le consentement doit expliquer l’usage des informations sensibles. Privacy-friendly analytics are limited to programme views, request starts and completed submissions.

## Handover
The delivery includes automated tests for critical workflows, a deployment guide and one administrator training session. English client-facing pages remain optional and must not delay the French launch.`;

export const frenchDemoSources = [
  normalizeSource(
    "SRC-01",
    "Note de programme",
    "Vision produit · Source A",
    programme,
  ),
  normalizeSource(
    "SRC-02",
    "Atelier fonctionnel",
    "Atelier métier · Source B",
    atelier,
  ),
  normalizeSource(
    "SRC-03",
    "Technical launch memo",
    "Revue technique bilingue · Source C",
    technicalMemo,
  ),
];

const cite = (
  sourceId: string,
  paragraphId: string,
  excerpt: string,
  excerptLocale: string,
  translatedExcerpt: string | null = null,
) => ({ sourceId, paragraphId, excerpt, excerptLocale, translatedExcerpt });

export const frenchDemoAnalysis: ProjectAnalysis = {
  executiveSummary:
    "Calyra a besoin d’un portail éditorial pour présenter ses programmes de médiation et gérer des demandes de participation contrôlées. Les trois sources sont complémentaires : la note de programme décrit l’expérience publique, l’atelier précise le traitement métier et le mémo bilingue affine les contraintes d’accessibilité, de livraison et de traçabilité.",
  coverageScore: 84,
  findings: [
    {
      id: "F-01",
      category: "goal",
      statement:
        "Créer un portail éditorial de découverte et de demande de participation pour plusieurs publics.",
      confidence: 0.99,
      evidenceType: "confirmed",
      citations: [
        cite(
          "SRC-01",
          "SRC-01-P002",
          "réunir dans un même portail les ateliers, rencontres et ressources pédagogiques",
          "fr",
        ),
        cite("SRC-02", "SRC-02-P002", "Une structure crée un compte", "fr"),
      ],
    },
    {
      id: "F-02",
      category: "requirement",
      statement:
        "Les visiteurs filtrent les programmes par âge, accessibilité, lieu et période avant de déposer une demande.",
      confidence: 1,
      evidenceType: "explicit",
      citations: [
        cite(
          "SRC-01",
          "SRC-01-P003",
          "filtrer par âge, accessibilité, lieu et période",
          "fr",
        ),
      ],
    },
    {
      id: "F-03",
      category: "constraint",
      statement:
        "Chaque demande est examinée par un coordinateur ; aucune place n’est attribuée automatiquement.",
      confidence: 1,
      evidenceType: "explicit",
      citations: [
        cite(
          "SRC-02",
          "SRC-02-P002",
          "Les places ne sont jamais attribuées automatiquement",
          "fr",
        ),
      ],
    },
    {
      id: "F-04",
      category: "constraint",
      statement:
        "Les données d’accessibilité exigent des accès restreints, un consentement explicite et une traçabilité des changements.",
      confidence: 0.98,
      evidenceType: "confirmed",
      citations: [
        cite(
          "SRC-02",
          "SRC-02-P003",
          "informations d’accessibilité doivent rester limitées",
          "fr",
        ),
        cite(
          "SRC-03",
          "SRC-03-P002",
          "role-based access and an audit trail",
          "en",
          "accès par rôles et historique des changements",
        ),
      ],
    },
    {
      id: "F-05",
      category: "exclusion",
      statement:
        "Le paiement, le transport, l’application mobile native et les espaces communautaires sont exclus du lancement.",
      confidence: 1,
      evidenceType: "explicit",
      citations: [
        cite("SRC-01", "SRC-01-P005", "ne font pas partie du lancement", "fr"),
      ],
    },
    {
      id: "F-06",
      category: "unknown",
      statement:
        "La conservation des demandes refusées et l’autorisation d’export des données sensibles restent à décider.",
      confidence: 1,
      evidenceType: "explicit",
      citations: [cite("SRC-02", "SRC-02-P005", "restent à confirmer", "fr")],
    },
    {
      id: "F-07",
      category: "assumption",
      statement:
        "Le français est la langue de lancement ; les pages anglaises restent une option ultérieure.",
      confidence: 0.99,
      evidenceType: "confirmed",
      citations: [
        cite(
          "SRC-01",
          "SRC-01-P004",
          "Le lancement est prévu en français",
          "fr",
        ),
        cite(
          "SRC-03",
          "SRC-03-P004",
          "English client-facing pages remain optional",
          "en",
          "Les pages client en anglais restent optionnelles",
        ),
      ],
    },
  ],
  sourceContributions: [
    {
      id: "SC-01",
      sourceId: "SRC-01",
      topic: "Expérience publique",
      contribution:
        "Introduit la découverte éditoriale, les publics, les filtres et les limites du lancement.",
      relation: "introduces",
      relatedFindingIds: ["F-01", "F-02", "F-05"],
      citations: [
        cite("SRC-01", "SRC-01-P003", "découvrir les programmes", "fr"),
      ],
    },
    {
      id: "SC-02",
      sourceId: "SRC-02",
      topic: "Traitement des demandes",
      contribution:
        "Complète le parcours avec les comptes, créneaux, revues humaines, statuts et notifications.",
      relation: "complements",
      relatedFindingIds: ["F-01", "F-03", "F-06"],
      citations: [
        cite(
          "SRC-02",
          "SRC-02-P002",
          "Un coordinateur vérifie la demande",
          "fr",
        ),
      ],
    },
    {
      id: "SC-03",
      sourceId: "SRC-03",
      topic: "Livraison et conformité",
      contribution:
        "Précise le délai, l’accessibilité, les rôles, les tests et le transfert de compétences.",
      relation: "refines",
      relatedFindingIds: ["F-04", "F-07"],
      citations: [
        cite(
          "SRC-03",
          "SRC-03-P002",
          "delivered within eight weeks",
          "en",
          "livré sous huit semaines",
        ),
      ],
    },
    {
      id: "SC-04",
      sourceId: "SRC-03",
      topic: "Langue de lancement",
      contribution:
        "Confirme en anglais que la version anglaise reste optionnelle et ne doit pas retarder le lancement français.",
      relation: "confirms",
      relatedFindingIds: ["F-07"],
      citations: [
        cite(
          "SRC-03",
          "SRC-03-P004",
          "must not delay the French launch",
          "en",
          "ne doit pas retarder le lancement français",
        ),
      ],
    },
  ],
  duplicatesMerged: [
    { statement: "Gestion des besoins d’accessibilité", citationCount: 3 },
    { statement: "Application web responsive", citationCount: 2 },
  ],
  inconsistencies: [],
  suggestedNextStep:
    "Décider la politique de conservation et les droits d’export avant de finaliser le périmètre.",
  referenceInfluences: [
    {
      id: "RI-FR-DEMO-01",
      referenceId: "reference-atelier-luma",
      area: "analysis",
      statement: "Le cas Atelier Luma a servi de point de comparaison pour les candidatures bilingues et les exports internes, sans ajouter de besoin au projet.",
      provenance: "reference_case",
      confidence: "medium",
    },
  ],
};

export const frenchDemoQuestions: Question[] = [
  {
    id: "Q-01",
    text: "Combien de temps les demandes refusées doivent-elles être conservées ?",
    priority: "blocking",
    rationale:
      "La durée conditionne les règles de suppression et la conformité du dossier.",
    estimationImpact:
      "Une conservation configurable ajoute des tâches planifiées, un journal et des scénarios d’exception.",
    citations: [
      cite(
        "SRC-02",
        "SRC-02-P005",
        "durée de conservation des demandes refusées",
        "fr",
      ),
    ],
    status: "open",
    answer: null,
  },
  {
    id: "Q-02",
    text: "Quels rôles peuvent consulter et exporter les besoins d’accessibilité ?",
    priority: "blocking",
    rationale:
      "Les données sensibles nécessitent une règle explicite de moindre privilège.",
    estimationImpact:
      "Des droits d’export granulaires ajoutent des règles d’autorisation et des tests d’audit.",
    citations: [cite("SRC-02", "SRC-02-P003", "personnes autorisées", "fr")],
    status: "open",
    answer: null,
  },
  {
    id: "Q-03",
    text: "Les pages anglaises doivent-elles être chiffrées dès le lancement ou comme option ?",
    priority: "framing",
    rationale:
      "Les sources les présentent comme option sans calendrier confirmé.",
    estimationImpact:
      "La localisation ajoute routage, workflow éditorial et recette multilingue.",
    citations: [
      cite(
        "SRC-03",
        "SRC-03-P004",
        "English client-facing pages remain optional",
        "en",
        "Les pages client anglaises restent optionnelles",
      ),
    ],
    status: "open",
    answer: null,
  },
  {
    id: "Q-04",
    text: "Quel prestataire d’envoi d’e-mails faut-il retenir comme hypothèse ?",
    priority: "optional",
    rationale: "Le besoin est défini mais le prestataire reste ouvert.",
    estimationImpact:
      "Le choix influence surtout l’intégration et la configuration des modèles.",
    citations: [
      cite(
        "SRC-02",
        "SRC-02-P004",
        "prestataire d’envoi n’est pas encore choisi",
        "fr",
      ),
    ],
    status: "open",
    answer: null,
  },
];

export const frenchDemoWorkstreams: Workstream[] = [
  {
    id: "WS-01",
    name: "Expérience et contenus",
    description:
      "Cadrage, présentation éditoriale et découverte des programmes.",
    order: 1,
    modules: [
      {
        id: "M-01",
        name: "Cadrage de l’expérience",
        description:
          "Parcours, architecture de l’information et prototype responsive.",
        status: "included",
        features: ["Parcours publics", "Modèle de contenu", "Prototype"],
        dependencies: [],
        assumptions: ["Identité graphique fournie"],
        citations: [
          cite("SRC-01", "SRC-01-P003", "découvrir les programmes", "fr"),
        ],
      },
      {
        id: "M-02",
        name: "Catalogue des programmes",
        description:
          "Pages éditoriales, filtres, intervenants et ressources accessibles.",
        status: "included",
        features: ["Catalogue", "Filtres", "Fiches programmes", "Ressources"],
        dependencies: ["M-01"],
        assumptions: ["Contenus livrés progressivement"],
        citations: [
          cite(
            "SRC-01",
            "SRC-01-P004",
            "présentation, des objectifs pédagogiques",
            "fr",
          ),
        ],
      },
      {
        id: "M-03",
        name: "Version anglaise",
        description:
          "Routage, contenus et recette d’une sélection de pages anglaises.",
        status: "optional",
        features: ["Routes anglaises", "Workflow de traduction", "Recette"],
        dependencies: ["M-02"],
        assumptions: ["Traductions fournies"],
        citations: [
          cite(
            "SRC-03",
            "SRC-03-P004",
            "English client-facing pages remain optional",
            "en",
            "Les pages client anglaises restent optionnelles",
          ),
        ],
      },
    ],
  },
  {
    id: "WS-02",
    name: "Demandes et coordination",
    description: "Compte structure, demandes, revue humaine et communication.",
    order: 2,
    modules: [
      {
        id: "M-04",
        name: "Compte et demande",
        description:
          "Compte structure, groupe, créneaux et besoins spécifiques.",
        status: "included",
        features: ["Compte", "Formulaire", "Créneaux", "Accessibilité"],
        dependencies: ["M-01"],
        assumptions: ["Textes de consentement validés"],
        citations: [cite("SRC-02", "SRC-02-P002", "crée un compte", "fr")],
      },
      {
        id: "M-05",
        name: "Revue et statuts",
        description: "File de revue, échanges, décision et capacité.",
        status: "included",
        features: ["File de revue", "Statuts", "Confirmation", "Capacité"],
        dependencies: ["M-04"],
        assumptions: ["Attribution toujours manuelle"],
        citations: [cite("SRC-02", "SRC-02-P002", "confirme ou refuse", "fr")],
      },
      {
        id: "M-06",
        name: "Notifications e-mail",
        description: "Messages transactionnels du dépôt au rappel.",
        status: "included",
        features: ["Réception", "Complément", "Confirmation", "Rappel"],
        dependencies: ["M-05"],
        assumptions: ["Prestataire choisi au cadrage"],
        citations: [
          cite("SRC-02", "SRC-02-P004", "Des courriels sont nécessaires", "fr"),
        ],
      },
    ],
  },
  {
    id: "WS-03",
    name: "Administration et lancement",
    description: "Pilotage, sécurité, qualité et transfert.",
    order: 3,
    modules: [
      {
        id: "M-07",
        name: "Administration sécurisée",
        description: "Programmes, capacités, rôles, exports et historique.",
        status: "included",
        features: ["Administration", "Rôles", "Exports", "Historique"],
        dependencies: ["M-04", "M-05"],
        assumptions: ["Deux rôles internes au lancement"],
        citations: [
          cite(
            "SRC-03",
            "SRC-03-P002",
            "role-based access and an audit trail",
            "en",
            "accès par rôles et historique",
          ),
        ],
      },
      {
        id: "M-08",
        name: "Qualité et transfert",
        description: "Accessibilité, tests, déploiement et formation.",
        status: "included",
        features: ["WCAG 2.2 AA", "Tests critiques", "Guide", "Formation"],
        dependencies: ["M-02", "M-07"],
        assumptions: ["Environnement de déploiement disponible"],
        citations: [
          cite(
            "SRC-03",
            "SRC-03-P004",
            "automated tests for critical workflows",
            "en",
            "tests automatisés des parcours critiques",
          ),
        ],
      },
      {
        id: "M-09",
        name: "Paiement et transport",
        description: "Paiement des activités et organisation du transport.",
        status: "excluded",
        features: ["Paiement", "Transport"],
        dependencies: [],
        assumptions: [],
        citations: [
          cite(
            "SRC-01",
            "SRC-01-P005",
            "ne font pas partie du lancement",
            "fr",
          ),
        ],
      },
    ],
  },
];

export const frenchDemoEstimateLines: EstimateLine[] = [
  [
    "E-01",
    "M-01",
    3,
    5,
    7,
    "high",
    "medium",
    "Trois publics et plusieurs parcours de demande nécessitent un cadrage initial.",
  ],
  [
    "E-02",
    "M-02",
    5,
    7,
    10,
    "high",
    "medium",
    "Filtres, gabarits éditoriaux, ressources et accessibilité.",
  ],
  [
    "E-03",
    "M-03",
    3,
    5,
    8,
    "medium",
    "medium",
    "Routage, champs localisés et recette bilingue.",
  ],
  [
    "E-04",
    "M-04",
    5,
    8,
    12,
    "medium",
    "high",
    "Compte, groupe, créneaux, consentement et données sensibles.",
  ],
  [
    "E-05",
    "M-05",
    5,
    8,
    12,
    "medium",
    "high",
    "États, échanges, décisions humaines et règles de capacité.",
  ],
  [
    "E-06",
    "M-06",
    3,
    5,
    8,
    "high",
    "medium",
    "Quatre modèles et suivi des événements de livraison.",
  ],
  [
    "E-07",
    "M-07",
    6,
    9,
    13,
    "medium",
    "high",
    "Rôles, exports sensibles et historique des changements.",
  ],
  [
    "E-08",
    "M-08",
    4,
    6,
    9,
    "medium",
    "medium",
    "Accessibilité, tests, déploiement, documentation et formation.",
  ],
  ["E-09", "M-09", 0, 0, 0, "high", "low", "Explicitement exclu du lancement."],
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

export function makeFrenchDemoChangeProposal(
  line: EstimateLine,
): ChangeProposal {
  const after = {
    ...line,
    likely: line.likely + 1,
    high: line.high + 2,
    rationale: `${line.rationale} La fourchette révisée rend explicites les cas d’erreur et les limites de permissions.`,
  };
  return {
    id: `CP-${line.id}`,
    targetType: "estimate_line",
    targetId: line.id,
    before: line,
    after,
    explanation:
      "Les sources indiquent que les scénarios réaliste et haut doivent couvrir les droits d’accès, les erreurs et les reprises. Le scénario bas reste inchangé.",
    status: "pending",
  };
}

export function createFrenchDemoState(): WorkspaceState {
  const now = new Date().toISOString();
  return {
    project: {
      id: "demo-fr",
      mode: "demo",
      name: "Portail culturel Calyra",
      clientName: "Calyra",
      sector: "Médiation culturelle",
      description:
        "Portail éditorial et gestion contrôlée des demandes de participation.",
      status: "draft",
      estimationUnit: "day",
      currency: "EUR",
      contingencyRate: 0.15,
      projectLanguage: "auto",
      resolvedProjectLanguage: "fr",
      projectLanguageConfirmed: false,
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
    sources: frenchDemoSources,
    questions: [],
    decisions: [],
    workstreams: [],
    estimateLines: [],
    activity: [
      {
        id: "A-FR-01",
        label: "Démonstration Calyra chargée",
        createdAt: now,
        kind: "project",
      },
    ],
    analysisVersions: [],
    aiExecutions: {},
    referenceCaseIds: ["reference-atelier-luma"],
    referenceMatches: [],
    referenceInfluences: [],
    estimateSnapshots: [],
    approvedEstimateSnapshotId: null,
    proposalSnapshot: null,
    acknowledgedValidationWarnings: [],
  };
}
