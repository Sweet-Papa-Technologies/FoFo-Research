# AI Research Suite Backend API

## Overview

The AI Research Suite backend provides a comprehensive API for AI-powered research capabilities. It uses JWT authentication and supports multiple LLM providers through LiteLLM.

## Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up database:**
   ```bash
   npm run migrate
   ```

3. **Create test users:**
   ```bash
   npm run seed:test-user
   ```

4. **Start the server:**
   ```bash
   npm run dev
   ```

## Test Accounts

- Email: `test@example.com`, Password: `testpassword123`
- Email: `admin@example.com`, Password: `adminpassword123`

## API Endpoints

### Authentication

#### Register
`POST /api/v1/auth/register`

**Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword123",
  "name": "John Doe"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "user@example.com",
      "name": "John Doe"
    }
  }
}
```

#### Login
`POST /api/v1/auth/login`

**Body:**
```json
{
  "email": "test@example.com",
  "password": "testpassword123"
}
```

**CURL Example:**
```bash
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"testpassword123"}'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "209fff32-b498-4c95-be03-459b07daaaf5",
      "email": "test@example.com",
      "name": "Test User"
    }
  }
}
```

#### Refresh Token
`POST /api/v1/auth/refresh`

**Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### Logout
`POST /api/v1/auth/logout`

**Headers:**
- `Authorization: Bearer <token>`

### Research

#### Start Research
`POST /api/v1/research`

**Headers:**
- `Authorization: Bearer <token>`

**Body:**
```json
{
  "topic": "Impact of AI on healthcare diagnostics",
  "parameters": {
    "depth": "comprehensive",
    "sources": ["academic", "news", "industry"],
    "timeRange": "2020-2024"
  }
}
```

**CURL Example:**
```bash
curl -X POST http://localhost:8080/api/v1/research \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"topic":"Impact of AI on healthcare diagnostics","parameters":{"depth":"comprehensive"}}'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "sessionId": "755814b8-9d32-4542-9cf3-d7c0d9470e1b",
    "status": "pending",
    "message": "Research job created successfully"
  }
}
```

#### Get Research Session
`GET /api/v1/research/:sessionId`

**Headers:**
- `Authorization: Bearer <token>`

**CURL Example:**
```bash
curl -X GET http://localhost:8080/api/v1/research/755814b8-9d32-4542-9cf3-d7c0d9470e1b \
  -H "Authorization: Bearer <token>"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "755814b8-9d32-4542-9cf3-d7c0d9470e1b",
    "userId": "209fff32-b498-4c95-be03-459b07daaaf5",
    "topic": "Impact of AI on healthcare diagnostics",
    "status": "completed",
    "parameters": {
      "depth": "comprehensive"
    },
    "reportId": "c3c7a547-03b5-4b41-bc6d-b478b06522e0",
    "createdAt": "2024-05-26T14:37:04.000Z",
    "completedAt": "2024-05-26T14:38:20.000Z"
  }
}
```

#### List Research Sessions
`GET /api/v1/research`

**Headers:**
- `Authorization: Bearer <token>`

**Query Parameters:**
- `status` (optional): Filter by status (pending, processing, completed, failed, cancelled)
- `page` (optional): Page number (default: 1)
- `limit` (optional): Results per page (default: 20, max: 100)

**Example:**
```bash
curl -X GET "http://localhost:8080/api/v1/research?status=completed&page=1&limit=10" \
  -H "Authorization: Bearer <token>"
```

#### Get Research Progress
`GET /api/v1/research/:sessionId/progress`

**Headers:**
- `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "data": {
    "sessionId": "755814b8-9d32-4542-9cf3-d7c0d9470e1b",
    "status": "processing",
    "progress": 45,
    "currentStep": "Analyzing sources",
    "estimatedTimeRemaining": 120
  }
}
```

#### Cancel Research
`POST /api/v1/research/:sessionId/cancel`

**Headers:**
- `Authorization: Bearer <token>`

#### Retry Failed Research
`POST /api/v1/research/:sessionId/retry`

**Headers:**
- `Authorization: Bearer <token>`

### Reports

#### Get Report by ID
`GET /api/v1/reports/:reportId`

**Headers:**
- `Authorization: Bearer <token>`

**Query Parameters:**
- `format` (optional): Response format (json, markdown, html) - default: json

**Example:**
```bash
curl -X GET "http://localhost:8080/api/v1/reports/c3c7a547-03b5-4b41-bc6d-b478b06522e0?format=markdown" \
  -H "Authorization: Bearer <token>"
