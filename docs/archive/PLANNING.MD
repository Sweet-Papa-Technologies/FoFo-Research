# Goal
To create a simple app capable of conducting in-depth research on a topic of interest. It will search various websites and collect data to create a report.
To keep the tool versatile and to prevent web-scraping issues, the app will use screenshots of the websites to analyze data. Data will never be saved or replicated.

# Components:
- Web Scraper API: Some sort of CLI app that will take a subject and then find various websites to scrape data from.
- Web Scraper GUI: A simple web app that will allow users to input a subject and then use the Web Scraper API to scrape data from various websites.

# Specifications / Requirements

## Web Scraper API
- We must use Docker to containerize the Web Scraper API and Web Scraper GUI.
- The Web Scraper API must be able to read data from various websites, via screenshots.
- The Web Scraper API should use some sort of headless browser to take screenshots of the websites.
- The Web Scraper API should be able to scroll and take screenshots of the ENTIRE page.
- The Web Scraper should be able to scrape and process multiple websites at once -- using different tabs for each site
- The Web Scraper should follow relevant links and perform follow up searches for each sub-topic it is given, ensuring a variety of data is collected.
- The Web Scraper should take notes and summarize what it has learned from each site, and take note of the site URL and summary for each site.
- The Web Scraper should use KaibanJS to allow for easy integration of different LLMs and for agentic orchestration of the research process. The hardcoded supported LLMs will be local LLMs via Ollama and LM Studio, and then OpenAI, Anthropic, and Google Gemini. Vision models should be used when possible for text scraping, etc. If a model does not have vision support, the Web Scraper should use OCR or other techniques to extract text from the screenshots.
- A simple YAML file should be used to configure the Web Scraper API. This file should allow for easy configuration of the Web Scraper API, and should allow for easy addition of new LLMs and other features relevant to the current feature set (setting model, parameters, etc)
- The backend should use some sort of queue with the ability to get status updates on a job. This way a job can be submitted and then the user can check on the status of the job or leave the page on the frontend and come back.
- The backend should allow for simultaneous web searches to run, and should allow for this number to be configured (up to 20 parallel searches)
- The backend should use a simple docker compose file to allow for easy deployment and management of the app. It should also setup a volume for persistent storage of the research results.
- For search engine, DuckDuckGo should be used.
- Robust error handling and retry logic to prevent the app from crashing.
- Should use NodeJS and Typescript
- Should have unit tests for ensuring app stays stable
- Should allow for easy integration with OTHER search engines via API where easily supported (e.g. Google Custom Search API). For now, only DuckDuckGo will be used, but we will want to code in ability to select other ones if needed.

## Web Scraper GUI
- The Web Scraper GUI should allow for simple input of a subject, and then calls the Web Scraper API to run the research. This UI should be blocked until the research is complete. Only one research can be run at a time per instance of the app.
- The Web Scraper GUI should display the research results in a simple and easy to understand format, with a list of sites and their summaries available at the bottom of the page (in some sort of collapsible list)
- The Web Scraper GUI should have a clean and modern UI, with a dark theme, and plenty of emojis. It should use Markdown and HTML to render the research in a very clean and approachable way.
- The report should be exportable to PDF
- The app should keep track of and store all reports that it generates. The reports should be viewable from the Web Scraper GUI.
- Robust error handling and retry logic to prevent the app from crashing.
- Frontend should use Quasar v2 and Vue3 with Vite + TypeScript

# Supported Models:
- Local: Gemma3 27b, Phi-4 reasoning, other LM Studio with vision support
- OpenAI: GPT 4o, (other models not tested)
- Anthropic: Claude 3.7 Sonnet, (other models not tested)
- Google Gemini: Gemini 2.0 Flash, (other models not tested)

# Open Questions for Design:
- When using KaibanJS, what teams, agents, tools, tasks, etc should be designed out for yielding the best results?
- What is the default amount of iterations the agent should perform before it deems it has enough information to complete its task?
- How do we ensure we can handle a wide range of research topics?
- What EXISTING KaibanJS tools can we use to build this app out?
- WHat tools will we need to MAKE to build this app out?

