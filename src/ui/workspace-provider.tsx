"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type {
  AIAction,
  AiExecutionMetadata,
  AiExecutionMode,
  ClientProposalSettings,
  EstimateLine,
  EstimateSnapshot,
  EstimationPreferences,
  ProjectAnalysis,
  ProjectSource,
  ReferenceCase,
  ReferenceMatch,
  EstimationMethod,
  EstimationMethodOverrides,
  Question,
  SourceLanguage,
  WorkspaceState,
  Workstream,
} from "@/domain/schemas";
import { buildClientDocument, defaultClientProposalSettings } from "@/domain/client-document";
import { canApplyAiResult, isAiOperationActive, operationElapsedMs, type AiOperation, type AiOperationStatus } from "@/domain/ai-operation";
import { determineDominantLanguage } from "@/domain/language";
import { createInitialState } from "@/infrastructure/demo-data";
import { createFrenchDemoState } from "@/infrastructure/demo-data-fr";
import { recordLocalDiagnostic } from "@/infrastructure/local-diagnostics";
import {
  normalizeWorkspaceState,
  projectRepository,
  resolvedClientLanguage,
} from "@/infrastructure/project-repository";
import {
  answerQuestion,
  createProposal,
  resolveChangeProposal,
  updateChangeProposalAfter,
  updateEstimateLine,
  updateModuleStatus,
  updateQuestionStatus,
} from "@/use-cases/workspace";
import { normalizeSource } from "@/domain/source";
import { validateRange } from "@/domain/estimation";
import {
  currentSourceChecksum,
  currentSourceVersions,
  estimateTotalsForSnapshot,
  readinessFor,
  type ProjectReadiness,
} from "@/domain/project-lifecycle";
import { useI18n } from "@/i18n";
import {
  compareEstimateWithReference,
  createReferenceFromEstimate,
  defaultEstimationMethods,
  defaultReferenceCases,
  estimationMethodRepository,
  findReferenceMatches,
  mergeMethodOverrides,
  referenceCaseRepository,
} from "@/infrastructure/estimation-library";

type ProjectSettingsPatch = Partial<
  Pick<
    WorkspaceState["project"],
    | "name"
    | "clientName"
    | "sector"
    | "projectLanguage"
    | "clientOutputLanguage"
    | "estimationUnit"
    | "currency"
    | "contingencyRate"
  >
>;

function projectRevision(current: WorkspaceState) {
  return JSON.stringify({
    projectId: current.project.id,
    sources: current.sources.map((source) => ({ id: source.id, content: source.content })),
    decisions: current.decisions.map((decision) => ({ id: decision.id, statement: decision.statement })),
  });
}

type WorkspaceContextValue = {
  state: WorkspaceState;
  hydrated: boolean;
  busy?: AIAction;
  operation: AiOperation | null;
  error?: string;
  executionMode: AiExecutionMode | null;
  aiConfiguration: {
    configured: boolean;
    primaryModel: string;
    deploymentProfile: "local" | "public_demo";
    liveAvailable: boolean;
    componentLabEnabled: boolean;
    diagnosticsEnabled: boolean;
  } | null;
  storageStatus: { persistent: boolean; code: string | null };
  retryLastAction: () => Promise<boolean>;
  reset: () => void;
  addSource: (
    title: string,
    content: string,
    kind: ProjectSource["kind"],
    document?: ProjectSource["document"],
  ) => void;
  removeSource: (id: string) => void;
  updateSource: (id: string, content: string) => void;
  updateSourceLanguage: (id: string, override: string | null) => void;
  runAnalysis: () => Promise<boolean>;
  generateQuestions: () => Promise<boolean>;
  respond: (id: string, answer: string) => void;
  setQuestionStatus: (id: string, status: Question["status"]) => void;
  buildScope: () => Promise<boolean>;
  generateEstimate: () => Promise<boolean>;
  changeModuleStatus: (
    id: string,
    status: Workstream["modules"][number]["status"],
  ) => void;
  editEstimate: (
    id: string,
    patch: Partial<Pick<EstimateLine, "low" | "likely" | "high">>,
  ) => boolean;
  setContingency: (rate: number) => void;
  updateAnalysisSummary: (summary: string) => void;
  updateProjectSettings: (patch: ProjectSettingsPatch) => void;
  updateEstimationPreferences: (patch: Partial<EstimationPreferences>) => void;
  reviewLine: (line: EstimateLine) => Promise<boolean>;
  editProposalAfter: (
    patch: Partial<Pick<EstimateLine, "low" | "likely" | "high">>,
  ) => boolean;
  resolveProposal: (accepted: boolean) => void;
  recordExport: (kind: string) => void;
  methods: EstimationMethod[];
  references: ReferenceCase[];
  selectedMethod: EstimationMethod | null;
  referenceMatches: ReferenceMatch[];
  setEstimationMethod: (id: string | null) => void;
  setMethodOverrides: (patch: EstimationMethodOverrides) => void;
  toggleReference: (id: string) => void;
  refreshReferenceMatches: () => void;
  compareWithReference: (id: string) => void;
  saveEstimateAsReference: (input: { title: string; summary: string; tags: string[] }) => ReferenceCase | null;
  resetMethodOverrides: () => void;
  readiness: ProjectReadiness;
  acknowledgeValidationWarning: (id: string) => void;
  approveEstimate: () => boolean;
  createEstimateRevision: () => void;
  restoreEstimateRevision: (snapshotId: string) => boolean;
  generateClientProposal: () => boolean;
  updateProposalSettings: (patch: Partial<ClientProposalSettings>) => void;
};

type PublicAIConfiguration = NonNullable<WorkspaceContextValue["aiConfiguration"]>;

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

