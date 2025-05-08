/**
 * Basic mock tool implementation to get around TypeScript limitations
 * In a real implementation, we would properly extend LangChain's Tool class
 */
export class ToolBase {
  name: string;
  description: string;

  constructor(name: string, description: string) {
    this.name = name;
    this.description = description;
  }

  async _call(input: any): Promise<string> {
    return JSON.stringify({ result: "Mock implementation" });
  }
}