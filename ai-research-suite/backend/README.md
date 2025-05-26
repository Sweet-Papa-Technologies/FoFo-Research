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

### Authentication

#### Register New User
`POST /api/v1/auth/register`

**Body Parameters:**
- `email` (string, required) - User email address
- `password` (string, required) - Password (min 8 characters)
- `name` (string, optional) - User's display name

**Example:**
```bash
curl -X POST http://localhost:8080/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "securepassword123",
    "name": "John Doe"
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "user@example.com",
      "name": "John Doe",
      "role": "user"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

#### Login
`POST /api/v1/auth/login`

**Body Parameters:**
- `email` (string, required) - User email
- `password` (string, required) - User password

**Example:**
```bash
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "securepassword123"
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "user@example.com",
      "name": "John Doe",
      "role": "user"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

#### Get Current User
`GET /api/v1/auth/me`

**Headers:**
- `Authorization: Bearer <token>`

**Example:**
```bash
curl -X GET http://localhost:8080/api/v1/auth/me \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Response:**
```json
{
    "success": true,
    "data": {
        "id": "user-id",
        "email": "fterry24v2@gmail.com",
        "role": "user"
    }
}
```

### Research Operations

#### Start New Research
`POST /api/v1/research`

**Headers:**
- `Authorization: Bearer <token>`

**Body Parameters:**
- `topic` (string, required) - Research topic
- `parameters` (object, required) - Research parameters
  - `maxSources` (number) - Maximum sources to collect (default: 20)
  - `minSources` (number) - Minimum sources required (default: 5)
  - `reportLength` (string) - Report length: "short", "medium", "long", "comprehensive" (default: "medium")
  - `allowedDomains` (array) - Whitelist of domains to search
  - `blockedDomains` (array) - Blacklist of domains to exclude
  - `depth` (string) - Research depth: "surface", "standard", "comprehensive" (default: "standard")
  - `language` (string) - Language code (default: "en")
  - `dateRange` (string) - Date range for sources (e.g., "7d", "1m", "1y")

**Example:**
```bash
curl -X POST http://localhost:8080/api/v1/research \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "topic": "Impact of AI on healthcare diagnostics",
    "parameters": {
      "maxSources": 30,
      "minSources": 10,
      "reportLength": "comprehensive",
      "depth": "comprehensive",
      "language": "en",
      "dateRange": "1y",
      "allowedDomains": ["pubmed.gov", "nature.com", "sciencedirect.com"],
      "blockedDomains": ["wikipedia.org"]
    }
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "sessionId": "750e8400-e29b-41d4-a716-446655440001",
    "status": "pending",
    "createdAt": "2024-01-15T10:35:00Z"
  }
}
```

#### List Research Sessions
`GET /api/v1/research`

**Headers:**
- `Authorization: Bearer <token>`

**Query Parameters:**
- `status` (string, optional) - Filter by status: "pending", "processing", "completed", "failed", "cancelled"
- `page` (number, optional) - Page number (default: 1)
- `limit` (number, optional) - Items per page (default: 20, max: 100)

**Example:**
```bash
curl -X GET "http://localhost:8080/api/v1/research?status=completed&page=1&limit=10" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Response:**
```json
{
  "success": true,
  "data": {
    "sessions": [
      {
        "id": "750e8400-e29b-41d4-a716-446655440001",
        "topic": "Impact of AI on healthcare diagnostics",
        "status": "completed",
        "parameters": {
          "maxSources": 30,
          "reportLength": "comprehensive"
        },
        "createdAt": "2024-01-15T10:35:00Z",
        "completedAt": "2024-01-15T10:45:00Z",
        "reportId": "850e8400-e29b-41d4-a716-446655440002"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 25,
      "pages": 3
    }
  }
}
```

#### Get Research Progress
`GET /api/v1/research/:sessionId/progress`

**Headers:**
- `Authorization: Bearer <token>`

**Example:**
```bash
curl -X GET http://localhost:8080/api/v1/research/750e8400-e29b-41d4-a716-446655440001/progress \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Response:**
```json
{
  "success": true,
  "data": {
    "sessionId": "750e8400-e29b-41d4-a716-446655440001",
    "status": "processing",
    "jobState": "active",
    "progress": 65,
    "currentPhase": "analysis",
    "estimatedTimeRemaining": 120
  }
}
```

### Search

#### Perform Search
`POST /api/v1/search`

**Headers:**
- `Authorization: Bearer <token>`

**Body Parameters:**
- `query` (string, required) - Search query
- `maxResults` (number, optional) - Maximum results (default: 10, max: 50)
- `filters` (object, optional) - Search filters
  - `language` (string) - Language code (default: "en")
  - `timeRange` (string) - Time range: "day", "week", "month", "year"
  - `categories` (array) - Search categories
  - `domains` (array) - Specific domains to search

**Example:**
```bash
curl -X POST http://localhost:8080/api/v1/search \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "query": "machine learning healthcare applications",
    "maxResults": 20,
    "filters": {
      "language": "en",
      "timeRange": "month",
      "domains": ["arxiv.org", "pubmed.gov"]
    }
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "query": "machine learning healthcare applications",
    "totalResults": 20,
    "results": [
      {
        "url": "https://arxiv.org/abs/2401.12345",
        "title": "Deep Learning for Medical Image Analysis",
        "content": "This paper presents a comprehensive survey of deep learning techniques...",
        "engine": "google",
        "score": 0.95
      }
    ]
  }
}
```

#### Get Search History
`GET /api/v1/search/history`

**Headers:**
- `Authorization: Bearer <token>`

**Query Parameters:**
- `limit` (number, optional) - Number of items (default: 20)
- `offset` (number, optional) - Offset for pagination (default: 0)

**Example:**
```bash
curl -X GET "http://localhost:8080/api/v1/search/history?limit=5" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Response:**
```json
{
  "success": true,
  "data": {
    "history": [
      {
        "id": "950e8400-e29b-41d4-a716-446655440003",
        "query": "machine learning healthcare applications",
        "resultsCount": 20,
        "searchedAt": "2024-01-15T10:30:00Z"
      }
    ]
  }
}
```

