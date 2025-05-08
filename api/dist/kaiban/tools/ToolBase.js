"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ToolBase = void 0;
/**
 * Basic mock tool implementation to get around TypeScript limitations
 * In a real implementation, we would properly extend LangChain's Tool class
 */
class ToolBase {
    constructor(name, description) {
        this.name = name;
        this.description = description;
    }
    async _call(input) {
        return JSON.stringify({ result: "Mock implementation" });
    }
}
exports.ToolBase = ToolBase;
