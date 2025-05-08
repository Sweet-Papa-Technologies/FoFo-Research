# Web Research Tool - Requirements and Design Document

## 1. Executive Summary

This document outlines the requirements and design specifications for an automated web research tool that performs in-depth research on user-specified topics and generates comprehensive reports. The system uses a screenshot-based approach to analyze web content, leveraging LLMs for data interpretation and synthesis, while being containerized for easy deployment and management.

## 2. Project Overview

### 2.1 Goals and Objectives

- Create an application capable of conducting thorough research on any topic
- Generate well-structured, comprehensive reports based on gathered information
- Use screenshots rather than direct scraping to analyze web content
- Provide a user-friendly interface for research initiation and report viewing
- Support parallel processing of multiple research tasks
- Maintain flexibility through containerization and modular design

### 2.2 Key Features

- Screenshot-based web analysis to avoid scraping issues
- Multi-model LLM support (local and cloud-based)
- Parallel processing of research tasks
- Configurable research parameters
- Clean, modern UI with dark theme
- Report export functionality
- Job management with status updates
- Docker containerization for easy deployment
- Multi-language support via Quasar i18n (English and Spanish to start)

### 2.3 Use Cases

- Academic research on specific topics
- Market research for business decisions
- Technology trend analysis
- Competitive intelligence gathering
- Literature reviews and knowledge synthesis

## 3. System Architecture

### 3.1 Components Overview

1. **Web Scraper API (Backend)**
   - Research orchestration engine
   - Web content capture system
   - LLM integration framework
   - Job management system
   - Search engine adapters

2. **Web Scraper GUI (Frontend)**
   - User interface for research initiation
   - Report display and management
   - Status monitoring dashboard
   - Configuration interface

3. **Infrastructure**
   - Docker containers
   - Persistent storage volumes
   - Queue management system

### 3.2 Technology Stack

- **Backend**: NodeJS, TypeScript, ExpressJS
- **Frontend**: Vue3, Quasar v2, Vite, TypeScript, Pinia, axios, vue-i18n
- **Containerization**: Docker, Docker Compose
- **Browser Automation**: Puppeteer/Playwright for headless browsing
- **AI/ML**: KaibanJS for LLM orchestration
- **Search**: DuckDuckGo API with extensibility for other engines
- **Storage**: Docker volumes for persistent data

### 3.3 Container Strategy

- Separate containers for frontend and backend services
- Shared volume for research data persistence
- Configuration via environment variables and YAML files
- Resource limits to ensure stable performance

## 4. Functional Requirements

### 4.1 Web Scraper API

#### 4.1.1 Core Functionality
- Accept research topics and parameters via REST API
- Perform search queries based on topic
- Capture full-page screenshots of relevant web pages
- Process screenshots using vision-capable LLMs or OCR
- Extract and synthesize key information
- Generate structured reports
- Provide status updates on research progress

#### 4.1.2 Search Capabilities
- Use DuckDuckGo as primary search engine
- Extensible architecture for additional search engines
- Support for advanced search operators
- Domain filtering (academic, news, government)
- Date range filtering
- Follow relevant links for deeper research
- Process multiple websites in parallel (configurable up to 20)

#### 4.1.3 Web Content Capture
- Take screenshots of entire pages (scrolling capture)
- Process multiple websites simultaneously in different tabs
- Implement retry logic for failed page loads
- Handle various content types and layouts
- Capture metadata (URL, timestamp, title)

#### 4.1.4 Job Management
- Queue system for research tasks
- Status reporting API
- Configurable concurrency limits
- Priority queue implementation
- Pause/resume functionality
- Persistent job storage

### 4.2 Web Scraper GUI

#### 4.2.1 User Interface
- Clean, modern design with dark theme
- Topic input interface with advanced options
- Real-time progress dashboard
- Report viewing and management
- History of past research projects
- Responsive design for various devices

