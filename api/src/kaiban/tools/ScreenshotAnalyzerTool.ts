import { DynamicTool } from "@langchain/core/tools";
import { captureService } from "../../services/captureService";
import { logger } from "../../utils/logger";

/**
 * Custom tool for analyzing screenshots captured during research
 * Extracts text, metadata, and visual information from screenshots
 */
export class ScreenshotAnalyzerTool extends DynamicTool {
  constructor() {
    super({
      name: "screenshot_analyzer",
      description: "Analyzes a screenshot to extract text, metadata, and visual information. Input should be a JSON string with screenshotId and analysisType (full, text_only, metadata_only, or visual_elements).",
      func: async (input: string): Promise<string> => {
        try {
          // Handle undefined or empty input
          if (!input || input === "undefined") {
            logger.error("ScreenshotAnalyzerTool received undefined or empty input");
            return JSON.stringify({
              error: "Invalid input",
              message: "Input must be a valid JSON string containing screenshotId and analysisType"
            });
          }
  
          const parsedInput = JSON.parse(input);
          const { screenshotId, analysisType } = parsedInput;
          
          if (!screenshotId) {
            return JSON.stringify({
              error: "Missing screenshotId",
              message: "A valid screenshotId is required"
            });
          }
      
          // Retrieve the screenshot using the capture service
          const screenshotData = await captureService.getScreenshot(screenshotId);
          
          if (!screenshotData) {
            return JSON.stringify({
              error: "Screenshot not found",
              screenshotId
            });
          }

          // Process based on analysis type
          let result;
          switch (analysisType) {
            case "text_only":
              result = await captureService.extractText(screenshotId);
              break;
            case "metadata_only":
              result = await captureService.getMetadata(screenshotId);
              break;
            case "visual_elements":
              result = await captureService.analyzeVisualElements(screenshotId);
              break;
            case "full":
            default:
              // Combine all analysis types
              const [text, metadata, visualElements] = await Promise.all([
                captureService.extractText(screenshotId),
                captureService.getMetadata(screenshotId),
                captureService.analyzeVisualElements(screenshotId)
              ]);
              
              result = {
                text,
                metadata,
                visualElements,
                screenshotId,
                url: screenshotData?.metadata?.url || 'unknown'
              };
          }

          return JSON.stringify(result);
        } catch (error) {
          logger.error("Error in ScreenshotAnalyzerTool:", error);
          return JSON.stringify({
            error: "Failed to analyze screenshot",
            message: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }
    });
  }
}