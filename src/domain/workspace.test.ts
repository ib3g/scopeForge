import { describe, expect, it } from "vitest";
import { createInitialState, demoEstimateLines, demoQuestions, demoWorkstreams, makeDemoChangeProposal } from "@/infrastructure/demo-data";
import { answerQuestion, createProposal, resolveChangeProposal, updateChangeProposalAfter, updateQuestionStatus } from "@/use-cases/workspace";
import { toClientProposal } from "./proposal";

describe("human controlled workflow", () => {
  it("turns an answer into a traceable decision", () => {
    const state = { ...createInitialState(), questions: demoQuestions };
    const next = answerQuestion(state, "Q-01", "Confirm immediately.");
    expect(next.questions[0].status).toBe("answered");
    expect(next.decisions[0]).toMatchObject({ sourceQuestionId: "Q-01", statement: "Confirm immediately.", kind: "client_answer" });
  });

  it("supports defer and ignore transitions", () => {
    const state = { ...createInitialState(), questions: demoQuestions };
    expect(updateQuestionStatus(state, "Q-02", "deferred").questions[1].status).toBe("deferred");
    expect(updateQuestionStatus(state, "Q-03", "ignored").questions[2].status).toBe("ignored");
  });

  it("does not apply an AI proposal until accepted", () => {
    const state = { ...createInitialState(), workstreams: demoWorkstreams, estimateLines: demoEstimateLines };
    const proposal = makeDemoChangeProposal(demoEstimateLines[0]);
    const pending = createProposal(state, proposal);
    expect(pending.estimateLines[0]).toEqual(proposal.before);
    expect(resolveChangeProposal(pending, false).estimateLines[0]).toEqual(proposal.before);
    expect(resolveChangeProposal(pending, true).estimateLines[0]).toMatchObject({ low: proposal.after.low, likely: proposal.after.likely, high: proposal.after.high, rationale: proposal.after.rationale, manualOverride: true, updatedBy: "user" });
  });

  it("lets a user edit a pending proposal before accepting it", () => {
    const state = { ...createInitialState(), workstreams: demoWorkstreams, estimateLines: demoEstimateLines };
    const pending = createProposal(state, makeDemoChangeProposal(demoEstimateLines[0]));
    const edited = updateChangeProposalAfter(pending, { likely: pending.changeProposal!.after.likely + 1 });
    expect(edited.estimateLines[0]).toEqual(pending.estimateLines[0]);
    expect(edited.changeProposal?.after.likely).toBe(pending.changeProposal!.after.likely + 1);
    expect(resolveChangeProposal(edited, true).estimateLines[0].likely).toBe(edited.changeProposal?.after.likely);
  });

  it("removes internal rationale, risks, citations and reserve from client data", () => {
    const state = { ...createInitialState(), workstreams: demoWorkstreams, estimateLines: demoEstimateLines };
    const client = toClientProposal(state);
    const serialized = JSON.stringify(client);
    expect(serialized).not.toContain("rationale");
    expect(serialized).not.toContain("confidence");
    expect(serialized).not.toContain("contingency");
    expect(serialized).not.toContain("citations");
  });
});
