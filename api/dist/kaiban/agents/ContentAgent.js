"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContentAgent = void 0;
const kaibanjs_1 = require("kaibanjs");
const ScreenshotAnalyzerTool_1 = require("../tools/ScreenshotAnalyzerTool");
const CredibilityEvaluatorTool_1 = require("../tools/CredibilityEvaluatorTool");
const logger_1 = require("../../utils/logger");
const llmConfig_1 = require("./llmConfig");
/**
 * ContentAgent is responsible for:
 * 1. Processing screenshots
 * 2. Extracting information from visual content
 * 3. Evaluating source credibility
 */
class ContentAgent {
    constructor(config) {
        try {
            // Initialize tools
            this.screenshotAnalyzerTool = new ScreenshotAnalyzerTool_1.ScreenshotAnalyzerTool();
            this.credibilityEvaluatorTool = new CredibilityEvaluatorTool_1.CredibilityEvaluatorTool();
            // Create a custom llmConfig with the provided model parameters if available
            const agentLlmConfig = {
                provider: config?.provider || llmConfig_1.llmConfig.provider,
                model: config?.model || llmConfig_1.llmConfig.model,
                apiKey: llmConfig_1.llmConfig.apiKey,
                apiBaseUrl: llmConfig_1.llmConfig.apiBaseUrl
            };
            logger_1.logger.info(`ContentAgent initializing with model: ${agentLlmConfig.model}, provider: ${agentLlmConfig.provider}`);
            // Initialize the agent with the tools and custom llmConfig
            // Pass the tool instances directly to the agent with type casting
            this.agent = new kaibanjs_1.Agent({
                name: 'Visioneer',
                role: 'Content Analyst',
                goal: 'Extract and analyze information from web content screenshots, evaluate credibility, and identify key insights',
                background: 'Expert in visual content analysis, information extraction, and source evaluation',
                // systemMessage: `You are a content analysis specialist with access to two specific tools:
                //   1. "screenshot_analyzer" - Use this to analyze screenshot content
                //      Usage: screenshot_analyzer({"screenshotId": "id-here", "analysisType": "full"})
                //   2. "credibility_evaluator" - Use this to evaluate source credibility
                //      Usage: credibility_evaluator({"url": "url-here", "content": "content-text-here"})
                //   IMPORTANT: Do NOT attempt to use any other tools that don't exist in your toolkit.
                //   Work directly with the results provided by these tools without trying to use additional tools.`,
                tools: [
                    this.screenshotAnalyzerTool,
                    this.credibilityEvaluatorTool
                ], // Type cast as any to avoid TypeScript errors
                llmConfig: agentLlmConfig
            });
            logger_1.logger.info('ContentAgent initialized successfully');
        }
        catch (error) {
            logger_1.logger.error(`Failed to initialize ContentAgent: ${error}`);
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
exports.ContentAgent = ContentAgent;
