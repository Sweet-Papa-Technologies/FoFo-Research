"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResearchDirectorAgent = void 0;
const kaibanjs_1 = require("kaibanjs");
const logger_1 = require("../../utils/logger");
const llmConfig_1 = require("./llmConfig");
/**
 * ResearchDirectorAgent is responsible for:
 * 1. Orchestrating research
 * 2. Allocating resources
 * 3. Identifying knowledge gaps
 * 4. Maintaining research focus
 */
class ResearchDirectorAgent {
    constructor(config) {
        try {
            // Create a custom llmConfig with the provided model parameters if available
            const agentLlmConfig = {
                provider: config?.provider || llmConfig_1.llmConfig.provider,
                model: config?.model || llmConfig_1.llmConfig.model,
                apiKey: llmConfig_1.llmConfig.apiKey,
                apiBaseUrl: llmConfig_1.llmConfig.apiBaseUrl
            };
            logger_1.logger.info(`ResearchDirectorAgent initializing with model: ${agentLlmConfig.model}, provider: ${agentLlmConfig.provider}`);
            // Initialize the agent with custom llmConfig
            this.agent = new kaibanjs_1.Agent({
                name: 'Director',
                role: 'Research Director',
                goal: 'Orchestrate the research process, ensure comprehensive coverage, and maintain focus on the research question',
                background: 'Expert in research methodology, project management, and knowledge gap analysis',
                tools: [], // Director doesn't need tools as it orchestrates other agents
                llmConfig: agentLlmConfig
            });
            logger_1.logger.info('ResearchDirectorAgent initialized successfully');
        }
        catch (error) {
            logger_1.logger.error(`Failed to initialize ResearchDirectorAgent: ${error}`);
            throw error;
        }
    }
    /**
     * Get the KaibanJS agent instance
     */
    getAgent() {
        return this.agent;
    }
}
exports.ResearchDirectorAgent = ResearchDirectorAgent;