```

#### Get Report by Session ID
`GET /api/v1/reports/session/:sessionId`

**Headers:**
- `Authorization: Bearer <token>`

**Query Parameters:**
- `format` (optional): Response format (json, markdown, html) - default: json

**Example:**
```bash
curl -X GET "http://localhost:8080/api/v1/reports/session/755814b8-9d32-4542-9cf3-d7c0d9470e1b" \
  -H "Authorization: Bearer <token>"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "c3c7a547-03b5-4b41-bc6d-b478b06522e0",
    "sessionId": "755814b8-9d32-4542-9cf3-d7c0d9470e1b",
    "topic": "Impact of AI on healthcare diagnostics",
    "content": "# Research Report: Impact of AI on Healthcare Diagnostics\n\n## Executive Summary\n...",
    "summary": "This report examines the transformative impact of AI on healthcare diagnostics...",
    "keyFindings": [
      "AI improves diagnostic accuracy by 23% on average",
      "Implementation costs remain a barrier for smaller facilities",
      "Regulatory frameworks are evolving to accommodate AI tools"
    ],
    "wordCount": 1072,
    "createdAt": "2024-05-26T14:38:20.000Z"
  }
}
```

#### Download Report
`GET /api/v1/reports/:reportId/download`

**Headers:**
- `Authorization: Bearer <token>`

**Query Parameters:**
- `format` (optional): Download format (markdown, html, pdf, docx) - default: markdown

**Example:**
```bash
curl -X GET "http://localhost:8080/api/v1/reports/c3c7a547-03b5-4b41-bc6d-b478b06522e0/download?format=pdf" \
  -H "Authorization: Bearer <token>" \
  -o report.pdf
```

#### Get Report Sources
`GET /api/v1/reports/:reportId/sources`

**Headers:**
- `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "data": {
    "sources": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440001",
        "url": "https://example.com/article",
        "title": "AI in Medical Imaging: A Comprehensive Review",
        "summary": "This article reviews the latest advances in AI...",
        "relevanceScore": 0.92,
        "accessedAt": "2024-05-26T14:37:45.000Z"
      }
    ]
  }
}
```

#### Get Report Citations
`GET /api/v1/reports/:reportId/citations`

**Headers:**
- `Authorization: Bearer <token>`

### Search

#### Perform Search
`POST /api/v1/search`

**Headers:**
- `Authorization: Bearer <token>`

**Body:**
```json
{
  "query": "AI healthcare diagnostics",
  "engines": ["google", "duckduckgo"],
  "maxResults": 20
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "results": [
      {
        "title": "AI Transforms Healthcare Diagnostics",
        "url": "https://example.com/article",
        "snippet": "Recent advances in artificial intelligence are revolutionizing...",
        "engine": "google"
      }
    ],
    "totalResults": 20,
    "searchId": "550e8400-e29b-41d4-a716-446655440002"
  }
}
```

#### Get Search History
`GET /api/v1/search/history`

**Headers:**
- `Authorization: Bearer <token>`

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Results per page (default: 20)

### Settings

#### Get User Settings
`GET /api/v1/settings`

**Headers:**
- `Authorization: Bearer <token>`

#### Update User Settings
`PUT /api/v1/settings`

**Headers:**
- `Authorization: Bearer <token>`

**Body:**
```json
{
  "defaultModel": "gpt-4",
  "searchEngines": ["google", "duckduckgo", "bing"],
  "outputFormat": "markdown",
  "language": "en"
}
```

#### Get Available Models
`GET /api/v1/settings/models`

**Headers:**
- `Authorization: Bearer <token>`

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

## WebSocket Events

Connect to WebSocket for real-time updates:
```javascript
const ws = new WebSocket('ws://localhost:8080');

ws.on('message', (data) => {
  const event = JSON.parse(data);
  console.log('Event:', event.type, event.data);
});
```

### Event Types

- `research.started` - Research job has started processing
- `research.progress` - Progress update during research
- `research.completed` - Research completed successfully
- `research.failed` - Research failed with error
- `research.cancelled` - Research was cancelled

## Error Responses

All errors follow this format:
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": {
      "field": "email",
      "issue": "Invalid email format"
    }
  }
}
```

### Common Error Codes

- `401` - Unauthorized (invalid or missing token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `409` - Conflict (e.g., email already exists)
- `422` - Validation Error
- `429` - Rate Limit Exceeded
- `500` - Internal Server Error

## Rate Limiting

- Authentication endpoints: 5 requests per minute
- Research endpoints: 10 requests per minute
- Other endpoints: 30 requests per minute

## Environment Variables

Create a `.env` file with:

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/ai_research_suite

# JWT
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret

# LiteLLM
LITELLM_API_KEY=your-api-key
LITELLM_MODEL=gpt-3.5-turbo

# SearXNG
SEARXNG_URL=http://localhost:8888

# Server
PORT=8080
NODE_ENV=development
```

## Development

```bash
# Run in development mode
npm run dev

# Build for production
npm run build

# Run tests
npm test

# Run linter
npm run lint

# Run database migrations
npm run migrate

# Seed test data
npm run seed:test-user
```