#### 4.2.2 Report Display
- Markdown and HTML rendering
- Collapsible sections for source summaries
- Citations and references section
- Interactive elements (where appropriate)
- Multiple export formats (PDF primary, Markdown and HTML secondary)

#### 4.2.3 Configuration Interface
- LLM selection and configuration
- Research depth parameters
- Source filtering options
- Report format customization

### 4.3 LLM Integration

#### 4.3.1 Supported Models
- **Local**: Gemma3 27b, Phi-4 reasoning, other vision-capable models
- **OpenAI**: GPT-4o (extensible to other models)
- **Anthropic**: Claude 3.7 Sonnet (extensible to other models)
- **Google**: Gemini 2.0 Flash (extensible to other models)

#### 4.3.2 Model Configuration
- YAML-based configuration
- Parameter customization (temperature, top_p, etc.)
- Model fallback chains
- Performance metrics tracking

#### 4.3.3 OCR Fallback
- Implement OCR for models without vision capabilities
- Text extraction and processing pipeline
- Layout preservation where possible

### 4.4 Research Process

#### 4.4.1 Research Workflow
1. Accept research topic
2. Generate initial search queries
3. Perform searches and collect relevant URLs
4. Capture screenshots of identified web pages
5. Extract and analyze content from screenshots
6. Follow relevant links for deeper investigation
7. Synthesize findings into a coherent narrative
8. Generate structured report
9. Store report and associated metadata

#### 4.4.2 Research Depth Control
- Configurable iteration count (default: 3-5)
- "Information gain" metric for automatic termination
- Topic-specific templates for different research domains
- Source credibility scoring

## 5. Technical Requirements

### 5.1 Performance Specifications

- Support for up to 20 parallel web searches
- Response time targets:
  - Job submission: < 2 seconds
  - Status updates: < 1 second
  - Initial results: < 5 minutes for simple topics
- Resource utilization limits to prevent system overload

### 5.2 Security Considerations

- Input validation and sanitization
- Container isolation
- No persistent storage of raw web content
- Secure configuration handling
- Rate limiting for API endpoints

### 5.3 Error Handling

- Comprehensive logging system
- Automated retry logic for transient failures
- Circuit breakers for external services
- Graceful degradation when components fail
- User-friendly error messages
- Monitoring dashboard for system health

### 5.4 Testing Strategy

#### 5.4.1 Unit Testing
- Core business logic coverage
- API endpoint validation
- Error handling verification

#### 5.4.2 Integration Testing
- End-to-end research workflow testing
- Component interaction verification
- API contract validation

#### 5.4.3 Performance Testing
- Load testing for concurrent research tasks
- Response time benchmarking
- Resource utilization monitoring

#### 5.4.4 UI Testing
- User flow validation
- Responsive design testing
- Accessibility compliance

## 6. Agent Design with KaibanJS

### 6.1 Agent Roles and Responsibilities

#### 6.1.1 Search Agent
- Generate search queries based on research topic
- Evaluate search results for relevance
- Identify additional search queries for deeper investigation
- Track search coverage and identify knowledge gaps

#### 6.1.2 Content Agent
- Process screenshots of web pages
- Extract key information from visual content
- Identify relevant sections and data points
- Associate extracted information with source metadata

#### 6.1.3 Summary Agent
- Synthesize information from multiple sources
- Create section summaries
- Identify contradictions or inconsistencies
- Generate cohesive narratives

#### 6.1.4 Research Director Agent
- Orchestrate overall research process
- Allocate resources to different research paths
- Determine when sufficient information has been gathered
- Prioritize research directions based on information value

### 6.2 KaibanJS Integration

#### 6.2.1 Teams Structure
- **Research Team**: Search Agent, Content Agent
- **Synthesis Team**: Summary Agent, Research Director

#### 6.2.2 Existing KaibanJS Tools to Leverage
- WebBrowser for headless browsing
- Summarizer for text summarization
- Memory for storing research findings
- Planner for orchestrating research process

