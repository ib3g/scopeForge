import { describe, expect, it } from "vitest";
import { zodTextFormat } from "openai/helpers/zod";
import { ChangeProposalSchema, EstimateProposalSchema, ProjectAnalysisSchema, QuestionsSchema, ScopeSchema } from "./schemas";

type JSONSchema = {
  type?: string | string[];
  properties?: Record<string, JSONSchema>;
  required?: string[];
  items?: JSONSchema;
  anyOf?: JSONSchema[];
  $defs?: Record<string, JSONSchema>;
};

function expectEveryPropertyRequired(schema: JSONSchema, path = "root") {
  if (schema.properties) {
    const keys = Object.keys(schema.properties).sort();
    expect(schema.required?.slice().sort(), `${path} must require every property`).toEqual(keys);
    for (const [key, child] of Object.entries(schema.properties)) expectEveryPropertyRequired(child, `${path}.${key}`);
  }
  if (schema.items) expectEveryPropertyRequired(schema.items, `${path}[]`);
  schema.anyOf?.forEach((child, index) => expectEveryPropertyRequired(child, `${path}.anyOf[${index}]`));
  Object.entries(schema.$defs ?? {}).forEach(([key, child]) => expectEveryPropertyRequired(child, `${path}.$defs.${key}`));
}

describe("OpenAI structured output schemas", () => {
  const schemas = { analysis: ProjectAnalysisSchema, questions: QuestionsSchema, scope: ScopeSchema, estimate: EstimateProposalSchema, review: ChangeProposalSchema };

  for (const [name, schema] of Object.entries(schemas)) {
    it(`${name} requires every declared field`, () => {
      const format = zodTextFormat(schema, `scopeforge_${name}`) as unknown as { schema: JSONSchema };
      expectEveryPropertyRequired(format.schema);
    });
  }

  it("uses required nullable values for semantically optional fields", () => {
    expect(ProjectAnalysisSchema.shape.inconsistencies.element.shape.resolution.safeParse(null).success).toBe(true);
    expect(QuestionsSchema.shape.questions.element.shape.answer.safeParse(null).success).toBe(true);
    expect(ProjectAnalysisSchema.shape.findings.element.shape.citations.element.shape.excerptLocale.safeParse(null).success).toBe(true);
    expect(ProjectAnalysisSchema.shape.findings.element.shape.citations.element.shape.translatedExcerpt.safeParse(null).success).toBe(true);
  });
});