const templateFor = (projectId: string, untitled = "Untitled project") => {
  if (projectId === "demo-fr") return createFrenchDemoState();
  if (projectId === "demo") return createInitialState();
  const base = createInitialState();
  return {
    ...base,
    project: {
      ...base.project,
      id: projectId,
      mode: "live" as const,
      name: untitled,
      clientName: "",
      sector: "",
      description: "",
      status: "draft" as const,
    },
    sources: [],
    analysis: undefined,
    questions: [],
    decisions: [],
    workstreams: [],
    estimateLines: [],
    changeProposal: undefined,
    activity: [],
    analysisVersions: [],
    aiExecution: undefined,
    aiExecutions: {},
    referenceCaseIds: [],
    referenceMatches: [],
    referenceInfluences: [],
    estimateSnapshots: [],
    approvedEstimateSnapshotId: null,
    proposalSnapshot: null,
    proposalSettings: defaultClientProposalSettings(base),
    acknowledgedValidationWarnings: [],
  };
};

export function WorkspaceProvider({
  projectId,
  children,
}: {
  projectId: string;
  children: React.ReactNode;
}) {
  const { locale: interfaceLocale, t } = useI18n();
  const [state, setState] = useState<WorkspaceState>(() => {
    const template = templateFor(projectId, t("common.untitled"));
    return projectId === template.project.id
      ? template
      : normalizeWorkspaceState(
          {
            ...template,
            project: {
              ...template.project,
              id: projectId,
              name: t("common.untitled"),
              status: "draft",
            },
            sources: [],
          },
          projectId,
        );
  });
  const [hydrated, setHydrated] = useState(false);
  const [operation, setOperation] = useState<AiOperation | null>(null);
  const [error, setError] = useState<string>();
  const [errorMode, setErrorMode] = useState<"not_configured" | "error">();
  const [aiConfiguration, setAIConfiguration] = useState<{
    configured: boolean;
    primaryModel: string;
    deploymentProfile: "local" | "public_demo";
    liveAvailable: boolean;
    componentLabEnabled: boolean;
    diagnosticsEnabled: boolean;
  } | null>(null);
  const [storageStatus, setStorageStatus] = useState(() => projectRepository.storageStatus());
  const [methods, setMethods] = useState<EstimationMethod[]>(defaultEstimationMethods);
  const [references, setReferences] = useState<ReferenceCase[]>(defaultReferenceCases);
  const retryRef = useRef<(() => Promise<boolean>) | undefined>(undefined);
  const operationRef = useRef<AiOperation | null>(null);
  const abortRef = useRef<AbortController | null>(null);


  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      const stored = projectRepository.get(projectId);
      if (stored) setState(stored);
      else projectRepository.save(state);
      setHydrated(true);
    });
    return () => {
      cancelled = true;
      abortRef.current?.abort();
      abortRef.current = null;
    };
    // state is intentionally the initial template only during hydration.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  useEffect(() => {
    setMethods(estimationMethodRepository.list());
    setReferences(referenceCaseRepository.list());
  }, []);

  useEffect(() => {
    if (!hydrated || !references.length) return;
    setState((current) => current.referenceCaseIds.length && !current.referenceMatches.length
      ? { ...current, referenceMatches: findReferenceMatches(current, references).filter((match) => current.referenceCaseIds.includes(match.referenceId)) }
      : current);
  }, [hydrated, references]);

  useEffect(() => {
    if (hydrated) {
      projectRepository.save(state);
      const nextStatus = projectRepository.storageStatus();
      setStorageStatus((current) => current.persistent === nextStatus.persistent && current.code === nextStatus.code ? current : nextStatus);
    }
  }, [hydrated, state]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setOperation((current) => {
        if (!current || !isAiOperationActive(current)) return current;
        return { ...current, elapsedMs: operationElapsedMs(current) };
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/ai/status", { cache: "no-store" })
      .then((response) =>
        response.ok
          ? (response.json() as Promise<PublicAIConfiguration>)
          : null,
      )
      .then((configuration) => {
        if (!cancelled && configuration) setAIConfiguration(configuration);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const resolveWorkingLanguage = useCallback(
    (current: WorkspaceState) => {
      if (current.project.projectLanguage !== "auto")
        return current.project.projectLanguage;
      if (
        current.project.projectLanguageConfirmed &&
        current.project.resolvedProjectLanguage
      )
        return current.project.resolvedProjectLanguage;
      return (
        determineDominantLanguage(
          current.sources,
          current.decisions.map((decision) => decision.statement),
        ) ??
        current.project.resolvedProjectLanguage ??
        interfaceLocale
      );
    },
    [interfaceLocale],
  );

  const languageContext = useCallback(
    (current: WorkspaceState, resolved = resolveWorkingLanguage(current)) => ({
      interfaceLocale,
      projectLanguage: resolved,
      clientOutputLanguage: resolvedClientLanguage({
        ...current,
        project: { ...current.project, resolvedProjectLanguage: resolved },
      }),
      sources: current.sources.map((source) => ({
        id: source.id,
        detectedLocale: source.language.detectedLocale,
        userOverride: source.language.userOverride,
        isMultilingual: source.language.isMultilingual,
        confidence: source.language.confidence,
      })),
    }),
    [interfaceLocale, resolveWorkingLanguage],
  );

  const estimationContext = useCallback((current: WorkspaceState) => {
    const method = mergeMethodOverrides(
      methods.find((item) => item.id === current.project.estimationMethodId) ?? null,
      current.project.estimationMethodOverrides,
    );
    const selectedReferences = current.referenceCaseIds.slice(0, 3).map((id) => {
      const reference = references.find((item) => item.id === id);
      if (!reference) return null;
      return {
        reference,
        match: current.referenceMatches.find((item) => item.referenceId === id) ?? null,
      };
    }).filter(Boolean);
    return { method, references: selectedReferences };
  }, [methods, references]);

  const callAI = useCallback(
    async <T,>(
      action: AIAction,
      payload: Record<string, unknown>,
      current: WorkspaceState,
      resolved?: string,
    ): Promise<{ data: T; execution: AiExecutionMetadata; operationId: string; projectId: string; sourceRevision: string } | null> => {
      const previous = operationRef.current;
      if (previous && isAiOperationActive(previous)) return null;
      const startedOperation: AiOperation = {
        id: `ai-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        type: action,
        projectId: current.project.id,
        status: "preparing",
        label: ({
          analysis: t("assistant.consolidating"),
          questions: t("assistant.questions"),
          scope: t("assistant.scope"),
          estimate: t("assistant.estimate"),
          review: t("assistant.review"),
        } as Record<AIAction, string>)[action],
        startedAt: new Date().toISOString(),
        elapsedMs: 0,
        finishedAt: null,
        model: aiConfiguration?.primaryModel ?? null,
        requestId: null,
        errorMessage: null,
        sourceRevision: projectRevision(current),
        retryable: false,
      };
      operationRef.current = startedOperation;
      setOperation(startedOperation);
      setError(undefined);
      setErrorMode(undefined);
      try {
        const controller = new AbortController();
        abortRef.current?.abort();
        abortRef.current = controller;
        const setStage = (status: AiOperationStatus) => setOperation((item) => item?.id === startedOperation.id ? { ...item, status, elapsedMs: operationElapsedMs(item) } : item);
        setStage("sending");
        const response = await fetch(`/api/ai/${action}`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            projectMode: current.project.mode,
            payload: {
              ...payload,
              languageContext: languageContext(current, resolved),
              estimationContext: estimationContext(current),
            },
          }),
        });
        setStage("processing");
        const body = (await response.json().catch(() => null)) as {
          data?: T;
          execution?: AiExecutionMetadata;
          error?: string;
          code?: string;
        } | null;
        if (!response.ok || !body?.data || !body.execution) {
          const message =
            body?.code === "AI_NOT_CONFIGURED"
              ? t("errors.aiNotConfiguredDetails")
              : body?.code === "AI_TIMEOUT"
                ? t("errors.aiTimeoutDetails")
                : body?.code === "AI_INVALID_RESPONSE"
                  ? t("errors.aiInvalidResponseDetails")
              : body?.code === "INVALID_REQUEST"
                ? t("errors.invalidAIRequest")
                : t("errors.aiRequestFailedDetails");
          const failure = new Error(message) as Error & { code?: string };
          failure.code = body?.code;
          throw failure;
        }
        setStage("validating");
        setOperation((item) => item?.id === startedOperation.id ? {
          ...item,
          status: "completed",
          finishedAt: new Date().toISOString(),
          elapsedMs: operationElapsedMs(item, Date.now()),
          model: body.execution?.model ?? item.model,
          requestId: body.execution?.requestId ?? null,
          retryable: false,
        } : item);
        recordLocalDiagnostic({
          id: startedOperation.id,
          projectId: startedOperation.projectId,
          operation: action,
          startedAt: startedOperation.startedAt,
          durationMs: operationElapsedMs(startedOperation),
          status: "success",
          errorCode: null,
          model: body.execution.model,
          promptVersion: body.execution.promptVersion,
          requestId: body.execution.requestId ?? null,
          sourceCount: current.sources.length,
          approximateCharacters: current.sources.reduce((total, source) => total + source.paragraphs.reduce((sum, paragraph) => sum + paragraph.text.length, 0), 0),
          inputTokens: body.execution.inputTokens ?? null,
          outputTokens: body.execution.outputTokens ?? null,
        });
        retryRef.current = undefined;
        return { data: body.data, execution: body.execution, operationId: startedOperation.id, projectId: startedOperation.projectId, sourceRevision: startedOperation.sourceRevision };
      } catch (cause) {
        if (cause instanceof DOMException && cause.name === "AbortError") {
          setOperation((item) => item?.id === startedOperation.id ? { ...item, status: "cancelled", finishedAt: new Date().toISOString(), elapsedMs: operationElapsedMs(item, Date.now()), retryable: true } : item);
          recordLocalDiagnostic({ id: startedOperation.id, projectId: startedOperation.projectId, operation: action, startedAt: startedOperation.startedAt, durationMs: operationElapsedMs(startedOperation), status: "failure", errorCode: "CANCELLED", model: startedOperation.model, promptVersion: null, requestId: null, sourceCount: current.sources.length, approximateCharacters: current.sources.reduce((total, source) => total + source.paragraphs.reduce((sum, paragraph) => sum + paragraph.text.length, 0), 0), inputTokens: null, outputTokens: null });
          return null;
        }
        setError(
          cause instanceof Error
            ? cause.message
            : t("errors.aiRequestFailedDetails"),
        );
        setErrorMode(
          cause &&
            typeof cause === "object" &&
            "code" in cause &&
            cause.code === "AI_NOT_CONFIGURED"
            ? "not_configured"
            : "error",
        );
        setOperation((item) => item?.id === startedOperation.id ? {
          ...item,
          status: "failed",
          finishedAt: new Date().toISOString(),
          elapsedMs: operationElapsedMs(item, Date.now()),
          errorMessage: cause instanceof Error ? cause.message : t("errors.aiRequestFailedDetails"),
          retryable: true,
        } : item);
        recordLocalDiagnostic({ id: startedOperation.id, projectId: startedOperation.projectId, operation: action, startedAt: startedOperation.startedAt, durationMs: operationElapsedMs(startedOperation), status: "failure", errorCode: cause && typeof cause === "object" && "code" in cause ? String(cause.code) : "AI_REQUEST_FAILED", model: startedOperation.model, promptVersion: null, requestId: null, sourceCount: current.sources.length, approximateCharacters: current.sources.reduce((total, source) => total + source.paragraphs.reduce((sum, paragraph) => sum + paragraph.text.length, 0), 0), inputTokens: null, outputTokens: null });
        return null;
      } finally {
        abortRef.current = null;
      }
    },
    [aiConfiguration?.primaryModel, estimationContext, languageContext, t],
  );

  const withExecution = <T extends WorkspaceState>(
    current: T,
    action: AIAction,
    execution: AiExecutionMetadata,
  ): T => ({
    ...current,
    aiExecution: { ...execution, action },
    aiExecutions: { ...current.aiExecutions, [action]: execution },
  });

  const addActivity = (
    current: WorkspaceState,
    label: string,
    kind: NonNullable<WorkspaceState["activity"][number]["kind"]>,
    before: string | null = null,
    after: string | null = null,
  ) => [
    ...current.activity,
    {
      id: `A-${Date.now()}`,
      label,
      kind,
      before,
      after,
      createdAt: new Date().toISOString(),
    },
  ];
  const relabelLastActivity = (current: WorkspaceState, label: string) => ({
    ...current,
    activity: current.activity.map((item, index) =>
      index === current.activity.length - 1 ? { ...item, label } : item,
    ),
  });
  const busy = operation && isAiOperationActive(operation) ? operation.type : undefined;

  const value = useMemo<WorkspaceContextValue>(
    () => ({
      state,
      hydrated,
      busy,
      operation,
      error,
      aiConfiguration,
      storageStatus,
      executionMode: busy
        ? "requesting"
        : (errorMode ??
          state.aiExecution?.executionMode ??
          (!aiConfiguration?.configured && state.project.mode === "live"
            ? "not_configured"
            : null)),
      retryLastAction: async () =>
        retryRef.current ? retryRef.current() : false,
      reset: () => {
        const next = templateFor(projectId, t("common.untitled"));
        projectRepository.save(next);
        setState(next);
        setError(undefined);
        setErrorMode(undefined);
      },
      addSource: (title, content, kind, document) =>
        setState((current) => {
          const nextNumber =
            Math.max(
              0,
              ...current.sources.map(
                (source) => Number(source.id.replace("SRC-", "")) || 0,
              ),
            ) + 1;
          const id = `SRC-${String(nextNumber).padStart(2, "0")}`;
          const source = {
            ...normalizeSource(
              id,
              title,
              t("sources.importedOrigin", {
                kind: kind === "markdown" ? "Markdown" : kind === "pasted_text" ? "text" : kind.toUpperCase(),
              }),
              content,
            ),
            kind,
            document,
          };
          return {
            ...current,
            sources: [...current.sources, source],
            analysis: undefined,
            questions: [],
            decisions: [],
            workstreams: [],
            estimateLines: [],
            changeProposal: undefined,
            approvedEstimateSnapshotId: null,
            proposalSnapshot: null,
            aiExecution: undefined,
            aiExecutions: {},
            project: { ...current.project, status: "draft" },
            activity: addActivity(
              current,
              t("decisions.sourceImported", { name: title }),
              "source",
            ),
          };
        }),
      removeSource: (id) =>
        setState((current) => ({
          ...current,
          sources: current.sources.filter((source) => source.id !== id),
          analysis: undefined,
          referenceMatches: [],
          referenceInfluences: [],
          estimationComparison: undefined,
          questions: [],
          decisions: [],
          workstreams: [],
          estimateLines: [],
          changeProposal: undefined,
          approvedEstimateSnapshotId: null,
          proposalSnapshot: null,
          aiExecution: undefined,
          aiExecutions: {},
          project: {
            ...current.project,
            status: current.sources.length <= 1 ? "draft" : "draft",
          },
          activity: addActivity(
            current,
            t("decisions.sourceRemoved"),
            "source",
          ),
        })),
      updateSource: (id, content) =>
        setState((current) => ({
          ...current,
          sources: current.sources.map((source) => {
            if (source.id !== id) return source;
            const normalized = normalizeSource(
              source.id,
              source.title,
              source.origin,
              content,
            );
            return {
              ...normalized,
              kind: source.kind,
              document: source.document,
              language: {
                ...normalized.language,
                userOverride: source.language.userOverride,
                method: source.language.userOverride
                  ? "manual"
                  : normalized.language.method,
              } as SourceLanguage,
            };
          }),
          analysis: undefined,
          referenceMatches: [],
          referenceInfluences: [],
          estimationComparison: undefined,
          questions: [],
          decisions: [],
          workstreams: [],
          estimateLines: [],
          changeProposal: undefined,
          approvedEstimateSnapshotId: null,
          proposalSnapshot: null,
          aiExecution: undefined,
          aiExecutions: {},
          project: { ...current.project, status: "draft" },
        })),
      updateSourceLanguage: (id, override) =>
        setState((current) => ({
          ...current,
          sources: current.sources.map((source) =>
            source.id === id
              ? {
                  ...source,
                  language: {
                    ...source.language,
                    userOverride: override,
                    method: override
                      ? "manual"
                      : source.language.detectedLocale
                        ? "local_heuristic"
                        : "unknown",
                  },
                }
              : source,
          ),
          activity: addActivity(
            current,
            t("decisions.sourceLanguageChanged", {
              language: override ?? t("common.automatic"),
            }),
            "language",
            null,
            override,
          ),
        })),
      runAnalysis: async function runAnalysis() {
        retryRef.current = runAnalysis;
        const resolved = resolveWorkingLanguage(state);
        const result = await callAI<ProjectAnalysis>(
          "analysis",
          { sources: state.sources },
          state,
          resolved,
        );
        if (!result) return false;
        setOperation((item) => item?.id === result.operationId ? { ...item, status: "applying" } : item);
        let stale = false;
        setState((current) => {
          if (!canApplyAiResult(result, current.project.id, projectRevision(current))) { stale = true; return current; }
          return withExecution({
              ...current,
              analysis: result.data,
              referenceInfluences: result.data.referenceInfluences,
              analysisVersions: current.analysis
                ? [
                    ...current.analysisVersions,
                    {
                      id: `AV-${Date.now()}`,
                      locale:
                        current.project.resolvedProjectLanguage ?? resolved,
                      analysis: current.analysis,
                      execution: current.aiExecutions.analysis,
                      createdAt: new Date().toISOString(),
                    },
                  ]
                : current.analysisVersions,
              project: {
                ...current.project,
                status: "scope_ready",
                resolvedProjectLanguage: resolved,
                projectLanguageConfirmed: true,
              },
              activity: addActivity(
                current,
                t("decisions.analysisCompleted"),
                "language",
                current.project.resolvedProjectLanguage,
                resolved,
              ),
            },
            "analysis",
            result.execution,
          );
        });
        if (stale) { setError(t("errors.aiResultStale")); setOperation((item) => item?.id === result.operationId ? { ...item, status: "failed", errorMessage: t("errors.aiResultStale"), retryable: true } : item); return false; }
        setOperation((item) => item?.id === result.operationId ? { ...item, status: "completed" } : item);
        return true;
      },
      generateQuestions: async function generateQuestions() {
        retryRef.current = generateQuestions;
        const resolved = resolveWorkingLanguage(state);
        const result = await callAI<{ questions: Question[] }>(
          "questions",
          { analysis: state.analysis, sources: state.sources },
          state,
          resolved,
        );
        if (!result) return false;
        setOperation((item) => item?.id === result.operationId ? { ...item, status: "applying" } : item);
        let stale = false;
        setState((current) => {
          if (!canApplyAiResult(result, current.project.id, projectRevision(current))) { stale = true; return current; }
          return withExecution({
              ...current,
              questions: result.data.questions,
              project: { ...current.project, status: "scope_ready" },
            },
            "questions",
            result.execution,
          );
        });
        if (stale) { setError(t("errors.aiResultStale")); setOperation((item) => item?.id === result.operationId ? { ...item, status: "failed", errorMessage: t("errors.aiResultStale"), retryable: true } : item); return false; }
        setOperation((item) => item?.id === result.operationId ? { ...item, status: "completed" } : item);
        return true;
      },
      respond: (id, answer) =>
        setState((current) =>
          relabelLastActivity(
            answerQuestion(current, id, answer),
            t("decisions.clarificationRecorded"),
          ),
        ),
      setQuestionStatus: (id, status) =>
        setState((current) =>
          relabelLastActivity(
            updateQuestionStatus(current, id, status),
            t("decisions.questionStatusChanged", {
              status: t(
                status === "ignored"
                  ? "questions.notRelevant"
                  : `common.${status === "answered" ? "recorded" : status}`,
              ),
            }),
          ),
        ),
      buildScope: async function buildScope() {
        retryRef.current = buildScope;
        const resolved = resolveWorkingLanguage(state);
        const result = await callAI<{ workstreams: Workstream[] }>(
          "scope",
          {
            analysis: state.analysis,
            decisions: state.decisions,
            sources: state.sources,
          },
          state,
          resolved,
        );
        if (!result) return false;
        setOperation((item) => item?.id === result.operationId ? { ...item, status: "applying" } : item);
        let stale = false;
        setState((current) => {
          if (!canApplyAiResult(result, current.project.id, projectRevision(current))) { stale = true; return current; }
          return withExecution({
              ...current,
              workstreams: result.data.workstreams,
              project: { ...current.project, status: "scope_ready" },
            },
            "scope",
            result.execution,
          );
        });
        if (stale) { setError(t("errors.aiResultStale")); setOperation((item) => item?.id === result.operationId ? { ...item, status: "failed", errorMessage: t("errors.aiResultStale"), retryable: true } : item); return false; }
        setOperation((item) => item?.id === result.operationId ? { ...item, status: "completed" } : item);
        return true;
      },
      generateEstimate: async function generateEstimate() {
        retryRef.current = generateEstimate;
        const resolved = resolveWorkingLanguage(state);
        const result = await callAI<{ lines: EstimateLine[] }>(
          "estimate",
          {
            workstreams: state.workstreams,
            sources: state.sources,
            estimationUnit: state.project.estimationUnit,
          },
          state,
          resolved,
        );
        if (!result) return false;
        setOperation((item) => item?.id === result.operationId ? { ...item, status: "applying" } : item);
        let stale = false;
        setState((current) => {
          if (!canApplyAiResult(result, current.project.id, projectRevision(current))) { stale = true; return current; }
          return withExecution({
              ...current,
              estimateLines: result.data.lines,
              project: { ...current.project, status: "in_review" },
              activity: addActivity(
                current,
                t("decisions.estimateGenerated"),
                "estimate",
              ),
            },
            "estimate",
            result.execution,
          );
        });
        if (stale) { setError(t("errors.aiResultStale")); setOperation((item) => item?.id === result.operationId ? { ...item, status: "failed", errorMessage: t("errors.aiResultStale"), retryable: true } : item); return false; }
        setOperation((item) => item?.id === result.operationId ? { ...item, status: "completed" } : item);
        return true;
      },
      changeModuleStatus: (id, status) => {
        if (state.approvedEstimateSnapshotId) {
          setError(t("errors.estimateLocked"));
          return;
        }
        setState((current) =>
          relabelLastActivity(
            updateModuleStatus(current, id, status),
            t("decisions.moduleStatusChanged", {
              status: t(`common.${status}`),
            }),
          ),
        );
      },
      editEstimate: (id, patch) => {
        if (state.approvedEstimateSnapshotId) {
          setError(t("errors.estimateLocked"));
          return false;
        }
        const line = state.estimateLines.find((item) => item.id === id);
        if (!line) return false;
        const candidate = { ...line, ...patch };
        if (!validateRange(candidate.low, candidate.likely, candidate.high)) {
          setError(t("errors.invalidRange"));
          return false;
        }
        setError(undefined);
        setState((current) =>
          relabelLastActivity(
            updateEstimateLine(current, id, patch),
            t("decisions.estimateManuallyUpdated"),
          ),
        );
        return true;
      },
      setContingency: (rate) => {
        if (state.approvedEstimateSnapshotId) {
          setError(t("errors.estimateLocked"));
          return;
        }
        if (!Number.isFinite(rate) || rate < 0 || rate > 1) {
          setError(t("errors.invalidReserve"));
          return;
        }
        setError(undefined);
        setState((current) => {
          if (current.project.contingencyRate === rate) return current;
          return {
            ...current,
            project: { ...current.project, contingencyRate: rate, estimationMethodOverrides: { ...current.project.estimationMethodOverrides, reserveRate: rate } },
            activity: addActivity(
              current,
              t("decisions.reserveChanged"),
              "estimate",
              String(current.project.contingencyRate),
              String(rate),
            ),
          };
        });
      },
      updateAnalysisSummary: (summary) =>
        setState((current) => {
          if (!current.analysis || !summary.trim()) return current;
          return {
            ...current,
            analysis: {
              ...current.analysis,
              executiveSummary: summary.trim(),
            },
            proposalSnapshot: null,
            project: {
              ...current.project,
              status: current.approvedEstimateSnapshotId
                ? "internally_approved"
                : current.project.status,
            },
            activity: addActivity(
              current,
              t("decisions.proposalTextUpdated"),
              "project",
            ),
          };
        }),
      updateProjectSettings: (patch) =>
        setState((current) => {
          const beforeLanguage = current.project.projectLanguage;
          const explicit =
            patch.projectLanguage && patch.projectLanguage !== "auto"
              ? patch.projectLanguage
              : null;
          return {
            ...current,
            project: {
              ...current.project,
              ...patch,
              estimationMethodOverrides: patch.estimationUnit
                ? { ...current.project.estimationMethodOverrides, primaryUnit: patch.estimationUnit === "hour" ? "hours" : "person_days" }
                : current.project.estimationMethodOverrides,
              resolvedProjectLanguage:
                explicit ?? current.project.resolvedProjectLanguage,
              projectLanguageConfirmed: explicit
                ? true
                : patch.projectLanguage === "auto"
                  ? false
                  : current.project.projectLanguageConfirmed,
            },
            activity:
              patch.projectLanguage && patch.projectLanguage !== beforeLanguage
                ? addActivity(
                    current,
                    t("decisions.projectLanguageChanged", {
                      language: patch.projectLanguage,
                    }),
                    "language",
                    beforeLanguage,
                    patch.projectLanguage,
                  )
                : current.activity,
          };
        }),
      updateEstimationPreferences: (patch) => {
        if (state.approvedEstimateSnapshotId) {
          setError(t("errors.estimateLocked"));
          return;
        }
        setState((current) => ({
          ...current,
          project: {
            ...current.project,
            preferences: { ...current.project.preferences, ...patch },
            estimationMethodOverrides: patch.rounding
              ? { ...current.project.estimationMethodOverrides, rounding: String(patch.rounding) as "0.5" | "1" | "5" }
              : current.project.estimationMethodOverrides,
          },
          activity: addActivity(
            current,
            t("decisions.estimatePreferencesUpdated"),
            "estimate",
          ),
        }));
      },
      reviewLine: async function reviewLine(line) {
        retryRef.current = () => reviewLine(line);
        const resolved = resolveWorkingLanguage(state);
        const result = await callAI<WorkspaceState["changeProposal"]>(
          "review",
          { line, workstreams: state.workstreams, sources: state.sources },
          state,
          resolved,
        );
        if (!result?.data) return false;
        setOperation((item) => item?.id === result.operationId ? { ...item, status: "applying" } : item);
        let stale = false;
        setState((current) => {
          if (!canApplyAiResult(result, current.project.id, projectRevision(current))) { stale = true; return current; }
          return relabelLastActivity(
            createProposal(withExecution(current, "review", result.execution), result.data!),
            t("decisions.aiReviewProposed"),
          );
        });
        if (stale) { setError(t("errors.aiResultStale")); setOperation((item) => item?.id === result.operationId ? { ...item, status: "failed", errorMessage: t("errors.aiResultStale"), retryable: true } : item); return false; }
        setOperation((item) => item?.id === result.operationId ? { ...item, status: "completed" } : item);
        return true;
      },
      editProposalAfter: (patch) => {
        if (!state.changeProposal) return false;
        const candidate = { ...state.changeProposal.after, ...patch };
        if (!validateRange(candidate.low, candidate.likely, candidate.high)) {
          setError(t("errors.invalidProposalRange"));
          return false;
        }
        setError(undefined);
        setState((current) =>
          relabelLastActivity(
            updateChangeProposalAfter(current, patch),
            t("decisions.aiProposalEdited"),
          ),
        );
        return true;
      },
      resolveProposal: (accepted) =>
        setState((current) =>
          relabelLastActivity(
            resolveChangeProposal(current, accepted),
            t(
              accepted
                ? "decisions.aiSuggestionAccepted"
                : "decisions.aiSuggestionRejected",
            ),
          ),
        ),
      recordExport: (kind) =>
        setState((current) => ({
          ...current,
          activity: addActivity(
            current,
            t("decisions.exportGenerated", { kind }),
            "export",
          ),
        })),
      methods,
      references,
      selectedMethod: mergeMethodOverrides(
        methods.find((item) => item.id === state.project.estimationMethodId) ?? null,
        state.project.estimationMethodOverrides,
      ),
      referenceMatches: state.referenceMatches,
      setEstimationMethod: (id) =>
        setState((current) => {
          if (current.approvedEstimateSnapshotId) return current;
          const method = methods.find((item) => item.id === id) ?? null;
          return {
            ...current,
            project: {
              ...current.project,
              estimationMethodId: id,
              contingencyRate: method?.reserveRate ?? current.project.contingencyRate,
            },
            activity: addActivity(current, t("decisions.estimationMethodChanged"), "estimate", current.project.estimationMethodId, id),
          };
        }),
      setMethodOverrides: (patch) =>
        setState((current) => {
          if (current.approvedEstimateSnapshotId) return current;
          return ({
          ...current,
          project: {
            ...current.project,
            estimationMethodOverrides: { ...current.project.estimationMethodOverrides, ...patch },
            ...(patch.reserveRate !== undefined ? { contingencyRate: patch.reserveRate } : {}),
            ...(patch.primaryUnit === "hours" ? { estimationUnit: "hour" as const } : patch.primaryUnit === "person_days" ? { estimationUnit: "day" as const } : {}),
            preferences: patch.rounding ? { ...current.project.preferences, rounding: Number(patch.rounding) as 0.5 | 1 | 5 } : current.project.preferences,
          },
          activity: addActivity(current, t("decisions.estimationMethodOverrideChanged"), "estimate"),
          });
        }),
      toggleReference: (id) =>
        setState((current) => {
          const selected = current.referenceCaseIds.includes(id)
            ? current.referenceCaseIds.filter((item) => item !== id)
            : [...current.referenceCaseIds, id].slice(-3);
          return {
            ...current,
            referenceCaseIds: selected,
            referenceMatches: findReferenceMatches(current, references).filter((match) => selected.includes(match.referenceId)),
            estimationComparison: undefined,
          };
        }),
      refreshReferenceMatches: () =>
        setState((current) => ({ ...current, referenceMatches: findReferenceMatches(current, references) })),
      compareWithReference: (id) =>
        setState((current) => {
          const reference = references.find((item) => item.id === id);
          return reference
            ? { ...current, estimationComparison: compareEstimateWithReference(current, reference) }
            : current;
        }),
      saveEstimateAsReference: (input) => {
        if (!state.estimateLines.length) return null;
        const reference = createReferenceFromEstimate(state, input);
        referenceCaseRepository.save(reference);
        setReferences(referenceCaseRepository.list());
        setState((current) => ({
          ...current,
          activity: addActivity(current, t("decisions.referenceCreated"), "estimate"),
        }));
        return reference;
      },
      resetMethodOverrides: () =>
        setState((current) => {
          if (current.approvedEstimateSnapshotId) return current;
          const method = methods.find((item) => item.id === current.project.estimationMethodId);
          return {
            ...current,
            project: {
              ...current.project,
              estimationMethodOverrides: {},
              contingencyRate: method?.reserveRate ?? current.project.contingencyRate,
              estimationUnit: method?.primaryUnit === "hours" ? "hour" : "day",
              preferences: { ...current.project.preferences, rounding: method ? Number(method.rounding) as 0.5 | 1 | 5 : current.project.preferences.rounding },
            },
            activity: addActivity(current, t("decisions.estimationMethodReset"), "estimate"),
          };
        }),
      readiness: readinessFor(state),
      acknowledgeValidationWarning: (id) =>
        setState((current) => {
          const acknowledged = current.acknowledgedValidationWarnings.includes(id)
            ? current.acknowledgedValidationWarnings.filter((item) => item !== id)
            : [...current.acknowledgedValidationWarnings, id];
          return {
            ...current,
            acknowledgedValidationWarnings: acknowledged,
            activity: addActivity(current, t("decisions.validationWarningAcknowledged"), "estimate", id, acknowledged.includes(id) ? "acknowledged" : "unacknowledged"),
          };
        }),
      approveEstimate: () => {
        const readiness = readinessFor(state);
        if (!readiness.canApproveEstimate) return false;
        const now = new Date().toISOString();
        const method = mergeMethodOverrides(
          methods.find((item) => item.id === state.project.estimationMethodId) ?? null,
          state.project.estimationMethodOverrides,
        );
        const draft = state.estimateSnapshots.find((item) => item.status === "in_review");
        const snapshot: EstimateSnapshot = {
          id: draft?.id ?? `EST-${Date.now()}`,
          createdAt: now,
          author: t("common.localUser"),
          status: "approved",
          origin: draft?.origin ?? "generated",
          reason: draft?.reason ?? null,
          parentSnapshotId: draft?.parentSnapshotId ?? state.approvedEstimateSnapshotId,
          validatedAt: now,
          supersededAt: null,
          methodId: method?.id ?? null,
          methodOverrides: structuredClone(state.project.estimationMethodOverrides),
          estimationUnit: state.project.estimationUnit,
          contingencyRate: state.project.contingencyRate,
          preferences: structuredClone(state.project.preferences),
          totals: structuredClone(estimateTotalsForSnapshot(state)),
          estimateLines: structuredClone(state.estimateLines),
          workstreams: structuredClone(state.workstreams),
          assumptions: Array.from(new Set([
            ...(method?.assumptions ?? []),
            ...state.workstreams.flatMap((workstream) => workstream.modules.flatMap((module) => module.assumptions)),
          ])),
          decisions: structuredClone(state.decisions),
          referenceCaseIds: structuredClone(state.referenceCaseIds),
          sourceVersions: currentSourceVersions(state),
          sourceChecksum: currentSourceChecksum(state),
          aiExecutions: structuredClone(state.aiExecutions),
          revision: draft?.revision ?? state.estimateSnapshots.length + 1,
        };
        setState((current) => ({
          ...current,
          estimateSnapshots: current.estimateSnapshots.some((item) => item.id === snapshot.id)
            ? current.estimateSnapshots.map((item) => item.status === "approved"
              ? { ...item, status: "superseded" as const, supersededAt: now }
              : item.id === snapshot.id ? snapshot : item)
            : current.estimateSnapshots.map((item) => item.status === "approved"
              ? { ...item, status: "superseded" as const, supersededAt: now }
              : item).concat(snapshot),
          approvedEstimateSnapshotId: snapshot.id,
          proposalSnapshot: null,
          project: { ...current.project, status: "internally_approved" },
          activity: addActivity(current, t("decisions.estimateApproved"), "estimate", "in_review", "internally_approved"),
        }));
        return true;
      },
      createEstimateRevision: () =>
        setState((current) => {
          const parent = current.approvedEstimateSnapshotId
            ? current.estimateSnapshots.find((item) => item.id === current.approvedEstimateSnapshotId)
            : null;
          const now = new Date().toISOString();
          const method = mergeMethodOverrides(
            methods.find((item) => item.id === current.project.estimationMethodId) ?? null,
            current.project.estimationMethodOverrides,
          );
          const draft: EstimateSnapshot = {
            id: `EST-${Date.now()}`,
            createdAt: now,
            author: t("common.localUser"),
            status: "in_review",
            origin: "manual_revision",
            reason: t("estimate.newRevisionReason"),
            parentSnapshotId: parent?.id ?? null,
            validatedAt: null,
            supersededAt: null,
            methodId: method?.id ?? null,
            methodOverrides: structuredClone(current.project.estimationMethodOverrides),
            estimationUnit: current.project.estimationUnit,
            contingencyRate: current.project.contingencyRate,
            preferences: structuredClone(current.project.preferences),
            totals: structuredClone(estimateTotalsForSnapshot(current)),
            estimateLines: structuredClone(current.estimateLines),
            workstreams: structuredClone(current.workstreams),
            assumptions: Array.from(new Set([
              ...(method?.assumptions ?? []),
              ...current.workstreams.flatMap((workstream) => workstream.modules.flatMap((module) => module.assumptions)),
            ])),
            decisions: structuredClone(current.decisions),
            referenceCaseIds: structuredClone(current.referenceCaseIds),
            sourceVersions: currentSourceVersions(current),
            sourceChecksum: currentSourceChecksum(current),
            aiExecutions: structuredClone(current.aiExecutions),
            revision: current.estimateSnapshots.length + 1,
          };
          return {
            ...current,
            estimateSnapshots: [...current.estimateSnapshots, draft],
            approvedEstimateSnapshotId: null,
            proposalSnapshot: null,
            project: { ...current.project, status: "in_review" },
            activity: addActivity(current, t("decisions.estimateRevisionCreated"), "estimate", parent?.id ?? null, draft.id),
          };
        }),
      restoreEstimateRevision: (snapshotId) => {
        const snapshot = state.estimateSnapshots.find((item) => item.id === snapshotId);
        if (!snapshot) return false;
        setState((current) => {
          const now = new Date().toISOString();
          const draft: EstimateSnapshot = {
            ...structuredClone(snapshot),
            id: `EST-${Date.now()}`,
            createdAt: now,
            author: t("common.localUser"),
            status: "in_review",
            origin: "restored",
            reason: t("estimate.restoreReason", { revision: snapshot.revision }),
            parentSnapshotId: snapshot.id,
            validatedAt: null,
            supersededAt: null,
            revision: current.estimateSnapshots.length + 1,
          };
          return {
            ...current,
            estimateLines: structuredClone(snapshot.estimateLines),
            workstreams: structuredClone(snapshot.workstreams),
            referenceCaseIds: structuredClone(snapshot.referenceCaseIds),
            estimateSnapshots: [...current.estimateSnapshots, draft],
            approvedEstimateSnapshotId: null,
            proposalSnapshot: null,
            project: {
              ...current.project,
              estimationUnit: snapshot.estimationUnit,
              contingencyRate: snapshot.contingencyRate,
              preferences: structuredClone(snapshot.preferences),
              estimationMethodId: snapshot.methodId,
              estimationMethodOverrides: structuredClone(snapshot.methodOverrides),
              status: "in_review",
            },
            activity: addActivity(current, t("decisions.estimateRevisionRestored", { revision: snapshot.revision }), "estimate", snapshot.id, draft.id),
          };
        });
        return true;
      },
      generateClientProposal: () => {
        if (!state.approvedEstimateSnapshotId) return false;
        const snapshot = state.estimateSnapshots.find((item) => item.id === state.approvedEstimateSnapshotId);
        if (!snapshot || snapshot.status !== "approved" || !snapshot.validatedAt) return false;
        const generatedAt = new Date().toISOString();
        const proposalId = `PROP-${Date.now()}`;
        const settings = {
          ...defaultClientProposalSettings(state),
          ...(state.proposalSettings ?? {}),
          clientName: state.proposalSettings?.clientName || state.project.clientName,
          currency: state.proposalSettings?.currency || state.project.currency,
        };
        const document = buildClientDocument({
          state,
          snapshot,
          settings,
          method: mergeMethodOverrides(
            methods.find((item) => item.id === state.project.estimationMethodId) ?? null,
            state.project.estimationMethodOverrides,
          ),
          proposalId,
          generatedAt,
        });
        const proposalSnapshot = {
          id: proposalId,
          estimateSnapshotId: snapshot.id,
          generatedAt,
          clientOutputLanguage: resolvedClientLanguage(state),
          settings,
          document,
        };
        setState((current) => ({
          ...current,
          proposalSnapshot,
          project: { ...current.project, status: "proposal_ready" },
          activity: addActivity(current, t("decisions.clientProposalGenerated"), "project", "internally_approved", "proposal_ready"),
        }));
        return true;
      },
      updateProposalSettings: (patch) => {
        setState((current) => ({
          ...current,
          proposalSettings: {
            ...defaultClientProposalSettings(current),
            ...(current.proposalSettings ?? {}),
            ...patch,
          },
        }));
      },
    }),
    [
      state,
      hydrated,
      busy,
      operation,
      error,
      errorMode,
      aiConfiguration,
      storageStatus,
      projectId,
      callAI,
      resolveWorkingLanguage,
      t,
      methods,
      references,
    ],
  );

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context)
    throw new Error("useWorkspace must be used inside WorkspaceProvider");
  return context;
}
