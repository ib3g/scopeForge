import { z } from "zod";

const booleanValue = (fallback: boolean) =>
  z.preprocess(
    (value) =>
      value === undefined || value === ""
        ? fallback
        : value === true || value === "true",
    z.boolean(),
  );

const optionalSecret = z.preprocess(
  (value) => typeof value === "string" && value.trim() ? value.trim() : undefined,
  z.string().min(1).optional(),
);

const ServerEnvironmentSchema = z.object({
  OPENAI_API_KEY: optionalSecret,
  OPENAI_PRIMARY_MODEL: z.string().min(1).optional(),
  OPENAI_MODEL: z.string().min(1).optional(),
  DEPLOYMENT_PROFILE: z.enum(["local", "public_demo"]).default("local"),
  DEMO_MODE: booleanValue(false),
  ALLOW_PUBLIC_LIVE_AI: booleanValue(false),
  ENABLE_COMPONENT_LAB: booleanValue(true),
  ENABLE_DIAGNOSTICS: booleanValue(true),
  MAX_UPLOAD_BYTES: z.coerce.number().int().min(1024).max(25 * 1024 * 1024).default(10 * 1024 * 1024),
  MAX_AI_PAYLOAD_BYTES: z.coerce.number().int().min(10_000).max(5_000_000).default(1_000_000),
  MAX_PDF_PAYLOAD_BYTES: z.coerce.number().int().min(10_000).max(5_000_000).default(2_000_000),
  AI_REQUEST_TIMEOUT_MS: z.coerce.number().int().min(5_000).max(180_000).default(90_000),
});

export type ServerEnvironment = z.infer<typeof ServerEnvironmentSchema>;

export class ServerEnvironmentError extends Error {
  readonly code = "INVALID_SERVER_CONFIGURATION";
}

let cachedEnvironment: ServerEnvironment | undefined;

export function getServerEnvironment(): ServerEnvironment {
  if (cachedEnvironment && process.env.NODE_ENV !== "test") return cachedEnvironment;
  const result = ServerEnvironmentSchema.safeParse(process.env);
  if (!result.success) {
    const fields = Array.from(new Set(result.error.issues.map((issue) => issue.path.join(".") || "environment"))).join(", ");
    throw new ServerEnvironmentError(`Invalid server configuration: ${fields}`);
  }
  if (result.data.DEPLOYMENT_PROFILE === "public_demo" && result.data.ALLOW_PUBLIC_LIVE_AI) {
    throw new ServerEnvironmentError("Public Live AI is not supported by the frozen Build Week deployment profile.");
  }
  cachedEnvironment = result.data;
  return result.data;
}

export function resetServerEnvironmentForTests() {
  cachedEnvironment = undefined;
}
