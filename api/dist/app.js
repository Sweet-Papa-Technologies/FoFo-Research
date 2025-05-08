"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const dotenv_1 = __importDefault(require("dotenv"));
const logger_1 = require("./utils/logger");
const researchRoutes_1 = __importDefault(require("./routes/researchRoutes"));
const configRoutes_1 = __importDefault(require("./routes/configRoutes"));
const reportRoutes_1 = __importDefault(require("./routes/reportRoutes"));
// Load environment variables
dotenv_1.default.config();
// Initialize Express app
const app = (0, express_1.default)();
const port = parseInt(process.env.PORT || '3000', 10);
// Apply middleware
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use((0, morgan_1.default)('combined', { stream: { write: message => logger_1.logger.info(message.trim()) } }));
// Define routes
app.use('/api/research', researchRoutes_1.default);
app.use('/api/config', configRoutes_1.default);
app.use('/api/reports', reportRoutes_1.default);
// Basic health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});
// Error handling middleware
app.use((err, req, res, next) => {
    logger_1.logger.error(`Error: ${err.message}`);
    res.status(500).json({ error: 'Internal Server Error', message: err.message });
});
// Start the server
app.listen(port, () => {
    logger_1.logger.info(`Server running on port ${port}`);
});
exports.default = app;
