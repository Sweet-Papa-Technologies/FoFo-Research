"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResearchTeam = void 0;
const kaibanjs_1 = require("kaibanjs");
const agents_1 = require("../agents");
const logger_1 = require("../../utils/logger");
/**
 * ResearchTeam combines the Search and Content agents to:
 * 1. Perform initial research on a topic
 * 2. Process and analyze search results
 * 3. Extract key information from web content
 */
class ResearchTeam {
    constructor(config) {
        try {
            // Initialize agents
            this.searchAgent = new agents_1.SearchAgent({
                model: config?.model,
                provider: config?.provider
            });
            this.contentAgent = new agents_1.ContentAgent({
                model: config?.model,
                provider: config?.provider
            });
            // Define tasks for the research team
            const generateQueriesTask = new kaibanjs_1.Task({
                title: 'Generate research queries',
                description: `
          Generate a set of search queries for the research topic: {topic}.
          
          Consider:
          - The core research question
          - Different aspects of the topic to explore
          - Potential contradictory viewpoints
          - Recent developments (if applicable)
          
          Return 3-5 search queries that would provide comprehensive coverage.
        `,
                expectedOutput: 'A JSON array of search queries, with explanations for why each query is valuable',
                agent: this.searchAgent.getAgent()
            });
            const performSearchTask = new kaibanjs_1.Task({
                title: 'Perform search',
                description: `
          Use the search tool to execute the queries from the previous task: {taskResult:task1}
          
          For each query:
          1. Execute the search
          2. Evaluate the results for relevance
          3. Identify the most promising sources
          
          Return a JSON object with the query results, including URLs and brief descriptions.
        `,
                expectedOutput: 'A structured JSON object with search results for each query',
                agent: this.searchAgent.getAgent()
            });
            const analyzeContentTask = new kaibanjs_1.Task({
                title: 'Analyze content',
                description: `
          Analyze the content from the search results: {taskResult:task2}
          
          For each URL with a screenshot:
          1. Extract key information using screenshot_analyzer
          2. Evaluate source credibility using credibility_evaluator
          3. Identify the most valuable insights
          
          Return a structured analysis of each source, including extracted information, credibility assessment, and key insights.
        `,
                expectedOutput: 'A comprehensive analysis of web content from search results',
                agent: this.contentAgent.getAgent()
            });
            // Create the team
            this.team = new kaibanjs_1.Team({
                name: 'Research Team',
                agents: [
                    this.searchAgent.getAgent(),
                    this.contentAgent.getAgent()
                ],
                tasks: [
                    generateQueriesTask,
                    performSearchTask,
                    analyzeContentTask
                ],
                env: {
                    OPENAI_API_KEY: config?.apiKey || process.env.OPENAI_API_KEY || ''
                },
                // Research insights based on factual understanding
                insights: `
          Effective Research Practices:
          1. Prioritize credible sources (academic, government, established news)
          2. Seek diverse viewpoints on controversial topics
          3. Pay attention to publication dates for time-sensitive information
          4. Validate key claims across multiple sources
          5. Consider potential biases in sources
          6. Extract both factual information and analytical perspectives
          7. Maintain awareness of knowledge gaps
        `
            });
            logger_1.logger.info('ResearchTeam initialized successfully');
        }
        catch (error) {
            logger_1.logger.error(`Failed to initialize ResearchTeam: ${error}`);
            throw error;
        }
    }
    /**
     * Start the research process
     */
    async start(inputs) {
        try {
            logger_1.logger.info(`Starting research on topic: "${inputs.topic}"`);
            const output = await this.team.start(inputs);
            return output;
        }
        catch (error) {
            logger_1.logger.error(`Research process encountered an error: ${error}`);
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
exports.ResearchTeam = ResearchTeam;
