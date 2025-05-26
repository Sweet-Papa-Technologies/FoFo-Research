export const llmConfig = {
    provider: process.env.LLM_PROVIDER,
    model: process.env.LLM_MODEL,
    apiKey: process.env.LLM_API_KEY,
    apiBaseUrl: process.env.LLM_BASE_URL
} as any
    