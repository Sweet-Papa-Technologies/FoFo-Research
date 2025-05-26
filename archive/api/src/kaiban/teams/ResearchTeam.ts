import { Team, Task } from 'kaibanjs';
import { SearchAgent, ContentAgent } from '../agents';
import { logger } from '../../utils/logger';

/**
 * ResearchTeam combines the Search and Content agents to:
 * 1. Perform initial research on a topic
 * 2. Process and analyze search results
 * 3. Extract key information from web content
 */
export class ResearchTeam {
  private team: Team;
  private searchAgent: SearchAgent;
  private contentAgent: ContentAgent;

  constructor(config?: {
    model?: string;
    provider?: string;
    apiKey?: string;
  }) {
    try {
      // Initialize agents
      this.searchAgent = new SearchAgent({
        model: config?.model,
        provider: config?.provider
      });

      this.contentAgent = new ContentAgent({
        model: config?.model,
        provider: config?.provider
      });

      // Define tasks for the research team
      const generateQueriesTask = new Task({
        title: 'Generate research queries',
        description: `
          Generate a set of search queries for the research topic: {topic}.
          
          Consider:
          - The core research question
          - Different aspects of the topic to explore
          - Potential contradictory viewpoints
          - Recent developments (if applicable)
          
          Return 3-5 search queries that would provide comprehensive coverage.
          
          Format your response as a JSON array containing objects with "query" and "rationale" fields:
          [
            {
              "query": "example search query",
              "rationale": "Explanation of why this query is valuable"
            },
            ...
          ]
          
          IMPORTANT: Make your queries specific and focused - avoid overly general queries.
        `,
        expectedOutput: 'A JSON array of search queries, with explanations for why each query is valuable',
        agent: this.searchAgent.getAgent()
      });

      const performSearchTask = new Task({
        title: 'Perform search',
        description: `
          Use the "search" tool to execute the queries from the previous task: {taskResult:task1}
          
          For each query:
          1. Execute the search by calling the search tool with ONLY ONE of these formats:
             - Simple string format: search("your query here")
             - JavaScript object format: search({"query": "your query here", "maxResults": 5})
             
          FORMAT INSTRUCTIONS (EXTREMELY IMPORTANT):
          
          When using the object format, you MUST pass a proper JavaScript object, NOT a string representation:
          
          - CORRECT ✅: search({"query": "climate change", "maxResults": 5})
          - INCORRECT ❌: search("{\"query\": \"climate change\", \"maxResults\": 5}")
          - INCORRECT ❌: search([object Object])
          
          If you encounter errors with the object format, switch to the simpler string format:
          search("your query here")
          
          For each search query:
          1. Execute the search
          2. Log the results you receive in detail to help with debugging
          3. Evaluate the results for relevance and quality
          4. Identify the most promising sources
          
          IMPORTANT LIMITATIONS: 
          - Use ONLY the "search" tool - do not attempt to use any other tools
          - Do not try to search for images or use specialized search APIs
          - If you get an error with one format, try the alternative format
          
          Format your final response as a JSON object containing the search results for each query:
          {
            "query1": [
              {
                "url": "https://example.com",
                "title": "Result title",
                "description": "Brief description",
                "relevance": "High/Medium/Low",
                "notes": "Any additional observations"
              },
              ...
            ],
            "query2": [
              ...
            ]
          }
        `,
        expectedOutput: 'A structured JSON object with search results for each query',
        agent: this.searchAgent.getAgent()
      });

      const analyzeContentTask = new Task({
        title: 'Analyze content',
        description: `
          Analyze the content from the search results: {taskResult:task2}
          
          For each URL that seems high quality and relevant:
          
          1. Extract key information using the screenshot_analyzer tool
             Example: screenshot_analyzer({"screenshotId": "SCREENSHOT_ID", "analysisType": "full"})
             
             IMPORTANT FORMAT NOTES:
             - Replace SCREENSHOT_ID with the actual ID from the URL
             - The screenshotId would typically be derived from the URL (you may need to extract domain or path)
             - Always include the "analysisType" parameter
          
          2. Evaluate source credibility using the credibility_evaluator tool
             Example: credibility_evaluator({"url": "https://example.com", "content": "Content text here..."})
             
             IMPORTANT FORMAT NOTES:
             - You must include both the "url" and "content" parameters
             - For content, use the text extracted by the screenshot_analyzer
          
          3. For each source, provide:
             - A detailed summary of the content (what you see in the screenshot)
             - Assessment of credibility and quality
             - Key facts or insights extracted
             - Any limitations or biases identified
          
          4. After analyzing each source, create a synthesis that:
             - Compares information across sources
             - Identifies consensus views and disagreements
             - Highlights the most reliable information
          
          IMPORTANT DEBUGGING INSTRUCTIONS:
          - Always describe what you see in each screenshot in detail
          - Log any issues or unexpected results with the tools
          - If a tool fails, try a slightly different approach
          - Only use the tools explicitly provided to you (screenshot_analyzer and credibility_evaluator)
          
          Format your response as a structured analysis with sections for each source and a final synthesis.
        `,
        expectedOutput: 'A comprehensive analysis of web content from search results',
        agent: this.contentAgent.getAgent()
      });

      // Create the team
      this.team = new Team({
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

      logger.info('ResearchTeam initialized successfully');
    } catch (error) {
      logger.error(`Failed to initialize ResearchTeam: ${error}`);
      throw error;
    }
  }

  /**
   * Start the research process
   */
  public async start(inputs: {
    topic: string;
    [key: string]: any;
  }): Promise<any> {
    try {
      logger.info(`Starting research on topic: "${inputs.topic}"`);
      const output = await this.team.start(inputs);
      return output;
    } catch (error) {
      logger.error(`Research process encountered an error: ${error}`);
      throw error;
    }
  }

  /**
   * Get the KaibanJS team instance
   */
  public getTeam(): Team {
    return this.team;
  }
}