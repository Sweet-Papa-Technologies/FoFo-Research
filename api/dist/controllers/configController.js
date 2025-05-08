"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateSystemConfig = exports.getSystemConfig = exports.getAvailableModels = void 0;
const path_1 = __importDefault(require("path"));
const logger_1 = require("../utils/logger");
// Default config path
const CONFIG_PATH = path_1.default.join(__dirname, '../config/default.yaml');
const MODELS_PATH = path_1.default.join(__dirname, '../config/models.yaml');
/**
 * Get available LLM models
 */
const getAvailableModels = async (req, res, next) => {
    try {
        // In a real implementation, we would read from the models.yaml file
        // For now, return mock data
        const providers = [
            {
                id: 'anthropic',
                name: 'Anthropic',
                models: [
                    {
                        id: 'claude-3.7-sonnet',
                        provider: 'anthropic',
                        name: 'Claude 3.7 Sonnet',
                        capabilities: ['text', 'vision'],
                        defaultParameters: {
                            temperature: 0.3,
                            topP: 0.95,
                            maxTokens: 4000
                        }
                    }
                ]
            },
            {
                id: 'openai',
                name: 'OpenAI',
                models: [
                    {
                        id: 'gpt-4o',
                        provider: 'openai',
                        name: 'GPT-4o',
                        capabilities: ['text', 'vision'],
                        defaultParameters: {
                            temperature: 0.2,
                            maxTokens: 1000
                        }
                    }
                ]
            },
            {
                id: 'local',
                name: 'Local Models',
                models: [
                    {
                        id: 'gemma3-27b',
                        provider: 'local',
                        name: 'Gemma3 27b',
                        capabilities: ['text'],
                        defaultParameters: {
                            temperature: 0.5,
                            topP: 0.9,
                            maxTokens: 2000
                        }
                    },
                    {
                        id: 'phi-4-reasoning',
                        provider: 'local',
                        name: 'Phi-4 Reasoning',
                        capabilities: ['text'],
                        defaultParameters: {
                            temperature: 0.4,
                            topP: 0.9,
                            maxTokens: 2000
                        }
                    }
                ]
            }
        ];
        res.status(200).json({
            status: 'success',
            data: {
                providers
            }
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getAvailableModels = getAvailableModels;
/**
 * Get current system configuration
 */
const getSystemConfig = async (req, res, next) => {
    try {
        // In a real implementation, we would read from the config file
        // For now, return mock data
        const config = {
            research: {
                maxIterations: 5,
                maxParallelSearches: 10,
                followLinks: true,
                maxLinksPerPage: 3,
                informationGainThreshold: 0.2
            },
            models: {
                primary: {
                    provider: 'anthropic',
                    model: 'claude-3.7-sonnet',
                    temperature: 0.3,
                    topP: 0.95,
                    maxTokens: 4000
                },
                fallback: {
                    provider: 'local',
                    model: 'gemma3-27b',
                    temperature: 0.5,
                    topP: 0.9,
                    maxTokens: 2000
                },
                vision: {
                    provider: 'openai',
                    model: 'gpt-4o',
                    temperature: 0.2,
                    maxTokens: 1000
                }
            },
            search: {
                engine: 'duckduckgo',
                resultsPerQuery: 8,
                domainFilters: {
                    include: ['.edu', '.gov', '.org'],
                    exclude: ['pinterest.com', 'quora.com']
                }
            },
            reporting: {
                format: 'markdown',
                includeSources: true,
                summarizeSources: true,
                maxReportLength: 5000
            },
            system: {
                maxConcurrentJobs: 5,
                storageDirectory: './data',
                loggingLevel: 'info'
            }
        };
        res.status(200).json({
            status: 'success',
            data: {
                config
            }
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getSystemConfig = getSystemConfig;
/**
 * Update system configuration
 */
const updateSystemConfig = async (req, res, next) => {
    try {
        const updatedConfig = req.body;
        // In a real implementation, we would validate and save the config
        logger_1.logger.info('System configuration updated');
        res.status(200).json({
            status: 'success',
            data: {
                message: 'Configuration updated successfully',
                config: updatedConfig
            }
        });
    }
    catch (error) {
        next(error);
    }
};
exports.updateSystemConfig = updateSystemConfig;
