import { Agent } from 'kaibanjs';
import { ScreenshotAnalyzerTool } from '../tools/ScreenshotAnalyzerTool';
import { CredibilityEvaluatorTool } from '../tools/CredibilityEvaluatorTool';
import { logger } from '../../utils/logger';
import { llmConfig } from './llmConfig';

/**
 * ContentAgent is responsible for:
 * 1. Processing screenshots
 * 2. Extracting information from visual content
 * 3. Evaluating source credibility
 */
export class ContentAgent {
  private agent: Agent;
  private screenshotAnalyzerTool: ScreenshotAnalyzerTool;
  private credibilityEvaluatorTool: CredibilityEvaluatorTool;

  constructor(config?: { 
    model?: string;
    provider?: string;
  }) {
    try {
      // Initialize tools
      this.screenshotAnalyzerTool = new ScreenshotAnalyzerTool();
      this.credibilityEvaluatorTool = new CredibilityEvaluatorTool();

      // Create a custom llmConfig with the provided model parameters if available
      const agentLlmConfig = {
        provider: config?.provider || llmConfig.provider,
        model: config?.model || llmConfig.model,
        apiKey: llmConfig.apiKey,
        apiBaseUrl: llmConfig.apiBaseUrl
      };
      
      logger.info(`ContentAgent initializing with model: ${agentLlmConfig.model}, provider: ${agentLlmConfig.provider}`);
      
      // Initialize the agent with the tools and custom llmConfig
      // Pass the tool instances directly to the agent with type casting
      // Create the system instructions
      const systemInstructions = `You are a content analysis specialist with access to two specific tools:
          
          1. "screenshot_analyzer" - Use this to analyze screenshot content
             Usage example: screenshot_analyzer({"screenshotId": "id-here", "analysisType": "full"})
             
             This tool will analyze visual content from web pages and extract text, structure, and meaning.
             It returns detailed information about what appears in the screenshot including:
             - Main title/heading
             - Key text content
             - Important visual elements
             - Overall layout and structure
             
          2. "credibility_evaluator" - Use this to evaluate source credibility
             Usage example: credibility_evaluator({"url": "url-here", "content": "content-text-here"})
             
             This tool evaluates the credibility of a source based on:
             - Domain reputation
             - Content quality indicators
             - Author credentials (if available)
             - Citation patterns
             - Bias detection
             
          IMPORTANT INSTRUCTIONS FOR USING THESE TOOLS:
          
          1. Always use the proper JSON format for tool parameters:
             - CORRECT: screenshot_analyzer({"screenshotId": "id-here", "analysisType": "full"})
             - INCORRECT: screenshot_analyzer("id-here")
             
          2. Always include all required parameters for each tool:
             - For screenshot_analyzer: screenshotId and analysisType
             - For credibility_evaluator: url and content
             
          3. Process and analyze the results returned by these tools. The tools return detailed 
             JSON data that you should parse and summarize.
          
          4. Do NOT attempt to use any other tools that don't exist in your toolkit.
          
          5. Always log what you're seeing in the content for debugging purposes - describe
             the screenshot content in detail and what insights you're extracting.
          
          Example workflow:
          1. Analyze a screenshot: screenshot_analyzer({"screenshotId": "screenshot-123", "analysisType": "full"})
          2. Evaluate the source: credibility_evaluator({"url": "example.com/article", "content": "Content from page..."})
          3. Synthesize the information into key insights
          
          Remember to describe what you see in the content in detail to help with debugging.`;
          
      // Initialize the agent with the tools and custom llmConfig
      this.agent = new Agent({
        name: 'Visioneer',
        role: 'Content Analyst',
        goal: 'Extract and analyze information from web content screenshots, evaluate credibility, and identify key insights',
        background: 'Expert in visual content analysis, information extraction, and source evaluation' + systemInstructions,
        tools: [
          this.screenshotAnalyzerTool,
          this.credibilityEvaluatorTool
        ] as any, // Type cast as any to avoid TypeScript errors
        llmConfig: {
          ...agentLlmConfig
        }
      });

      logger.info('ContentAgent initialized successfully');
    } catch (error) {
      logger.error(`Failed to initialize ContentAgent: ${error}`);
      throw error;
    }
  }

  /**
   * Get the KaibanJS agent instance
   */
  public getAgent(): Agent {
    return this.agent;
  }
}