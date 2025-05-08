"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SynthesisTeam = void 0;
const kaibanjs_1 = require("kaibanjs");
const agents_1 = require("../agents");
const logger_1 = require("../../utils/logger");
/**
 * SynthesisTeam combines the Summary and Research Director agents to:
 * 1. Evaluate research quality
 * 2. Synthesize findings into coherent narratives
 * 3. Generate structured reports
 * 4. Identify knowledge gaps
 */
class SynthesisTeam {
    constructor(config) {
        try {
            // Initialize agents
            this.summaryAgent = new agents_1.SummaryAgent({
                model: config?.model,
                provider: config?.provider
            });
            this.directorAgent = new agents_1.ResearchDirectorAgent({
                model: config?.model,
                provider: config?.provider
            });
            // Define tasks for the synthesis team
            const evaluateResearchTask = new kaibanjs_1.Task({
                title: 'Evaluate research quality',
                description: `
          Evaluate the quality and completeness of the research results: {researchResults}
          
          Consider:
          - Source diversity and credibility
          - Comprehensiveness of coverage
          - Potential biases or gaps
          - Overall research quality
          
          Use the quality_assessor tool to perform a structured assessment.
          
          Return a detailed evaluation with strengths, weaknesses, and an overall quality score.
        `,
                expectedOutput: 'A comprehensive quality assessment of the research',
                agent: this.summaryAgent.getAgent()
            });
            const identifyInsightsTask = new kaibanjs_1.Task({
                title: 'Identify key insights',
                description: `
          Review the research results: {researchResults}
          And the quality assessment: {taskResult:task1}
          
          Identify the most significant insights, including:
          - Key findings across sources
          - Consensus views
          - Notable disagreements or controversies
          - Unexpected or surprising information
          - Time-sensitive developments
          
          Return a structured list of key insights with supporting evidence.
        `,
                expectedOutput: 'A prioritized list of key insights with supporting evidence',
                agent: this.directorAgent.getAgent()
            });
            const createSummaryTask = new kaibanjs_1.Task({
                title: 'Create comprehensive summary',
                description: `
          Synthesize the research results: {researchResults}
          The quality assessment: {taskResult:task1}
          And the key insights: {taskResult:task2}
          
          Create a comprehensive summary that:
          - Addresses the original research topic: {topic}
          - Integrates information from multiple sources
          - Maintains nuance and accuracy
          - Acknowledges limitations
          - Is structured logically
          
          Return a well-organized summary that comprehensively covers the topic.
        `,
                expectedOutput: 'A comprehensive summary of the research findings',
                agent: this.summaryAgent.getAgent()
            });
            const identifyGapsTask = new kaibanjs_1.Task({
                title: 'Identify knowledge gaps',
                description: `
          Based on the research results: {researchResults}
          And the comprehensive summary: {taskResult:task3}
          
          Identify significant knowledge gaps such as:
          - Unanswered questions
          - Areas needing deeper research
          - Contradictions needing resolution
          - Recent developments requiring follow-up
          - Missing perspectives or viewpoints
          
          Return a list of knowledge gaps with recommendations for further research.
        `,
                expectedOutput: 'A list of knowledge gaps with recommendations for further research',
                agent: this.directorAgent.getAgent()
            });
            const formatReportTask = new kaibanjs_1.Task({
                title: 'Format final report',
                description: `
          Using all the information gathered:
          - Research results: {researchResults}
          - Quality assessment: {taskResult:task1}
          - Key insights: {taskResult:task2}
          - Comprehensive summary: {taskResult:task3}
          - Knowledge gaps: {taskResult:task4}
          
          Create a well-structured final report including:
          - Executive summary
          - Methodology
          - Key findings
          - Detailed analysis
          - Conclusions
          - References/sources (with credibility ratings)
          - Recommendations for further research
          
          Use the report_formatter tool to format the report based on the desired format: {reportFormat}
          
          Return the formatted report ready for presentation.
        `,
                expectedOutput: 'A fully formatted research report',
                agent: this.summaryAgent.getAgent(),
                isDeliverable: true // Mark this as the final deliverable
            });
            // Create the team
            this.team = new kaibanjs_1.Team({
                name: 'Synthesis Team',
                agents: [
                    this.summaryAgent.getAgent(),
                    this.directorAgent.getAgent()
                ],
                tasks: [
                    evaluateResearchTask,
                    identifyInsightsTask,
                    createSummaryTask,
                    identifyGapsTask,
                    formatReportTask
                ],
                env: {
                    OPENAI_API_KEY: config?.apiKey || process.env.OPENAI_API_KEY || ''
                },
                // Research insights for synthesis best practices
                insights: `
          Effective Synthesis Practices:
          1. Prioritize information based on quality, not just quantity
          2. Integrate diverse perspectives without losing coherence
          3. Structure information to address the core research question
          4. Maintain source attribution for all key claims
          5. Present information at appropriate levels of detail
          6. Use formatting to enhance readability and understanding
          7. Include confidence levels for conclusions when appropriate
          8. Highlight areas of consensus vs. controversy
          9. Address limitations transparently
        `
            });
            logger_1.logger.info('SynthesisTeam initialized successfully');
        }
        catch (error) {
            logger_1.logger.error(`Failed to initialize SynthesisTeam: ${error}`);
            throw error;
        }
    }
    /**
     * Start the synthesis process
     */
    async start(inputs) {
        try {
            logger_1.logger.info(`Starting synthesis for topic: "${inputs.topic}"`);
            // Set default report format if not provided
            const reportInputs = {
                ...inputs,
                reportFormat: inputs.reportFormat || 'detailed'
            };
            const output = await this.team.start(reportInputs);
            return output;
        }
        catch (error) {
            logger_1.logger.error(`Synthesis process encountered an error: ${error}`);
            throw error;
        }
    }
    /**
     * Get the KaibanJS team instance
     */
    getTeam() {
        return this.team;
    }
}
exports.SynthesisTeam = SynthesisTeam;
