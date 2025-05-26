# AI-Powered Research Suite

An open-source, self-hosted AI research platform that enables comprehensive research with complete privacy and control.

## Features

- 🔍 **AI-Powered Research**: Automated research using multiple AI models through LiteLLM
- 🌐 **Private Search**: Integration with searXNG for anonymous web searching
- 📊 **Comprehensive Reports**: Generate detailed research reports with citations
- 🔌 **Plugin System**: Support for MCP, LibreChat, CrewAI, and other platforms
- 🐳 **Easy Deployment**: Full Docker containerization for simple setup
- 🔒 **Privacy-First**: All data stays on your infrastructure
- 🎯 **Customizable**: Configure AI models, search engines, and report formats

## Architecture

- **Frontend**: Quasar Framework (Vue 3) with TypeScript
- **Backend**: Node.js with Express and TypeScript
- **Orchestration**: KaibanJS for AI workflow management
- **Database**: PostgreSQL with Redis caching
- **Search**: searXNG integration
- **AI Models**: LiteLLM for multi-provider support

## Quick Start

### Prerequisites

- Docker and Docker Compose
- Node.js 18+ (for development)
- Git

### Installation

1. Clone the repository:
```bash
git clone https://github.com/your-org/ai-research-suite.git
cd ai-research-suite
```

2. Copy environment configuration:
```bash
cp .env.example .env
```

3. Edit `.env` with your configuration (API keys, passwords, etc.)

4. Start the services:
```bash
docker-compose up -d
```

5. Access the application:
- Web UI: http://localhost
- API: http://localhost/api
- searXNG: http://localhost:8888

## Development Setup

### Backend Development

```bash
cd backend
npm install
npm run dev
```

### Frontend Development

```bash
cd frontend/app
npm install
npm run dev
```

## Project Structure

```
ai-research-suite/
├── backend/              # Node.js API server
│   ├── src/
│   │   ├── controllers/  # Request handlers
│   │   ├── services/     # Business logic
│   │   ├── models/       # Data models
│   │   ├── routes/       # API routes
│   │   └── utils/        # Utilities
│   └── Dockerfile
├── frontend/             # Quasar web application
│   ├── app/             # Quasar app source
│   └── Dockerfile
├── docker/              # Docker configurations
│   ├── nginx/           # Reverse proxy config
│   ├── postgres/        # Database initialization
│   └── searxng/         # Search engine config
├── docker-compose.yml   # Service orchestration
└── docs/               # Documentation

```

## Configuration

### Environment Variables

Key configuration options in `.env`:

- `LITELLM_API_KEY`: Your LiteLLM API key for AI models
- `JWT_SECRET`: Secret key for authentication (generate a secure one)
- `SEARX_ENDPOINT`: searXNG instance URL
- `DB_PASSWORD`: PostgreSQL password
- `REDIS_PASSWORD`: Redis password

### AI Models

Configure supported models in the backend configuration. The system supports any LiteLLM-compatible model including:
- OpenAI (GPT-4, GPT-3.5)
- Anthropic (Claude)
- Local models (Ollama, etc.)

## API Documentation

### Core Endpoints

- `POST /api/v1/research` - Start a new research session
- `GET /api/v1/research/{id}` - Get research status
- `GET /api/v1/reports/{id}` - Retrieve generated report
- `POST /api/v1/search` - Perform standalone search

### WebSocket Events

Connect to `/ws` for real-time updates:
- `progress_update` - Research progress updates
- `source_found` - New source discovered
- `research_complete` - Research finished

## Plugin Development

### MCP Plugin

The system exposes MCP-compatible tools:
- `research_topic` - Conduct research on a topic
- `search_only` - Perform web search
- `get_report` - Retrieve reports

### Integration Examples

See `/docs/plugin-examples` for integration guides.

## Security

- All communication encrypted with HTTPS (configure certificates)
- JWT-based authentication
- Role-based access control
- API rate limiting
- Input validation and sanitization

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests: `npm test`
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

- Documentation: `/docs`
- Issues: GitHub Issues
- Discussions: GitHub Discussions

## Roadmap

- [ ] Multi-language support
- [ ] Advanced report templates
- [ ] Collaborative research features
- [ ] Mobile application
- [ ] Advanced analytics dashboard

---

Built with ❤️ for the open-source community