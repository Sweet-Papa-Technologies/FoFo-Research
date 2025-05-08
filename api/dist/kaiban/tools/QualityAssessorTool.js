"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QualityAssessorTool = void 0;
const tools_1 = require("@langchain/core/tools");
const zod_1 = require("zod");
/**
 * Custom tool for assessing the quality and completeness of research
 * Evaluates research depth, breadth, and reliability
 */
class QualityAssessorTool extends tools_1.Tool {
    constructor() {
        super({
            name: "quality_assessor",
            description: "Assesses the quality, depth, and completeness of research",
            schema: zod_1.z.object({
                topic: zod_1.z.string().describe("The research topic being assessed"),
                sources: zod_1.z.array(zod_1.z.object({
                    url: zod_1.z.string(),
                    title: zod_1.z.string().optional(),
                    credibilityScore: zod_1.z.number().optional(),
                    sourceType: zod_1.z.string().optional()
                })).describe("Array of sources used in the research"),
                keyFindings: zod_1.z.array(zod_1.z.string()).describe("Key findings or conclusions from the research"),
                researchGoal: zod_1.z.string().optional().describe("Optional statement of the research goal or question")
            })
        });
    }
    async _call(input) {
        try {
            const { topic, sources, keyFindings, researchGoal } = input;
            // Assess source diversity
            const sourceDiversity = this.assessSourceDiversity(sources);
            // Assess source quality
            const sourceQuality = this.assessSourceQuality(sources);
            // Assess research completeness
            const completeness = this.assessCompleteness(keyFindings, topic, researchGoal);
            // Assess research depth
            const researchDepth = this.assessResearchDepth(sources, keyFindings);
            // Calculate overall quality score
            const overallScore = this.calculateOverallScore(sourceDiversity.score, sourceQuality.score, completeness.score, researchDepth.score);
            // Identify gaps or improvement opportunities
            const improvementAreas = this.identifyImprovementAreas(sourceDiversity, sourceQuality, completeness, researchDepth);
            // Prepare assessment result
            const result = {
                topic,
                overallQualityScore: overallScore,
                qualityRating: this.getQualityRating(overallScore),
                assessmentDetails: {
                    sourceDiversity,
                    sourceQuality,
                    completeness,
                    researchDepth
                },
                improvementAreas,
                sourceCount: sources.length,
                findingCount: keyFindings.length,
                assessmentTimestamp: new Date().toISOString()
            };
            return JSON.stringify(result);
        }
        catch (error) {
            console.error("Error in QualityAssessorTool:", error);
            return JSON.stringify({
                error: "Failed to assess research quality",
                message: error instanceof Error ? error.message : "Unknown error",
            });
        }
    }
    assessSourceDiversity(sources) {
        // Extract domains from URLs
        const domains = sources.map(source => {
            try {
                return new URL(source.url).hostname;
            }
            catch {
                return source.url;
            }
        });
        // Count unique domains
        const uniqueDomains = new Set(domains);
        // Calculate diversity ratio
        const diversityRatio = uniqueDomains.size / domains.length;
        // Source types diversity
        const sourceTypes = sources
            .map(source => source.sourceType || "unknown")
            .filter(type => type !== "unknown");
        const uniqueSourceTypes = new Set(sourceTypes);
        // Calculate diversity score
        let diversityScore = 0;
        // Domain diversity (0-40 points)
        if (diversityRatio >= 0.9)
            diversityScore += 40;
        else if (diversityRatio >= 0.7)
            diversityScore += 30;
        else if (diversityRatio >= 0.5)
            diversityScore += 20;
        else if (diversityRatio >= 0.3)
            diversityScore += 10;
        // Source type diversity (0-40 points)
        if (uniqueSourceTypes.size >= 5)
            diversityScore += 40;
        else if (uniqueSourceTypes.size >= 4)
            diversityScore += 30;
        else if (uniqueSourceTypes.size >= 3)
            diversityScore += 20;
        else if (uniqueSourceTypes.size >= 2)
            diversityScore += 10;
        // Source count (0-20 points)
        if (sources.length >= 10)
            diversityScore += 20;
        else if (sources.length >= 7)
            diversityScore += 15;
        else if (sources.length >= 5)
            diversityScore += 10;
        else if (sources.length >= 3)
            diversityScore += 5;
        // Normalize to 0-100
        diversityScore = Math.min(100, diversityScore);
        return {
            score: diversityScore,
            uniqueDomainCount: uniqueDomains.size,
            totalDomainCount: domains.length,
            diversityRatio,
            uniqueSourceTypeCount: uniqueSourceTypes.size,
            sourceCount: sources.length
        };
    }
    assessSourceQuality(sources) {
        // Filter sources with credibility scores
        const sourcesWithScores = sources.filter(source => typeof source.credibilityScore === 'number');
        if (sourcesWithScores.length === 0) {
            return {
                score: 50, // Neutral score when no credibility data
                averageCredibility: null,
                highQualitySourceCount: 0,
                lowQualitySourceCount: 0,
                sourcesWithCredibilityData: 0,
                totalSources: sources.length
            };
        }
        // Calculate average credibility
        const totalCredibility = sourcesWithScores.reduce((sum, source) => sum + (source.credibilityScore || 0), 0);
        const averageCredibility = totalCredibility / sourcesWithScores.length;
        // Count high and low quality sources
        const highQualitySourceCount = sourcesWithScores.filter(source => (source.credibilityScore || 0) >= 70).length;
        const lowQualitySourceCount = sourcesWithScores.filter(source => (source.credibilityScore || 0) < 40).length;
        // Calculate quality score
        let qualityScore = 0;
        // Average credibility (0-50 points)
        if (averageCredibility >= 80)
            qualityScore += 50;
        else if (averageCredibility >= 70)
            qualityScore += 40;
        else if (averageCredibility >= 60)
            qualityScore += 30;
        else if (averageCredibility >= 50)
            qualityScore += 20;
        else if (averageCredibility >= 40)
            qualityScore += 10;
        // High-quality sources (0-30 points)
        const highQualityRatio = highQualitySourceCount / sources.length;
        if (highQualityRatio >= 0.7)
            qualityScore += 30;
        else if (highQualityRatio >= 0.5)
            qualityScore += 20;
        else if (highQualityRatio >= 0.3)
            qualityScore += 10;
        // Penalty for low-quality sources (-20 to 0 points)
        const lowQualityRatio = lowQualitySourceCount / sources.length;
        if (lowQualityRatio >= 0.5)
            qualityScore -= 20;
        else if (lowQualityRatio >= 0.3)
            qualityScore -= 15;
        else if (lowQualityRatio >= 0.2)
            qualityScore -= 10;
        else if (lowQualityRatio >= 0.1)
            qualityScore -= 5;
        // Coverage of sources with credibility data (0-20 points)
        const credibilityCoverage = sourcesWithScores.length / sources.length;
        if (credibilityCoverage >= 0.9)
            qualityScore += 20;
        else if (credibilityCoverage >= 0.7)
            qualityScore += 15;
        else if (credibilityCoverage >= 0.5)
            qualityScore += 10;
        else if (credibilityCoverage >= 0.3)
            qualityScore += 5;
        // Normalize to 0-100
        qualityScore = Math.max(0, Math.min(100, qualityScore));
        return {
            score: qualityScore,
            averageCredibility,
            highQualitySourceCount,
            lowQualitySourceCount,
            sourcesWithCredibilityData: sourcesWithScores.length,
            totalSources: sources.length
        };
    }
    assessCompleteness(keyFindings, topic, researchGoal) {
        // Completeness is difficult to assess programmatically without domain-specific knowledge
        // This is a simplified implementation
        // Finding count scoring
        let completenessScore = 0;
        // Number of findings (0-50 points)
        if (keyFindings.length >= 10)
            completenessScore += 50;
        else if (keyFindings.length >= 8)
            completenessScore += 40;
        else if (keyFindings.length >= 6)
            completenessScore += 30;
        else if (keyFindings.length >= 4)
            completenessScore += 20;
        else if (keyFindings.length >= 2)
            completenessScore += 10;
        // Finding specificity (approximated by average finding length) (0-25 points)
        const avgFindingLength = keyFindings.reduce((sum, finding) => sum + finding.length, 0) / keyFindings.length;
        if (avgFindingLength >= 150)
            completenessScore += 25;
        else if (avgFindingLength >= 100)
            completenessScore += 20;
        else if (avgFindingLength >= 75)
            completenessScore += 15;
        else if (avgFindingLength >= 50)
            completenessScore += 10;
        else if (avgFindingLength >= 25)
            completenessScore += 5;
        // Research goal alignment (0-25 points)
        // This is just a placeholder - in a real implementation, this would use NLP to assess alignment
        if (researchGoal) {
            completenessScore += 25; // Simplified: award points for having a research goal
        }
        // Normalize to 0-100
        completenessScore = Math.min(100, completenessScore);
        return {
            score: completenessScore,
            findingCount: keyFindings.length,
            averageFindingLength: avgFindingLength,
            hasResearchGoal: !!researchGoal
        };
    }
    assessResearchDepth(sources, keyFindings) {
        // Research depth is difficult to assess programmatically
        // This is a simplified implementation
        // Basic depth scoring
        let depthScore = 0;
        // Source depth - more sources typically indicate deeper research (0-50 points)
        if (sources.length >= 12)
            depthScore += 50;
        else if (sources.length >= 10)
            depthScore += 40;
        else if (sources.length >= 8)
            depthScore += 30;
        else if (sources.length >= 6)
            depthScore += 20;
        else if (sources.length >= 4)
            depthScore += 10;
        // Finding depth - ratio of findings to sources (0-50 points)
        const findingToSourceRatio = keyFindings.length / sources.length;
        if (findingToSourceRatio >= 2.0)
            depthScore += 50;
        else if (findingToSourceRatio >= 1.5)
            depthScore += 40;
        else if (findingToSourceRatio >= 1.0)
            depthScore += 30;
        else if (findingToSourceRatio >= 0.7)
            depthScore += 20;
        else if (findingToSourceRatio >= 0.5)
            depthScore += 10;
        // Normalize to 0-100
        depthScore = Math.min(100, depthScore);
        return {
            score: depthScore,
            sourceCount: sources.length,
            findingCount: keyFindings.length,
            findingToSourceRatio
        };
    }
    calculateOverallScore(...scores) {
        // Average the component scores
        const validScores = scores.filter(score => !isNaN(score));
        if (validScores.length === 0)
            return 50; // Default to neutral
        const sum = validScores.reduce((total, score) => total + score, 0);
        return Math.round(sum / validScores.length);
    }
    getQualityRating(score) {
        if (score >= 90)
            return "excellent";
        if (score >= 80)
            return "very good";
        if (score >= 70)
            return "good";
        if (score >= 60)
            return "above average";
        if (score >= 50)
            return "average";
        if (score >= 40)
            return "below average";
        if (score >= 30)
            return "poor";
        return "very poor";
    }
    identifyImprovementAreas(sourceDiversity, sourceQuality, completeness, researchDepth) {
        const improvementAreas = [];
        // Identify weak areas
        if (sourceDiversity.score < 60) {
            improvementAreas.push({
                area: "Source Diversity",
                recommendation: "Include sources from a wider variety of domains and source types."
            });
        }
        if (sourceQuality.score < 60) {
            improvementAreas.push({
                area: "Source Quality",
                recommendation: "Incorporate more high-credibility sources and reduce reliance on lower-quality sources."
            });
        }
        if (completeness.score < 60) {
            improvementAreas.push({
                area: "Research Completeness",
                recommendation: "Expand key findings and ensure all aspects of the research goal are addressed."
            });
        }
        if (researchDepth.score < 60) {
            improvementAreas.push({
                area: "Research Depth",
                recommendation: "Deepen analysis by exploring more sources and extracting more insights per source."
            });
        }
        return improvementAreas;
    }
}
exports.QualityAssessorTool = QualityAssessorTool;
