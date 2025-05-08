"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScreenshotAnalyzerTool = void 0;
const tools_1 = require("@langchain/core/tools");
const zod_1 = require("zod");
const captureService_1 = require("../../services/captureService");
/**
 * Custom tool for analyzing screenshots captured during research
 * Extracts text, metadata, and visual information from screenshots
 */
class ScreenshotAnalyzerTool extends tools_1.Tool {
    constructor() {
        super({
            name: "screenshot_analyzer",
            description: "Analyzes a screenshot to extract text, metadata, and visual information",
            schema: zod_1.z.object({
                screenshotId: zod_1.z.string().describe("The ID of the screenshot to analyze"),
                analysisType: zod_1.z.enum(["full", "text_only", "metadata_only", "visual_elements"])
                    .describe("The type of analysis to perform on the screenshot")
            })
        });
    }
    async _call(input) {
        try {
            const { screenshotId, analysisType } = input;
            // Retrieve the screenshot using the capture service
            const screenshotData = await captureService_1.captureService.getScreenshot(screenshotId);
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
                    result = await captureService_1.captureService.extractText(screenshotId);
                    break;
                case "metadata_only":
                    result = await captureService_1.captureService.getMetadata(screenshotId);
                    break;
                case "visual_elements":
                    result = await captureService_1.captureService.analyzeVisualElements(screenshotId);
                    break;
                case "full":
                default:
                    // Combine all analysis types
                    const [text, metadata, visualElements] = await Promise.all([
                        captureService_1.captureService.extractText(screenshotId),
                        captureService_1.captureService.getMetadata(screenshotId),
                        captureService_1.captureService.analyzeVisualElements(screenshotId)
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
        }
        catch (error) {
            console.error("Error in ScreenshotAnalyzerTool:", error);
            return JSON.stringify({
                error: "Failed to analyze screenshot",
                message: error instanceof Error ? error.message : "Unknown error",
            });
        }
    }
}
exports.ScreenshotAnalyzerTool = ScreenshotAnalyzerTool;
