import { Tool } from "@langchain/core/tools";
import { captureService } from "../../services/captureService";
import { z } from 'zod';

/**
 * Custom tool for analyzing screenshots captured during research
 * Extracts text, metadata, and visual information from screenshots
 */
export class ScreenshotAnalyzerTool extends Tool {
  static schema = z.object({
    input: z.string().describe("JSON string containing screenshotId and analysisType")
  });

  name: string;
  description: string;

  constructor() {
    super();
    this.name = "screenshot_analyzer";
    this.description = "Analyzes a screenshot to extract text, metadata, and visual information. Input should be a JSON string with screenshotId and analysisType (full, text_only, metadata_only, or visual_elements).";
  }

  async _call(input: string): Promise<string> {
    try {
      // Handle undefined or empty input
      if (!input || input === "undefined") {
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
      console.error("Error in ScreenshotAnalyzerTool:", error);
      return JSON.stringify({
        error: "Failed to analyze screenshot",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
}