### Reports

#### Get Report
`GET /api/v1/reports/:reportId`

**Headers:**
- `Authorization: Bearer <token>`

**Query Parameters:**
- `format` (string, optional) - Response format: "json", "markdown", "html", "text" (default: "json")

**Example:**
```bash
curl -X GET "http://localhost:8080/api/v1/reports/850e8400-e29b-41d4-a716-446655440002?format=json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "850e8400-e29b-41d4-a716-446655440002",
    "sessionId": "750e8400-e29b-41d4-a716-446655440001",
    "topic": "Impact of AI on healthcare diagnostics",
    "content": "# Impact of AI on Healthcare Diagnostics\n\n## Executive Summary\n...",
    "summary": "This comprehensive report analyzes the transformative impact...",
    "keyFindings": [
      "AI improves diagnostic accuracy by 23% on average",
      "Implementation challenges include data privacy and regulatory compliance"
    ],
    "wordCount": 3500,
    "createdAt": "2024-01-15T10:45:00Z"
  }
}
```

#### Download Report
`GET /api/v1/reports/:reportId/download`

**Headers:**
- `Authorization: Bearer <token>`

**Query Parameters:**
- `format` (string, optional) - Download format: "markdown", "text", "html" (default: "markdown")

**Example:**
```bash
curl -X GET "http://localhost:8080/api/v1/reports/850e8400-e29b-41d4-a716-446655440002/download?format=markdown" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -o report.md
```

**Response:** File download with appropriate MIME type

#### Get Report Sources
`GET /api/v1/reports/:reportId/sources`

**Headers:**
- `Authorization: Bearer <token>`

**Example:**
```bash
curl -X GET http://localhost:8080/api/v1/reports/850e8400-e29b-41d4-a716-446655440002/sources \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Response:**
```json
{
  "success": true,
  "data": {
    "sources": [
      {
        "id": "a50e8400-e29b-41d4-a716-446655440004",
        "url": "https://www.nature.com/articles/s41591-023-02354-z",
        "title": "AI in medical diagnostics: A systematic review",
        "summary": "This systematic review examines 127 studies on AI applications...",
        "relevanceScore": 0.92,
        "accessedAt": "2024-01-15T10:40:00Z"
      }
    ]
  }
}
```

### Settings

#### Get User Settings
`GET /api/v1/settings/user`

**Headers:**
- `Authorization: Bearer <token>`

**Example:**
```bash
curl -X GET http://localhost:8080/api/v1/settings/user \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Response:**
```json
{
  "success": true,
  "data": {
    "defaultReportLength": "medium",
    "defaultLanguage": "en",
    "defaultMaxSources": 20,
    "emailNotifications": true,
    "theme": "auto",
    "preferences": {
      "autoSave": true,
      "showTips": true
    }
  }
}
```

#### Update User Settings
`PUT /api/v1/settings/user`

**Headers:**
- `Authorization: Bearer <token>`

**Body Parameters:**
- `defaultReportLength` (string, optional) - Default report length
- `defaultLanguage` (string, optional) - Default language code
- `defaultMaxSources` (number, optional) - Default max sources
- `emailNotifications` (boolean, optional) - Email notifications enabled
- `theme` (string, optional) - UI theme: "light", "dark", "auto"
- `preferences` (object, optional) - Additional preferences

**Example:**
```bash
curl -X PUT http://localhost:8080/api/v1/settings/user \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "defaultReportLength": "comprehensive",
    "defaultMaxSources": 50,
    "theme": "dark",
    "preferences": {
      "autoSave": true,
      "showTips": false
    }
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Settings updated successfully"
  }
}
```

#### Get Available Models
`GET /api/v1/settings/models`

**Headers:**
- `Authorization: Bearer <token>`

**Example:**
```bash
curl -X GET http://localhost:8080/api/v1/settings/models \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Response:**
```json
{
  "success": true,
  "data": {
    "models": [
      {
        "id": "gpt-3.5-turbo",
        "name": "GPT 3.5 Turbo",
        "provider": "openai"
      },
      {
        "id": "gpt-4",
        "name": "GPT 4",
        "provider": "openai"
      },
      {
        "id": "claude-3-opus",
        "name": "Claude 3 Opus",
        "provider": "anthropic"
      },
      {
        "id": "llama2",
        "name": "Llama 2",
        "provider": "meta"
      }
    ],
    "defaultModel": "gpt-3.5-turbo"
  }
}
```

#### Get Search Engines
`GET /api/v1/settings/search-engines`

**Headers:**
- `Authorization: Bearer <token>`

**Example:**
```bash
curl -X GET http://localhost:8080/api/v1/settings/search-engines \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Response:**
```json
{
  "success": true,
  "data": {
    "engines": [
      {
        "id": "searxng-main",
        "name": "Main searXNG Instance",
        "endpoint": "http://localhost:8888",
        "status": "active",
        "isDefault": true
      }
    ]
  }
}
```

### Error Responses

All endpoints return consistent error responses:

**400 Bad Request:**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request parameters",
    "details": {
      "field": "email",
      "error": "Invalid email format"
    }
  }
}
```

**401 Unauthorized:**
```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required"
  }
}
```

**404 Not Found:**
```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Resource not found"
  }
}
```

**500 Internal Server Error:**
```json
{
  "success": false,
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "An unexpected error occurred"
  }
}
```

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