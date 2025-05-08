"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_MODEL_SETTINGS = exports.DEFAULT_SEARCH_SETTINGS = exports.DEFAULT_JOB_CONFIG = exports.JobStatus = void 0;
var JobStatus;
(function (JobStatus) {
    JobStatus["PENDING"] = "pending";
    JobStatus["RUNNING"] = "running";
    JobStatus["COMPLETED"] = "completed";
    JobStatus["FAILED"] = "failed";
    JobStatus["PAUSED"] = "paused";
})(JobStatus || (exports.JobStatus = JobStatus = {}));
exports.DEFAULT_JOB_CONFIG = {
    maxIterations: 5,
    maxParallelSearches: 10,
    followLinks: true,
    maxLinksPerPage: 3,
    informationGainThreshold: 0.2
};
exports.DEFAULT_SEARCH_SETTINGS = {
    engine: 'duckduckgo',
    resultsPerQuery: 8,
    domainFilters: {
        include: ['.edu', '.gov', '.org'],
        exclude: ['pinterest.com', 'quora.com']
    }
};
exports.DEFAULT_MODEL_SETTINGS = {
    provider: 'openai',
    model: 'gemma-3-27b-it-abliterated',
    temperature: 0.3,
    topP: 0.95,
    maxTokens: 12000
};
