"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SummaryAgent = void 0;
const kaibanjs_1 = require("kaibanjs");
const QualityAssessorTool_1 = require("../tools/QualityAssessorTool");
const ReportFormatterTool_1 = require("../tools/ReportFormatterTool");
const logger_1 = require("../../utils/logger");
const llmConfig_1 = require("./llmConfig");
/**
 * SummaryAgent is responsible for:
 * 1. Synthesizing information from multiple sources
 * 2. Creating coherent summaries
 * 3. Formatting research reports
 */
class SummaryAgent {
    constructor(config) {
        try {
            // Initialize tools
            this.qualityAssessorTool = new QualityAssessorTool_1.QualityAssessorTool();
            this.reportFormatterTool = new ReportFormatterTool_1.ReportFormatterTool();
            // Initialize the agent with the tools
            this.agent = new kaibanjs_1.Agent({
                name: 'Synthesizer',
                role: 'Research Synthesizer',
                goal: 'Synthesize information from multiple sources into coherent, structured reports',
                background: 'Expert in information synthesis, knowledge distillation, and clear communication',
                tools: [
                    this.qualityAssessorTool,
                    this.reportFormatterTool
                ],
                llmConfig: llmConfig_1.llmConfig
            });
            logger_1.logger.info('SummaryAgent initialized successfully');
        }
        catch (error) {
            logger_1.logger.error(`Failed to initialize SummaryAgent: ${error}`);
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
exports.SummaryAgent = SummaryAgent;
