import { createOpenRouter } from "@openrouter/ai-sdk-provider";

// Validate all env variables once at startup
function getEnv(key: string): string {
    const value = process.env[key];
    if (!value) throw new Error(`Missing environment variable: ${key}`);
    return value;
}

const OPENROUTER_API_KEY = getEnv("OPENROUTER_API_KEY");
const OPENROUTER_DEFAULT_MODEL = getEnv("OPENROUTER_DEFAULT_MODEL");

// Create provider once, reuse everywhere
const provider = createOpenRouter({ apiKey: OPENROUTER_API_KEY });

// Get model — optionally override the default
export function getAgentModel(modelId?: string) {
    return provider(modelId ?? OPENROUTER_DEFAULT_MODEL);
}