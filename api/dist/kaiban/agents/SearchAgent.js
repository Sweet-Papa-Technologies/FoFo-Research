"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SearchAgent = void 0;
const kaibanjs_1 = require("kaibanjs");
const searchService_1 = require("../../services/searchService");
const logger_1 = require("../../utils/logger");
const llmConfig_1 = require("./llmConfig");
/**
 * SearchAgent is responsible for:
 * 1. Generating search queries
 * 2. Evaluating search results
 * 3. Identifying follow-up queries
 */
class SearchAgent {
    constructor(config) {
        try {
            // Initialize search tool - in this app we have our own searchService
            // but we wrap it as a LangChain-compatible tool
            this.searchTool = {
                name: "search",
                description: "Search for information using the DuckDuckGo search engine",
                schema: {
                    type: "object",
                    properties: {
                        query: {
                            type: "string",
                            description: "The search query"
                        },
                        maxResults: {
                            type: "number",
                            description: "Maximum number of results to return"
                        }
                    },
                    required: ["query"]
                },
                _call: async (input) => {
                    const { query, maxResults = 5 } = input;
                    logger_1.logger.info(`SearchAgent performing search: "${query}"`);
                    try {
                        const results = await searchService_1.searchService.search(query, { maxResults });
                        return JSON.stringify(results);
                    }
                    catch (error) {
                        logger_1.logger.error(`Search error: ${error}`);
                        return JSON.stringify({ error: "Search failed", message: error instanceof Error ? error.message : String(error) });
                    }
                }
            };
            // Initialize the agent with the search tool
            this.agent = new kaibanjs_1.Agent({
                name: 'Scout',
                role: 'Search Specialist',
                goal: 'Find the most relevant information about the research topic and identify valuable sources',
                background: 'Expert in search query formulation, source evaluation, and iterative research refinement',
                tools: [this.searchTool],
                llmConfig: llmConfig_1.llmConfig
            });
            logger_1.logger.info('SearchAgent initialized successfully');
        }
        catch (error) {
            logger_1.logger.error(`Failed to initialize SearchAgent: ${error}`);
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
exports.SearchAgent = SearchAgent;
