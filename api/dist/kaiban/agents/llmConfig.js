"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.llmConfig = void 0;
exports.llmConfig = {
    provider: process.env.LLM_PROVIDER,
    model: process.env.LLM_MODEL,
    apiKey: process.env.LLM_API_KEY,
    apiBaseUrl: process.env.LLM_BASE_URL
};