#### 6.2.3 New Tools to Develop
- Screenshot analyzer for visual information extraction
- Source credibility evaluator
- Research quality assessor
- Report formatter with template support

### 6.3 Agent Workflow

1. Research Director plans initial research strategy
2. Search Agent generates and executes search queries
3. Content Agent processes web page screenshots
4. Content Agent extracts key information
5. Summary Agent synthesizes information from multiple sources
6. Research Director evaluates information and identifies gaps
7. Process repeats until sufficient information is gathered
8. Final report is generated and formatted

## 7. User Experience

### 7.1 UI/UX Guidelines

- Dark theme with modern, clean interface
- Emoji integration for improved readability
- Clear progress indicators
- Intuitive navigation
- Responsive design for various screen sizes
- Accessibility compliance

### 7.2 Report Generation

#### 7.2.1 Report Structure
- Executive summary
- Key findings
- Detailed analysis by subtopic
- Source list with credibility ratings
- References and citations
- Recommendations (where applicable)

#### 7.2.2 Report Formats
- Web view (primary)
- PDF export (primary)
- Markdown export (secondary)
- HTML export (secondary)

#### 7.2.3 Report Management
- Version history
- Tagging and categorization
- Search functionality
- Comparison tools

### 7.3 User Interaction Flow

1. User inputs research topic
2. System provides configuration options
3. User initiates research
4. System displays real-time progress
5. User can influence research direction (optional)
6. System generates report
7. User reviews and exports report as needed
8. System maintains history of past reports

## 8. Implementation Roadmap

### 8.1 Phase 1: Core Infrastructure
- Docker containerization setup
- Basic API and GUI implementation
- DuckDuckGo search integration
- Screenshot capture functionality

### 8.2 Phase 2: LLM Integration
- KaibanJS implementation
- Agent design and orchestration
- Local LLM support
- Cloud LLM support

### 8.3 Phase 3: Research Enhancement
- Advanced search capabilities
- Link following and deeper research
- Source credibility evaluation
- Information gain metrics

### 8.4 Phase 4: UI/UX Refinement
- Report formatting and export
- Progress dashboard
- Configuration interface
- History management

### 8.5 Phase 5: Performance Optimization
- Parallel processing improvements
- Caching mechanisms
- Resource utilization optimization
- Error handling refinement

## 9. Configuration Templates

### 9.1 YAML Configuration Example

```yaml
research:
  max_iterations: 5
  max_parallel_searches: 10
  depth_first_search: true
  follow_links: true
  max_links_per_page: 3
  information_gain_threshold: 0.2

models:
  primary:
    provider: "anthropic"
    model: "gemma-3-27b-it-abliterated"
    temperature: 0.3
    top_p: 0.95
    max_tokens: 4000
  
  fallback:
    provider: "openai"
    model: "gemma3-27b"
    temperature: 0.5
    top_p: 0.9
    max_tokens: 2000

  vision:
    provider: "openai"
    model: "gpt-4o"
    temperature: 0.2
    max_tokens: 1000

search:
  engine: "duckduckgo"
  results_per_query: 8
  domain_filters:
    include:
      - ".edu"
      - ".gov"
      - ".org"
    exclude:
      - "pinterest.com"
      - "quora.com"

reporting:
  format: "markdown"
  include_sources: true
  summarize_sources: true
  max_report_length: 5000
```

### 9.2 Docker Compose Example

```yaml
version: '3'

services:
  web-scraper-api:
    build:
      context: ./api
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - MAX_CONCURRENT_JOBS=5
    volumes:
      - research-data:/app/data
      - ./config:/app/config
    restart: unless-stopped

  web-scraper-gui:
    build:
      context: ./gui
      dockerfile: Dockerfile
    ports:
      - "8080:80"
    depends_on:
      - web-scraper-api
    restart: unless-stopped

volumes:
  research-data:
```

## 10. Folder Paths:
`api/` - This is the folder containing the Web Scraper API
`gui/` - This is the folder containing the Web Scraper GUI
