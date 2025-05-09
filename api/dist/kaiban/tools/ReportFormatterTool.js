"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportFormatterTool = void 0;
const tools_1 = require("@langchain/core/tools");
const logger_1 = require("../../utils/logger");
/**
 * Custom tool for formatting research reports
 * Converts research findings into structured reports with various template options
 */
class ReportFormatterTool extends tools_1.DynamicTool {
    constructor() {
        super({
            name: "report_formatter",
            description: "Formats research findings into structured reports with template options. Input should be a JSON string with title, sections (array), optional sources (array), and optional formatOptions object.",
            func: async (input) => {
                try {
                    // Handle undefined or empty input
                    if (!input || input === "undefined") {
                        logger_1.logger.error("ReportFormatterTool received undefined or empty input");
                        return JSON.stringify({
                            error: "Invalid input",
                            message: "Input must be a valid JSON string containing title and sections"
                        });
                    }
                    const parsedInput = JSON.parse(input);
                    const { title, sections, sources = [], formatOptions = {} } = parsedInput;
                    // Validate required fields
                    if (!title) {
                        return JSON.stringify({
                            error: "Missing title",
                            message: "Report title is required"
                        });
                    }
                    if (!sections || !Array.isArray(sections) || sections.length === 0) {
                        return JSON.stringify({
                            error: "Invalid sections",
                            message: "Sections must be a non-empty array"
                        });
                    }
                    // Set default format options
                    const options = {
                        template: formatOptions.template || "detailed",
                        includeTableOfContents: formatOptions.includeTableOfContents ?? true,
                        includeCoverPage: formatOptions.includeCoverPage ?? true,
                        includeExecutiveSummary: formatOptions.includeExecutiveSummary ?? true,
                        format: formatOptions.format || "markdown"
                    };
                    // Format the report based on the selected template and options
                    const tool = this;
                    let formattedReport;
                    switch (options.format) {
                        case "html":
                            formattedReport = tool.formatAsHTML(title, sections, sources, options);
                            break;
                        case "json":
                            formattedReport = tool.formatAsJSON(title, sections, sources, options);
                            break;
                        case "markdown":
                        default:
                            formattedReport = tool.formatAsMarkdown(title, sections, sources, options);
                            break;
                    }
                    return formattedReport;
                }
                catch (error) {
                    logger_1.logger.error("Error in ReportFormatterTool:", error);
                    return JSON.stringify({
                        error: "Failed to format report",
                        message: error instanceof Error ? error.message : "Unknown error",
                    });
                }
            }
        });
    }
    formatAsMarkdown(title, sections, sources, options) {
        let markdown = "";
        // Cover Page
        if (options.includeCoverPage) {
            markdown += `# ${title}\n\n`;
            markdown += `*Generated on ${new Date().toLocaleDateString()}*\n\n`;
            markdown += "---\n\n";
        }
        // Executive Summary
        if (options.includeExecutiveSummary) {
            markdown += "## Executive Summary\n\n";
            // Extract key points from each section for the summary
            const summaryPoints = sections.map(section => {
                // Take the first sentence or first 150 characters, whichever is shorter
                const firstSentence = section.content.split('. ')[0] + '.';
                const summary = firstSentence.length <= 150 ?
                    firstSentence :
                    section.content.substring(0, 147) + '...';
                return `- **${section.heading}**: ${summary}`;
            });
            markdown += summaryPoints.join('\n\n') + '\n\n';
            markdown += "---\n\n";
        }
        // Table of Contents
        if (options.includeTableOfContents) {
            markdown += "## Table of Contents\n\n";
            sections.forEach((section, index) => {
                markdown += `${index + 1}. [${section.heading}](#${this.slugify(section.heading)})\n`;
                if (section.subsections && section.subsections.length > 0) {
                    section.subsections.forEach((subsection, subIndex) => {
                        if (subsection.heading) {
                            markdown += `   ${index + 1}.${subIndex + 1}. [${subsection.heading}](#${this.slugify(subsection.heading)})\n`;
                        }
                    });
                }
            });
            markdown += "\n---\n\n";
        }
        // Sections
        sections.forEach(section => {
            markdown += `## ${section.heading}\n\n`;
            markdown += `${section.content}\n\n`;
            if (section.subsections && section.subsections.length > 0) {
                section.subsections.forEach(subsection => {
                    if (subsection.heading) {
                        markdown += `### ${subsection.heading}\n\n`;
                    }
                    markdown += `${subsection.content}\n\n`;
                });
            }
        });
        // Sources/References
        if (sources.length > 0) {
            markdown += "## Sources\n\n";
            sources.forEach((source, index) => {
                let sourceText = `${index + 1}. `;
                if (source.title) {
                    sourceText += `"${source.title}" `;
                }
                sourceText += `[${source.url}](${source.url})`;
                if (source.author) {
                    sourceText += ` by ${source.author}`;
                }
                if (source.publishDate) {
                    sourceText += `, ${source.publishDate}`;
                }
                if (source.credibilityScore) {
                    const credRating = this.getCredibilityRating(source.credibilityScore);
                    sourceText += ` (Credibility: ${credRating})`;
                }
                markdown += sourceText + '\n\n';
            });
        }
        return markdown;
    }
    formatAsHTML(title, sections, sources, options) {
        // Create HTML template with CSS styling based on the selected template
        let styleClass = options.template;
        let html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
        }
        .academic {
            font-family: "Times New Roman", Times, serif;
        }
        .business {
            font-family: Arial, sans-serif;
        }
        .summary {
            font-family: Verdana, sans-serif;
        }
        .detailed {
            font-family: Georgia, serif;
        }
        .web {
            font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
        }
        h1, h2, h3 {
            color: #2c3e50;
        }
        h1 {
            text-align: center;
            margin-bottom: 30px;
        }
        h2 {
            border-bottom: 1px solid #ddd;
            padding-bottom: 10px;
            margin-top: 30px;
        }
        .cover-page {
            text-align: center;
            margin-bottom: 40px;
        }
        .cover-page h1 {
            font-size: 28px;
            margin-bottom: 10px;
        }
        .executive-summary {
            background-color: #f8f9fa;
            padding: 15px;
            border-radius: 5px;
            margin-bottom: 30px;
        }
        .toc {
            background-color: #f8f9fa;
            padding: 15px;
            border-radius: 5px;
            margin-bottom: 30px;
        }
        .toc ul {
            list-style-type: none;
        }
        .toc ul ul {
            margin-left: 20px;
        }
        .sources {
            margin-top: 40px;
            border-top: 1px solid #ddd;
            padding-top: 20px;
        }
        .sources ol {
            padding-left: 20px;
        }
        .credibility-high {
            color: green;
        }
        .credibility-medium {
            color: orange;
        }
        .credibility-low {
            color: red;
        }
    </style>
</head>
<body class="${styleClass}">`;
        // Cover Page
        if (options.includeCoverPage) {
            html += `
    <div class="cover-page">
        <h1>${title}</h1>
        <p><em>Generated on ${new Date().toLocaleDateString()}</em></p>
        <hr>
    </div>`;
        }
        // Executive Summary
        if (options.includeExecutiveSummary) {
            html += `
    <div class="executive-summary">
        <h2>Executive Summary</h2>
        <ul>`;
            // Extract key points from each section for the summary
            sections.forEach(section => {
                // Take the first sentence or first 150 characters, whichever is shorter
                const firstSentence = section.content.split('. ')[0] + '.';
                const summary = firstSentence.length <= 150 ?
                    firstSentence :
                    section.content.substring(0, 147) + '...';
                html += `
            <li><strong>${section.heading}:</strong> ${summary}</li>`;
            });
            html += `
        </ul>
    </div>`;
        }
        // Table of Contents
        if (options.includeTableOfContents) {
            html += `
    <div class="toc">
        <h2>Table of Contents</h2>
        <ul>`;
            sections.forEach((section, index) => {
                html += `
            <li><a href="#section-${index + 1}">${section.heading}</a>`;
                if (section.subsections && section.subsections.length > 0) {
                    html += `
                <ul>`;
                    section.subsections.forEach((subsection, subIndex) => {
                        if (subsection.heading) {
                            html += `
                    <li><a href="#subsection-${index + 1}-${subIndex + 1}">${subsection.heading}</a></li>`;
                        }
                    });
                    html += `
                </ul>`;
                }
                html += `
            </li>`;
            });
            html += `
        </ul>
    </div>`;
        }
        // Sections
        sections.forEach((section, index) => {
            html += `
    <div class="section">
        <h2 id="section-${index + 1}">${section.heading}</h2>
        <p>${section.content.replace(/\n/g, '</p><p>')}</p>`;
            if (section.subsections && section.subsections.length > 0) {
                section.subsections.forEach((subsection, subIndex) => {
                    html += `
        <div class="subsection">`;
                    if (subsection.heading) {
                        html += `
            <h3 id="subsection-${index + 1}-${subIndex + 1}">${subsection.heading}</h3>`;
                    }
                    html += `
            <p>${subsection.content.replace(/\n/g, '</p><p>')}</p>
        </div>`;
                });
            }
            html += `
    </div>`;
        });
        // Sources/References
        if (sources.length > 0) {
            html += `
    <div class="sources">
        <h2>Sources</h2>
        <ol>`;
            sources.forEach(source => {
                html += `
            <li>`;
                if (source.title) {
                    html += `"${source.title}" `;
                }
                html += `<a href="${source.url}" target="_blank">${source.url}</a>`;
                if (source.author) {
                    html += ` by ${source.author}`;
                }
                if (source.publishDate) {
                    html += `, ${source.publishDate}`;
                }
                if (source.credibilityScore) {
                    const credRating = this.getCredibilityRating(source.credibilityScore);
                    const credClass = credRating.includes("high") ? "credibility-high" :
                        (credRating.includes("medium") ? "credibility-medium" : "credibility-low");
                    html += ` <span class="${credClass}">(Credibility: ${credRating})</span>`;
                }
                html += `</li>`;
            });
            html += `
        </ol>
    </div>`;
        }
        html += `
</body>
</html>`;
        return html;
    }
    formatAsJSON(title, sections, sources, options) {
        // Create a structured JSON representation of the report
        const report = {
            title,
            generatedAt: new Date().toISOString(),
            template: options.template,
            sections: []
        };
        // Executive Summary
        if (options.includeExecutiveSummary) {
            const summaryPoints = sections.map(section => {
                // Take the first sentence or first 150 characters, whichever is shorter
                const firstSentence = section.content.split('. ')[0] + '.';
                const summary = firstSentence.length <= 150 ?
                    firstSentence :
                    section.content.substring(0, 147) + '...';
                return {
                    heading: section.heading,
                    summary
                };
            });
            report.executiveSummary = summaryPoints;
        }
        // Table of Contents
        if (options.includeTableOfContents) {
            report.tableOfContents = sections.map((section, index) => {
                const toc = {
                    id: `section-${index + 1}`,
                    title: section.heading
                };
                if (section.subsections && section.subsections.length > 0) {
                    toc.subsections = section.subsections
                        .filter(subsection => subsection.heading)
                        .map((subsection, subIndex) => ({
                        id: `subsection-${index + 1}-${subIndex + 1}`,
                        title: subsection.heading
                    }));
                }
                return toc;
            });
        }
        // Main content
        report.sections = sections.map((section, index) => {
            const formattedSection = {
                id: `section-${index + 1}`,
                heading: section.heading,
                content: section.content
            };
            if (section.subsections && section.subsections.length > 0) {
                formattedSection.subsections = section.subsections.map((subsection, subIndex) => ({
                    id: subsection.heading ? `subsection-${index + 1}-${subIndex + 1}` : undefined,
                    heading: subsection.heading,
                    content: subsection.content
                }));
            }
            return formattedSection;
        });
        // Sources
        if (sources.length > 0) {
            report.sources = sources.map(source => {
                const formattedSource = {
                    url: source.url
                };
                if (source.title)
                    formattedSource.title = source.title;
                if (source.author)
                    formattedSource.author = source.author;
                if (source.publishDate)
                    formattedSource.publishDate = source.publishDate;
                if (source.credibilityScore) {
                    formattedSource.credibilityScore = source.credibilityScore;
                    formattedSource.credibilityRating = this.getCredibilityRating(source.credibilityScore);
                }
                return formattedSource;
            });
        }
        return JSON.stringify(report, null, 2);
    }
    slugify(text) {
        return text
            .toLowerCase()
            .replace(/[^\w\s-]/g, '') // Remove non-word chars
            .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
            .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
    }
    getCredibilityRating(score) {
        if (score >= 80)
            return "very high";
        if (score >= 60)
            return "high";
        if (score >= 40)
            return "medium";
        if (score >= 20)
            return "low";
        return "very low";
    }
}
exports.ReportFormatterTool = ReportFormatterTool;