---

# LLM Feedback

## Feedback on Web Research Tool Design

Thank you for sharing your design document for the web research tool. This is an interesting project with solid foundational components. Here's my feedback to help improve your design:

## Strengths of Current Design

Your goal of creating a tool that conducts in-depth research and generates reports while using screenshots to avoid web-scraping issues is well-considered. The Docker containerization approach and the separation between API and GUI components create a maintainable architecture.

## Suggested Improvements

### Architecture Refinements

1. **Job Management System**
   - Consider implementing a more robust job management system with status notifications (email, push, etc.)
   - Add the ability to pause/resume research jobs
   - Implement priority queues for more important research tasks

2. **Data Handling**
   - While you mention using screenshots to avoid scraping issues, you should define how text is extracted from these screenshots in more detail. When vision models aren't available, what OCR solution will you use? Consider Tesseract or cloud OCR services as fallbacks.
   - Add caching mechanisms to avoid re-scraping recently visited sites
   - Define a data retention policy for screenshots and extracted text

3. **Search Functionality**
   - Add support for advanced search operators
   - Implement domain filtering (academic, news, government sources)
   - Consider adding date range filtering for research

### User Experience Enhancements

1. **Research Interface**
   - Instead of blocking the UI during research, implement a real-time progress dashboard showing websites being processed
   - Add the ability to influence the research direction mid-process
   - Implement tagging and categorization for research topics

2. **Report Management**
   - Add collaboration features (shared reports, comments)
   - Implement version control for reports
   - Add more export formats (Markdown, HTML, Word) beyond PDF

### LLM Integration

1. **Agent Design**
   - For your KaibanJS implementation, consider specialized agent roles:
     - Search Agent: Finds relevant websites and evaluates search results
     - Content Agent: Analyzes screenshots and extracts key information
     - Summary Agent: Creates cohesive summaries from extracted information
     - Research Director: Orchestrates the overall process and identifies knowledge gaps

2. **Model Configuration**
   - Add configuration options for model parameters (temperature, top_p, etc.)
   - Implement model fallback chains for resilience
   - Consider adding a model evaluation system to determine which models perform best for different research topics

### Technical Improvements

1. **Error Handling**
   - Implement circuit breakers for external services
   - Add detailed logging for troubleshooting
   - Create a monitoring dashboard for system health

2. **Performance Optimization**
   - Add resource constraints for Docker containers
   - Implement smart scheduling for parallel processing
   - Consider adding a CDN for static assets in the GUI

3. **Testing Strategy**
   - Add integration tests for the full research pipeline
   - Implement automated UI testing
   - Create benchmark tests for different research topics

### Additional Features to Consider

1. **Research Quality**
   - Implement source credibility scoring
   - Add fact-checking capabilities against known reliable sources
   - Include citation tracking and management

2. **Advanced Capabilities**
   - Add support for multimedia research (images, videos)
   - Implement cross-language research capabilities
   - Consider adding a research template system for different types of inquiries

## Answers to Open Questions

Regarding your open questions:

1. **KaibanJS Structure**:
   - Teams: Research Team (search, analysis), Synthesis Team (summarization, reporting)
   - Agents: As mentioned above, with specific roles and responsibilities
   - Tools: Web searcher, screenshot capturer, OCR processor, summarizer, report generator

2. **Iteration Count**:
   - Start with a configurable default of 3-5 iterations
   - Implement an "information gain" metric to determine when to stop (when new iterations yield diminishing returns)

3. **Topic Range**:
   - Create research templates for different domains (academic, business, technical)
   - Implement domain-specific evaluation criteria
   - Add specialized knowledge sources for different domains

4. **Existing KaibanJS Tools**:
   - WebBrowser for headless browsing
   - Summarizer for text summarization
   - Memory for storing research findings
   - Planner for orchestrating the research process

5. **New Tools Needed**:
   - Screenshot analyzer for visual information extraction
   - Source credibility evaluator
   - Research quality assessor
   - Report formatter with template support
