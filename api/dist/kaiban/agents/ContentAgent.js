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
            // Initialize the agent with the tools
            this.agent = new kaibanjs_1.Agent({
                name: 'Visioneer',
                role: 'Content Analyst',
                goal: 'Extract and analyze information from web content screenshots, evaluate credibility, and identify key insights',
                background: 'Expert in visual content analysis, information extraction, and source evaluation',
                tools: [
                    this.screenshotAnalyzerTool,
                    this.credibilityEvaluatorTool
                ],
                llmConfig: llmConfig_1.llmConfig
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
