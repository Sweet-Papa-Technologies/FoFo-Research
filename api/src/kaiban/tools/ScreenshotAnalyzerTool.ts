import { Tool } from "@langchain/core/tools";
import { z } from "zod";
import { captureService } from "../../services/captureService";

/**
 * Custom tool for analyzing screenshots captured during research
 * Extracts text, metadata, and visual information from screenshots
 */
export class ScreenshotAnalyzerTool extends Tool {
  constructor() {
    super({
      name: "screenshot_analyzer",
      description: "Analyzes a screenshot to extract text, metadata, and visual information",
      schema: z.object({
        screenshotId: z.string().describe("The ID of the screenshot to analyze"),
        analysisType: z.enum(["full", "text_only", "metadata_only", "visual_elements"])
          .describe("The type of analysis to perform on the screenshot")
      })
    });
  }

  async _call(input: { screenshotId: string; analysisType: "full" | "text_only" | "metadata_only" | "visual_elements" }) {
    try {
      const { screenshotId, analysisType } = input;
      
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
            url: screenshotData.url
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