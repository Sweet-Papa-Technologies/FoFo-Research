"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScreenshotAnalyzerTool = void 0;
const ToolBase_1 = require("./ToolBase");
const captureService_1 = require("../../services/captureService");
/**
 * Custom tool for analyzing screenshots captured during research
 * Extracts text, metadata, and visual information from screenshots
 */
class ScreenshotAnalyzerTool extends ToolBase_1.ToolBase {
    constructor() {
        super("screenshot_analyzer", "Analyzes a screenshot to extract text, metadata, and visual information");
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
                        url: screenshotData?.metadata?.url || 'unknown'
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
