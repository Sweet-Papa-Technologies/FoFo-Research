# AI Research Suite - Backend API

Backend API server for the AI-Powered Research Suite, built with Node.js, Express, and KaibanJS orchestration.

## Features

- **Research Orchestration**: Multi-agent AI research workflows powered by KaibanJS
- **Flexible LLM Support**: Works with OpenAI, Anthropic, Ollama, LMStudio, and LiteLLM Proxy
- **Real-time Updates**: WebSocket support for live research progress
- **Task Queue**: Asynchronous job processing with Bull
- **RESTful API**: Clean API design with comprehensive error handling
- **Database**: PostgreSQL for data persistence
- **Caching**: Redis for performance optimization

## Quick Start

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure environment**:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Set up database**:
   ```bash
   npm run migrate
   ```

4. **Start development server**:
   ```bash
   npm run dev
   ```

## LLM Configuration

The backend supports multiple LLM providers through a flexible configuration system:

### OpenAI (Default)
```env
# No LITELLM_BASE_URL needed (defaults to OpenAI)
LITELLM_API_KEY=sk-your-openai-api-key
LITELLM_DEFAULT_MODEL=gpt-3.5-turbo
```

### Local Ollama
```env
LITELLM_BASE_URL=http://localhost:11434
# No API key needed for local Ollama
LITELLM_DEFAULT_MODEL=llama2
```

### LMStudio
```env
LITELLM_BASE_URL=http://localhost:1234/v1
# No API key needed for LMStudio
LITELLM_DEFAULT_MODEL=local-model-name
```

### LiteLLM Proxy
```env
LITELLM_BASE_URL=http://localhost:4000
LITELLM_API_KEY=your-litellm-key  # If configured
LITELLM_DEFAULT_MODEL=gpt-3.5-turbo
```

### Supported Models

- **OpenAI**: gpt-3.5-turbo, gpt-4, gpt-4-turbo
- **Anthropic**: claude-3-opus, claude-3-sonnet
- **Ollama**: llama2, mistral, mixtral, codellama, and any locally installed models
- **LMStudio**: Any model loaded in LMStudio

## API Endpoints

### Research Operations
- `POST /api/v1/research` - Start new research
- `GET /api/v1/research` - List research sessions
- `GET /api/v1/research/:sessionId` - Get research details
- `DELETE /api/v1/research/:sessionId` - Cancel research
- `GET /api/v1/research/:sessionId/progress` - Get progress

### Search
- `POST /api/v1/search` - Perform standalone search
- `GET /api/v1/search/history` - Get search history

### Reports
- `GET /api/v1/reports/:reportId` - Get report
- `GET /api/v1/reports/:reportId/download` - Download report
- `GET /api/v1/reports/:reportId/sources` - Get report sources
- `GET /api/v1/reports/:reportId/citations` - Get citations

### Authentication
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/refresh` - Refresh token
- `POST /api/v1/auth/logout` - Logout
- `GET /api/v1/auth/me` - Get current user

### Settings
- `GET /api/v1/settings/user` - Get user settings
- `PUT /api/v1/settings/user` - Update user settings
- `GET /api/v1/settings/models` - Get available models
- `GET /api/v1/settings/search-engines` - Get search engines

## Development

### Scripts
- `npm run dev` - Start development server with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Start production server
- `npm test` - Run tests
- `npm run lint` - Run ESLint
- `npm run migrate` - Run database migrations

### Project Structure
```
backend/
├── src/
│   ├── config/          # Configuration files
│   ├── controllers/     # Request handlers
│   ├── middleware/      # Express middleware
│   ├── models/          # Data models
│   ├── orchestration/   # KaibanJS agents and tools
│   │   ├── agents/      # AI agents
│   │   └── tools/       # Agent tools
│   ├── routes/          # API routes
│   ├── services/        # Business logic
│   ├── utils/           # Utilities
│   ├── workers/         # Background job processors
│   └── server.ts        # Main server file
├── migrations/          # Database migrations
├── .env.example         # Environment variables template
└── package.json         # Dependencies and scripts
```

## Environment Variables

See `.env.example` for all available configuration options. Key variables:

- `PORT` - Server port (default: 8080)
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string
- `JWT_SECRET` - Secret for JWT tokens
- `SEARX_ENDPOINT` - searXNG instance URL
- `LITELLM_BASE_URL` - LLM API endpoint
- `LITELLM_API_KEY` - LLM API key
- `LITELLM_DEFAULT_MODEL` - Default model to use

## Docker Support

Build and run with Docker:

```bash
docker build -t ai-research-backend .
docker run -p 8080:8080 --env-file .env ai-research-backend
```

Or use with docker-compose (see main project docker-compose.yml).

## Testing

Run the test suite:

```bash
# Unit tests
npm test

# Integration tests
npm run test:integration

# Test coverage
npm run test:coverage
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

MIT License - see LICENSE file in the root directory.