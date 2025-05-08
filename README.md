# 🔍 FoFo-Research

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Version](https://img.shields.io/badge/version-0.1.0-green.svg)

FoFo-Research is an advanced research platform that leverages AI to help you conduct comprehensive web research, analyze content through screenshots, and generate detailed reports. Designed with screenshot-based content analysis to overcome modern web scraping challenges.

## ✨ Features

- 🧠 **AI-Powered Research** - Utilizes LLMs to conduct in-depth research on any topic
- 📸 **Screenshot Analysis** - Captures full-page screenshots of websites for content analysis
- 🤖 **Specialized Agent System** - Employs different AI agents for specialized tasks
- 📊 **Customizable Reports** - Generates comprehensive reports with customizable formats
- 🔄 **Asynchronous Processing** - Handles multiple research jobs with priority-based scheduling
- 🌐 **Cross-Platform** - Containerized with Docker for easy deployment on any system
- 🎨 **Modern UI** - Sleek Quasar-based interface with dark mode support

## 🏗️ Architecture

FoFo-Research consists of two main components:

1. **Backend API** (`/api`): NodeJS + Express + TypeScript service that handles:
   - Web search integration with DuckDuckGo
   - Headless browser automation with Puppeteer
   - Screenshot capture and analysis
   - LLM orchestration with KaibanJS
   - Job queue management
   - Report generation

2. **Frontend GUI** (`/gui`): Vue 3 + Quasar v2 + TypeScript interface that provides:
   - Research job creation and management
   - Report viewing and export
   - System configuration
   - Job monitoring

## 🚀 Getting Started

### Prerequisites

- [Docker](https://www.docker.com/get-started)
- [Docker Compose](https://docs.docker.com/compose/install/)
- [Node.js](https://nodejs.org/) v16+ (for local development)
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)
- API keys for LLM providers (OpenAI, Anthropic, etc.)

### Installation

1. **Clone the repository**

```bash
git clone https://github.com/Sweet-Papa-Technologies/FoFo-Research.git
cd FoFo-Research
```

2. **Configure environment variables**

Create a `.env` file in the root directory:

```
# API Keys
OPENAI_API_KEY=your_openai_api_key
ANTHROPIC_API_KEY=your_anthropic_api_key

# Server Configuration
API_PORT=3000
GUI_PORT=8080

# Development Options
NODE_ENV=development
```

3. **Start the application with Docker Compose**

```bash
docker compose up -d
```

This will build and start both the API and GUI containers. The application will be available at:
- Frontend: http://localhost:8080
- Backend API: http://localhost:3000

### Development Setup

For development work on the individual components:

#### API Development

```bash
cd api
npm install
npm run dev
```

#### GUI Development

```bash
cd gui
npm install
npm run dev
```

## 🧰 Usage

### Starting a Research Job

1. Navigate to the Research page
2. Enter your research topic
3. Configure research parameters:
   - Number of iterations
   - Parallel searches
   - Link following depth
   - Model selection
4. Submit your job
5. Monitor progress in real-time

### Viewing Research Reports

1. Navigate to the Reports page
2. Select a completed research job
3. Browse the generated report with sections and sources
4. Export the report in your preferred format (Markdown, HTML, PDF)

### Configuring the System

1. Navigate to the Settings page
2. Configure research parameters
3. Set up LLM model preferences
4. Adjust search engine settings
5. Customize system behavior

## ⚙️ Configuration Options

### Research Parameters

- **Max Iterations**: Number of search and analysis cycles (default: 5)
- **Max Parallel Searches**: Number of concurrent web page captures (default: 10)
- **Follow Links**: Enable deeper research by following links (default: true)
- **Max Links Per Page**: Number of links to follow per page (default: 3)
- **Information Gain Threshold**: Minimum information gain to continue research (default: 0.2)

### Search Settings

- **Engine**: Search engine to use (default: DuckDuckGo)
- **Results Per Query**: Number of results to process per query (default: 8)
- **Domain Filters**: Include or exclude specific domains

### Model Settings

- **Provider**: LLM provider (OpenAI, Anthropic, etc.)
- **Model**: Specific model to use
- **Temperature**: Creativity setting (0.0-1.0)
- **Top-P**: Nucleus sampling parameter
- **Max Tokens**: Maximum response length

## 🧩 Customization

### Adding Custom Tools

Create new tools for KaibanJS in `/api/src/kaiban/tools/`:

```typescript
import { Tool } from "@langchain/core/tools";
import { z } from "zod";

export class CustomTool extends Tool {
  constructor() {
    super({
      name: "custom_tool_name",
      description: "Description of what the tool does",
      schema: z.object({
        parameter1: z.string().describe("Parameter description"),
        parameter2: z.number().describe("Parameter description")
      })
    });
  }

  async _call(input: any) {
    // Implement your tool functionality here
    return JSON.stringify(result);
  }
}
```

### Creating New Agents

Add new agents in `/api/src/kaiban/agents/`:

```typescript
import { Agent } from 'kaibanjs';
import { logger } from '../../utils/logger';

export class CustomAgent {
  private agent: Agent;

  constructor(config?: { 
    model?: string;
    provider?: string;
  }) {
    this.agent = new Agent({
      name: 'AgentName',
      role: 'Agent Role',
      goal: 'Agent purpose',
      background: 'Agent expertise',
      tools: [/* tools */],
      llmConfig: {
        provider: config?.provider || 'openai',
        model: config?.model || 'gpt-4',
        maxRetries: 1
      }
    });
  }

  public getAgent(): Agent {
    return this.agent;
  }
}
```

### Adding New Report Formats

Extend the report formatting in `/api/src/kaiban/tools/ReportFormatterTool.ts`.

## 📂 Project Structure

```
FoFo-Research/
├── api/                      # Backend API
│   ├── src/
│   │   ├── app.ts            # Main Express application
│   │   ├── config/           # Configuration files
│   │   ├── controllers/      # API controllers
│   │   ├── kaiban/           # KaibanJS integration
│   │   │   ├── agents/       # Agent implementations
│   │   │   ├── teams/        # Team configurations
│   │   │   └── tools/        # Custom tools
│   │   ├── models/           # Data models
│   │   ├── routes/           # API routes
│   │   ├── services/         # Core services
│   │   └── utils/            # Utility functions
│   ├── Dockerfile            # API container definition
│   └── package.json          # API dependencies
├── gui/                      # Frontend GUI
│   ├── src/
│   │   ├── components/       # UI components
│   │   ├── layouts/          # Page layouts
│   │   ├── pages/            # Application pages
│   │   ├── stores/           # Pinia stores
│   │   └── boot/             # App initialization
│   ├── Dockerfile            # GUI container definition
│   └── package.json          # GUI dependencies
├── docs/                     # Documentation
├── docker-compose.yml        # Container orchestration
└── .env                      # Environment variables
```

## 🔌 API Endpoints

### Research Endpoints

- `POST /api/research` - Create a new research job
- `GET /api/research` - Get all research jobs
- `GET /api/research/:id` - Get a specific research job
- `PUT /api/research/:id` - Update a research job (pause/resume/cancel)
- `POST /api/research/export/:id` - Export a research report

### Report Endpoints

- `GET /api/reports/job/:jobId` - Get all reports for a job
- `GET /api/reports/:id` - Get a specific report
- `GET /api/reports/:id/download` - Download a report in a specific format

### Configuration Endpoints

- `GET /api/config` - Get system configuration
- `PUT /api/config` - Update system configuration
- `GET /api/config/models` - Get available LLM models

## 🔄 Workflow

1. **Research Initiation**
   - User submits a research topic
   - Job is added to the priority queue

2. **Query Processing**
   - SearchAgent generates search queries
   - Results are fetched from DuckDuckGo

3. **Content Capture**
   - Browser accesses each search result
   - Full-page screenshots are captured
   - Metadata is extracted

4. **Content Analysis**
   - ContentAgent analyzes screenshots
   - Information is extracted from visual content
   - Source credibility is evaluated

5. **Information Synthesis**
   - SummaryAgent combines information from multiple sources
   - Knowledge gaps are identified
   - Follow-up queries may be generated

6. **Report Generation**
   - Comprehensive report is created
   - Sources are cited with credibility ratings
   - Report is formatted according to preferences

## 📋 Requirements

- **Hardware**: 
  - Minimum: 4GB RAM, 2 CPU cores
  - Recommended: 8GB+ RAM, 4+ CPU cores
- **Software**: 
  - Docker and Docker Compose
  - Modern web browser
- **Network**: Internet connection for web research
- **Storage**: At least 5GB of free space
- **API Keys**: Valid API keys for LLM providers

## 🛠️ Troubleshooting

### Common Issues

1. **Docker Build Errors**
   - Ensure Docker is running and has sufficient resources
   - Check your .env file for correct configuration

2. **API Connection Issues**
   - Verify that the API container is running
   - Check network settings in docker-compose.yml

3. **Screenshot Capture Failures**
   - Some websites may block headless browsers
   - Try increasing retry attempts in configuration

4. **LLM Integration Issues**
   - Verify your API keys are valid
   - Check network connectivity to LLM providers

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 📞 Contact

For questions or support, please open an issue on the GitHub repository.

---

Built with ❤️ using Node.js, Vue.js, KaibanJS, and other awesome technologies.