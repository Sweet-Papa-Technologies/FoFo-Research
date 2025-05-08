NodeJS + AI Agents (Tutorial)
Welcome to our tutorial on integrating KaibanJS with NodeJS to create a powerful command-line blogging application. This guide will take you through setting up your environment, defining AI agents, and building a simple yet effective NodeJS application that utilizes AI to research and generate blog posts about the latest news on any topic you choose.

By the end of this tutorial, you will have a solid understanding of how to leverage AI within a NodeJS application, making your projects smarter and more interactive.

For the Lazy: Jump Right In!
If you're eager to see the final product in action without following the step-by-step guide first, we've got you covered. Click the link below to access a live version of the project running on CodeSandbox.

View the completed project on a CodeSandbox

Feel free to return to this tutorial to understand how we built each part of the application step by step!

Project Setup
Using AI Development Tools?
Our documentation is available in an LLM-friendly format at docs.kaibanjs.com/llms-full.txt. Feed this URL directly into your AI IDE or coding assistant for enhanced development support!

1. Create a new NodeJS project:
# Create a new directory for your project
mkdir kaibanjs-node-demo
cd kaibanjs-node-demo

# Initialize a new Node.js project
npm init -y

# Install necessary dependencies
npm install kaibanjs @langchain/community dotenv

2. Create a .env file in the root of your project and add your API keys:
TAVILY_API_KEY=your-tavily-api-key
OPENAI_API_KEY=your-openai-api-key

To obtain these API keys you must follow the steps below.
For the Tavily API key:

Visit https://tavily.com/
Sign up for an account or log in if you already have one.
Navigate to your dashboard or API section.
Generate a new API key or copy your existing one.
For the OpenAI API key:

Go to https://platform.openai.com/
Sign up for an account or log in to your existing one.
Navigate to the API keys section in your account settings.
Create a new API key or use an existing one.
Note: Remember to keep these API keys secure and never share them publicly. The .env file should be added to your .gitignore file to prevent it from being committed to version control.

Defining Agents and Tools
Create a new file blogTeam.js. We'll use this file to set up our agents, tools, tasks, and team.

require('dotenv').config();
const { Agent, Task, Team } = require('kaibanjs');
const { TavilySearchResults } = require('@langchain/community/tools/tavily_search');

// Define the search tool used by the Research Agent
const searchTool = new TavilySearchResults({
  maxResults: 5,
  apiKey: process.env.TAVILY_API_KEY
});

// Define the Research Agent
const researchAgent = new Agent({
  name: 'Ava',
  role: 'News Researcher',
  goal: 'Find and summarize the latest news on a given topic',
  background: 'Experienced in data analysis and information gathering',
  tools: [searchTool]
});

// Define the Writer Agent
const writerAgent = new Agent({
  name: 'Kai',
  role: 'Content Creator',
  goal: 'Create engaging blog posts based on provided information',
  background: 'Skilled in writing and content creation',
  tools: []
});

// Define Tasks
const researchTask = new Task({
  title: 'Latest news research',
  description: 'Research the latest news on the topic: {topic}',
  expectedOutput: 'A summary of the latest news and key points on the given topic',
  agent: researchAgent
});

const writingTask = new Task({
  title: 'Blog post writing',
  description: 'Write a blog post about {topic} based on the provided research',
  expectedOutput: 'An engaging blog post summarizing the latest news on the topic in Markdown format',
  agent: writerAgent
});

// Create the Team
const blogTeam = new Team({
  name: 'AI News Blogging Team',
  agents: [researchAgent, writerAgent],
  tasks: [researchTask, writingTask],
  env: { OPENAI_API_KEY: process.env.OPENAI_API_KEY }
});

module.exports = { blogTeam };


Building the NodeJS Application
Now, let's create our main NodeJS application. Create a new file app.js with the following code:

const { blogTeam } = require('./blogTeam');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function generateBlogPost(topic) {
  console.log(`Generating blog post about "${topic}"...`);
  console.log('Status: RUNNING');

  try {
    const output = await blogTeam.start({ topic });
    if (output.status === 'FINISHED') {
      console.log('\nGenerated Blog Post:');
      console.log(output.result);

      const { costDetails, llmUsageStats, duration } = output.stats;
      console.log('\nStats:');
      console.log(`Duration: ${duration} ms`);
      console.log(`Total Token Count: ${llmUsageStats.inputTokens + llmUsageStats.outputTokens}`);
      console.log(`Total Cost: $${costDetails.totalCost.toFixed(4)}`);
    } else if (output.status === 'BLOCKED') {
      console.log('Workflow is blocked, unable to complete');
    }
  } catch (error) {
    console.error('Error generating blog post:', error);
  }

  rl.question('\nEnter another topic (or "quit" to exit): ', handleInput);
}

function handleInput(input) {
  if (input.toLowerCase() === 'quit') {
    rl.close();
    return;
  }
  generateBlogPost(input);
}

console.log('Welcome to the AI News Blogging Team!');
rl.question('Enter a topic to generate a blog post (e.g. "AI News Sep, 2024"): ', handleInput);

rl.on('close', () => {
  console.log('Thank you for using the AI News Blogging Team. Goodbye!');
  process.exit(0);
});


This NodeJS application creates a command-line interface for interacting with our AI blogging team. Let's break down its key components:

We import the blogTeam from our blogTeam.js file and set up a readline interface for user input.

The generateBlogPost function is the core of our application. It takes a topic as input, starts the KaibanJS workflow, and displays the results and statistics.

The handleInput function processes user input, either generating a new blog post or exiting the application.

We set up a welcome message and prompt the user for their first topic.

The application continues to prompt for new topics until the user decides to quit.

Running the Project
Start the application:
node app.js

Follow the prompts in the command line to generate blog posts on various topics.
Example Inputs
Now that your AI News Blogging Team is ready, here are three topical examples you can try:

"Latest AI courses"
"Stock market 2024"
"Web development trends 2024"
Feel free to modify these topics or create your own. The AI agents will research the most recent information and craft a blog post summarizing key points and developments.

Tip: For the most up-to-date results, include the current year or "latest" in your query.


---

What is an Agent?
An agent is an autonomous entity designed to:

Execute specific tasks
Make independent decisions
Interact with other agents
Consider an agent as a specialized team member, equipped with unique skills and designated responsibilities. Agents can assume various roles such as 'Developer', 'Tester', or 'Project Manager', each playing a crucial part in achieving the team's collective objectives.

Using AI Development Tools?
Our documentation is available in an LLM-friendly format at docs.kaibanjs.com/llms-full.txt. Feed this URL directly into your AI IDE or coding assistant for enhanced development support!

Creating an Agent
To create an agent, you start by initializing an instance of the Agent class with the necessary properties. Here's how you can do it:

import { Agent } from 'kaibanjs';

const searchAgent = new Agent({
    name: 'Scout',
    role: 'Information Gatherer',
    goal: 'Find up-to-date information about the given sports query.',
    background: 'Research',
    tools: [searchTool],
    kanbanTools: ['block_task'], // Optional: Enable workflow control tools like 'block_task'
});

Agent Attributes
name
A descriptive or friendly identifier for easier recognition of the agent.

Type: String
Example: Jonh Smith
role
Defines the agent's function within the team, determining the kind of tasks it is best suited for.

Type: String
Example: Coordinator
goal
Specifies the individual objective the agent aims to achieve, guiding its decision-making process.

Type: String
Example: Achieve sales target
background
Provides context that enriches the agent's role and goal, enhancing interaction and collaboration dynamics.

Type: String
Example: Has extensive experience in market analysis and strategic planning
tools
A set of capabilities or functions the agent can use, initialized with a default empty list.

Type: Array of Tool objects.
Example: [SearchTool, CalculatorTool, etc]
Default: []
kanbanTools (optional)
Special tools for workflow control and task management, such as task blocking.

Type: Array of strings
Example: ['block_task']
Default: []
Available Tools: See Kanban Tools for details and usage
llmConfig (optional)
Configures the underlying language model used by the agent.

Type: Object
/**
 * 
 * @property {('openai' | 'google' | 'anthropic' | 'mistral')} provider - The provider of the language model, defaults to "openai".
 * @property {string} model - Specific language model to use, defaults to "gpt-4o-mini".
 * @property {number} maxRetries - Number of retries for calling the model, defaults to 1.
 * @property {string} apiBaseUrl - Optional custom endpoint URL for the LLM API.
 *
 */
{
  provider: "openai",  // Default provider
  model: "gpt-4o-mini",  // Default model
  maxRetries: 1,  // Default number of retries
  apiBaseUrl: "https://your-custom-llm-endpoint.com"  // Optional: Custom LLM endpoint URL
};


The apiBaseUrl field allows you to specify a custom endpoint for the LLM API. This is particularly useful when:

Using a proxy server for API calls
Working with self-hosted models
Implementing custom routing or load balancing
Dealing with regional API endpoints
Note: All properties within llmConfig are passed to the language model constructor using the Langchain standard. For detailed information on how these properties are utilized, refer to the Langchain Model Constructor Documentation.

maxIterations (optional)
Specifies the maximum number of iterations the agent is allowed to perform before stopping, controlling execution length and preventing infinite loops.

Type: Integer
Example: 25, 50, etc
Default: 10
forceFinalAnswer
Controls whether the agent should deliver a final answer as it approaches the maximum number of allowed iterations. This is useful in scenarios where the agent has a satisfactory answer but might otherwise continue refining it.

Type: Boolean
Example: false
Default: true
status
Indicates the current operational state of the agent. This property is read-only and provides insights into the agent's lifecycle within tasks.

Type: Enum (Read-only)
Example: [INITIAL, THINKING, EXECUTING_ACTION, etc]
Enum Defined At: Agent Status Definitions
id
A unique identifier for the agent, autogenerated by the system. This property is read-only.

Type: String (Read-only)
Example: "579db4dd-deea-4e09-904d-a436a38e65cf"
Conclusion
Agents are the building blocks of the KaibanJS framework. By understanding how to define and interact with agents, you can create sophisticated AI systems that leverage the power of collaborative intelligence.

---

What is a Tool?
A Tool is a skill or function that agents can utilize to perform various actions:

Search on the Internet
Calculate data or predictions
Automate data entry tasks
This includes tools from the LangChain Tools, enabling everything from simple searches to complex interactions and effective teamwork among agents.

Using AI Development Tools?
Our documentation is available in an LLM-friendly format at docs.kaibanjs.com/llms-full.txt. Feed this URL directly into your AI IDE or coding assistant for enhanced development support!

Example: Integrating a Search Tool
To demonstrate the utility of tools, we will integrate a search tool into an agent, enabling it to fetch up-to-date information based on a given query.

Before using the tool, install the necessary package from npm:

npm i @langchain/community

Step 1: Define the Tool
First, define the search tool with necessary configurations, including maximum results and API key.

import { TavilySearchResults } from '@langchain/community/tools/tavily_search';

const searchTool = new TavilySearchResults({
    maxResults: 1,
    apiKey: 'ENV_TRAVILY_API_KEY',
});

Step 2: Create the Agent
Create an agent named 'Scout', designed to gather information using the defined search tool.

import { Agent } from 'kaibanjs';

const searchAgent = new Agent({
    name: 'Scout',
    role: 'Information Gatherer',
    goal: 'Find up-to-date information about the given sports query.',
    background: 'Research',
    tools: [searchTool],
});

Integration with LangChain Tools
KaibanJS seamlessly integrates with a variety of LangChain compatible tools, empowering your AI agents with capabilities ranging from web browsing and image generation to interacting with cloud services and executing Python code. These tools enrich the agents' functionality, allowing them to perform specialized tasks efficiently and effectively.

Here are some of the tools available for integration:

Tavily Search: Enhances your agents with robust search capabilities.
Dall-E Tool: Enables agents to create images using OpenAI's Dall-E.
Discord Tool: Allows agents to interact with Discord channels.
Google Calendar Tool: Manage Google Calendar events.
WolframAlpha Tool: Utilizes WolframAlpha for computational intelligence.
These tools provide your agents with the flexibility to perform tasks that are otherwise outside the scope of typical AI functionalities, making them more versatile and capable of handling complex workflows.

Benefits of Tool Integration
Integrating tools into your agents provides several advantages:

Enhanced Precision: Equip agents with specific skills for accurate task performance.
Increased Efficiency: Streamline operations with automated tools for data and calculations.
Expanded Capabilities: Allow agents to undertake a broader range of activities, from data retrieval to analytical tasks.
For detailed guidance on specific tools and their configurations, refer to the individual tool documentation. This structured approach ensures your agents are equipped with the necessary tools to excel in their designated tasks, enhancing both their functionality and productivity.

---

Create a Custom Tool
This tutorial will guide you through the process of creating a custom tool for use with Kaiban agents. Custom tools allow you to extend the capabilities of your AI agents by integrating external APIs, services, or npm utilities.

Introduction
Custom tools in Kaiban are based on the LangChain Tool class and allow you to define specific functionalities that your agents can use. By creating custom tools, you can give your agents access to a wide range of capabilities, from web searches to complex computations.

How Tools Work with Agents and LLMs
Understanding the interaction between tools, agents, and Language Models (LLMs) is crucial:

The agent, guided by the LLM, identifies a need for specific information or action.
The agent selects the appropriate tool based on its description and the current task.
The LLM generates the necessary input for the tool.
The agent calls the tool's _call method with this input.
The tool processes the input, performs its specific function (e.g., API call, computation), and returns the result.
The agent receives the tool's output and passes it back to the LLM.
The LLM interprets the result and decides on the next action or provides a response.
This process allows agents to leverage specialized functionalities while the LLM handles the high-level reasoning and decision-making.

Prerequisites
Before you begin, make sure you have:

A basic understanding of JavaScript and async/await syntax.
Kaiban and LangChain libraries installed in your project.
Access to the API or service you want to integrate (if applicable).
Step-by-Step Guide
Step 1: Import Required Dependencies
Start by importing the necessary classes and libraries:

import { Tool } from "@langchain/core/tools";
import { z } from "zod";

The Tool class from LangChain provides a standardized interface for creating custom tools. It ensures that your tool can be seamlessly integrated with Kaiban agents and LLMs. The Tool class handles the interaction between the agent and your custom functionality, making it easier to extend your agents' capabilities.

Zod is a TypeScript-first schema declaration and validation library. In the context of custom tools, Zod is used to:

Define the expected structure of the input that your tool will receive.
Validate the input at runtime, ensuring that your tool receives correctly formatted data.
Provide clear error messages if the input doesn't match the expected schema.
Using Zod enhances the reliability and ease of use of your custom tools.

Step 2: Define Your Custom Tool Class
Create a new class that extends the Tool class:

export class CustomTool extends Tool {
  constructor(fields) {
    super(fields);
    // Initialize any required fields
    this.apiKey = fields.apiKey;

    // Set the tool's name and description
    this.name = "custom_tool";
    this.description = `Describe what your tool does and how it should be used.`;

    // Define the input schema using zod
    this.schema = z.object({
      query: z.string().describe("Describe the expected input")
    });
  }

  async _call(input) {
    // Implement the core functionality of your tool here
    // This method will be called when the agent uses the tool
    // Process the input and return the result
  }
}

Implementation Note: There are two valid approaches to define tool properties in LangChain:

Direct Property Assignment (as shown above):

constructor(fields) {
    super(fields);
    this.name = "custom_tool";
    this.description = "Tool description";
    this.schema = z.object({...});
}

Constructor Fields (LangChain's preferred way):

constructor(fields) {
    super({
        name: "custom_tool",
        description: "Tool description",
        schema: z.object({...}),
        ...fields
    });
}

Both approaches work correctly with KaibanJS. The second approach is more aligned with LangChain's implementation, but either method will function properly in your applications. :::

Step 3: Implement the _call Method
The _call method is where you implement the main functionality of your tool. This method should:

Process the input
Make any necessary API calls or perform computations
Return the result
Here's an example:

async _call(input) {
    const url = 'https://api.example.com/endpoint';
    const body = JSON.stringify({ query: input.query });
    const res = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`,
        },
        body: body
    });
    return res.json();
}

Step 4: Use Your Custom Tool with a Kaiban Agent
Once you've created your custom tool, you can use it with a Kaiban agent:

import { Agent } from "kaibanjs";
import { CustomTool } from "./CustomTool";

const customTool = new CustomTool({
  apiKey: "YOUR_API_KEY"
});

const agent = new Agent({
  name: "CustomAgent",
  role: "Specialized Task Performer",
  goal: "Utilize the custom tool to perform specific tasks.",
  background: "Expert in using specialized tools for task completion",
  tools: [customTool]
});

// Use the agent in your Kaiban workflow

important
The key to creating a highly reliable tool is to minimize its responsibilities and provide a clear, concise description for the LLM. This approach allows the LLM to understand the tool's purpose and use it effectively.

Ideas for Custom Tools
You can create a wide variety of custom tools using npm packages or external APIs. Here are some ideas:

Web Scraping Tool (using Puppeteer):

Scrape dynamic web content or take screenshots of web pages.
import puppeteer from "puppeteer";

class WebScraperTool extends Tool {
  async _call(input) {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto(input.url);
    const content = await page.content();
    await browser.close();
    return content;
  }
}

PDF Processing Tool (using pdf-parse):

Extract text from PDF files.
import pdf from "pdf-parse";

class PDFExtractorTool extends Tool {
  async _call(input) {
    const dataBuffer = await fs.promises.readFile(input.filePath);
    const data = await pdf(dataBuffer);
    return data.text;
  }
}

Image Analysis Tool (using sharp):

Analyze or manipulate images.
import sharp from "sharp";

class ImageAnalyzerTool extends Tool {
  async _call(input) {
    const metadata = await sharp(input.imagePath).metadata();
    return metadata;
  }
}

Natural Language Processing Tool (using natural):

Perform NLP tasks like tokenization or sentiment analysis.
import natural from "natural";

class NLPTool extends Tool {
  async _call(input) {
    const tokenizer = new natural.WordTokenizer();
    return tokenizer.tokenize(input.text);
  }
}

Database Query Tool (using a database driver):

Execute database queries and return results.
import { MongoClient } from "mongodb";

class DatabaseQueryTool extends Tool {
  async _call(input) {
    const client = new MongoClient(this.dbUrl);
    await client.connect();
    const db = client.db(this.dbName);
    const result = await db
      .collection(input.collection)
      .find(input.query)
      .toArray();
    await client.close();
    return result;
  }
}

These are just a few examples. The possibilities for custom tools are virtually limitless, allowing you to extend your agents' capabilities to suit your specific needs.

Best Practices
Clear Description: Provide a clear and concise description of your tool's functionality to help the LLM understand when and how to use it.

Input Validation: Use zod to define a clear schema for your tool's input, ensuring that it receives the correct data types.

Error Handling: Implement robust error handling in your _call method to gracefully manage API errors or unexpected inputs.

Modularity: Design your tool to have a single, well-defined responsibility. This makes it easier to use and maintain.

Documentation: Comment your code and provide usage examples to make it easier for others (or yourself in the future) to understand and use your custom tool.

Conclusion
Creating custom tools allows you to significantly extend the capabilities of your Kaiban agents. By following this tutorial and exploring various npm packages and APIs, you can create a wide range of specialized tools, enabling your agents to perform complex and diverse tasks.

---

What is a Task?
A Task is a defined piece of work assigned to agents, characterized by:

Clear Instructions: Details exactly what needs to be accomplished.
Defined Outcome: Specifies the expected result upon completion.
Assigned Responsibility: Allocated to a specific agent equipped to handle the task.
Tasks are essential in organizing efforts and driving projects towards successful outcomes.

Using AI Development Tools?
Our documentation is available in an LLM-friendly format at docs.kaibanjs.com/llms-full.txt. Feed this URL directly into your AI IDE or coding assistant for enhanced development support!

Creating a Task
To create a task, you start by initializing an instance of the Task class with the necessary properties. Here's how you can do it:

import { Task } from 'kaibanjs';

const searchTask = new Task({
    description: 'Search for detailed information about the sports query: {sportsQuery}.',
    expectedOutput: `Detailed information about the sports event, 
    including key players, key moments, 
    final score, and other useful information.`,
    agent: searchAgent  // Ensure searchAgent is defined and imported if needed
});

This example demonstrates how to define a task with a clear description, expected outcomes, and an associated agent responsible for its execution.

Task Attributes
title (optional)
The title of the task, which can be used as a concise summary or label.

Type: String
Example: Update Client Data
Default: '' (empty string)
description
Describes what the task entails and the work to be performed.

Type: String
Example: Search for detailed information about the sports query.
expectedOutput
Specifies the anticipated result or product from completing the task.

Type: String
Example: Detailed report including key players, key moments, and final score.
isDeliverable
Specifies if the task outcome should be considered a final deliverable. Typically, KaibanJS treats the result of the last task as the deliverable, but this can be set to true for tasks whose results are critical at other stages.

Type: Boolean
Example: true
Default: false
agent
The agent assigned to execute the task.

Type: Agent
Example: Refer to a specific Agent object instance, such as searchAgent.
status
Indicates the current operational state of the task. This property is read-only and provides insights into the task's lifecycle.

Type: Enum (Read-only)
Example: [TODO, DOING, BLOCKED, REVISE, DONE, AWAITING_VALIDATION, VALIDATED]
Enum Defined At: Tasks Status Definitions
externalValidationRequired
Indicates whether the task requires external validation before being considered complete.

Type: Boolean
Default: false
feedbackHistory
An array that stores the history of feedback provided for the task.

Type: Array (Read-only)
Default: []
Each Feedback object in the feedbackHistory array has the following structure:

content: String - The feedback message
status: Enum - The status of the feedback (PENDING or PROCESSED)
timestamp: Number - Unix timestamp of when the feedback was provided
allowParallelExecution
Determines whether the task can be executed concurrently with other tasks when dependencies are met. When set to true, the task may run in parallel with other tasks that have this flag enabled. When false or not set, the task will execute sequentially based on its position in the tasks array.

Type: Boolean
Example: true
Default: false
referenceId
A user-defined identifier that can be used for external references (e.g., database keys, external system IDs). This ID is separate from the system-generated internal ID and can be used for integration with external systems.

Type: String (optional)
Example: "TASK-123", "PRJ-456-T1"
Default: undefined
id
A system-generated unique identifier for the task. This is automatically created using UUID v4 and should not be manually set. For external references, use referenceId instead.

Type: String (Read-only)
Example: "579db4dd-deea-4e09-904d-a436a38e65cf"
Task Result Passing
Tasks in KaibanJS can access and utilize results from previous tasks, enabling complex workflows where tasks build upon each other's outputs. This feature is essential for creating sophisticated, multi-step processes.

Using Task Results
To reference a previous task's result in your task description, use the {taskResult:taskN} syntax, where N is the task's position in the workflow (1-based indexing).

// First task
const dataCollectionTask = new Task({
  description: 'Collect and analyze user data from the database',
  expectedOutput: 'JSON object containing user analytics',
  agent: dataAnalyst
});

// Second task using first task's result
const reportGenerationTask = new Task({
  description: 'Generate a detailed report based on this data: {taskResult:task1}',
  expectedOutput: 'A comprehensive PDF report',
  agent: reportWriter
});

Task Result Interpolation
When a task is executed, its description is automatically interpolated with:

Input variables using {variableName} syntax
Previous task results using {taskResult:taskN} syntax
The interpolation happens at runtime, ensuring that tasks have access to the most current data and results.

Task Context and Memory
Tasks can operate with or without memory of previous task executions, controlled by the team's memory configuration:

const team = new Team({
  name: 'Content Creation Team',
  agents: [researcher, writer, editor],
  tasks: [researchTask, writingTask, editingTask],
  memory: true, // Enable task context sharing (default)
  // memory: false, // Disable task context sharing
});

When memory is enabled (default):

Tasks have access to the full workflow history
Agents can understand the context of previous task executions
Better for complex workflows where context improves task execution
May use more tokens due to additional context
When memory is disabled:

Tasks operate in isolation
Only explicit task results are passed between tasks
Better for independent tasks or when minimizing token usage
Reduces context but may affect task coherence
Best Practices
Clear Dependencies: Make task dependencies explicit in your task descriptions
Result Format: Ensure task results are in a format that can be easily used by subsequent tasks
Error Handling: Consider what happens if a referenced task result is unavailable
Documentation: Document the expected format of task results for better maintainability
Memory Usage: Consider enabling/disabling memory based on:
Workflow complexity and interdependence
Token usage requirements
Need for contextual awareness between tasks
Human-in-the-Loop (HITL) Features
KaibanJS supports Human-in-the-Loop functionality for tasks, allowing for manual intervention and validation when necessary. This feature enhances the accuracy and reliability of task outcomes by incorporating human oversight into the workflow.

Key HITL features for tasks include:

External validation requirements
Feedback provision and history
Task revision based on human input
These features enable more complex workflows where human expertise or judgment is necessary, ensuring higher quality results and more reliable task completion.

For a detailed explanation of HITL features and how to implement them in your KaibanJS projects, please refer to our Human-in-the-Loop (HITL) documentation.

Conclusion
Tasks drive the actions of agents in KaibanJS. By clearly defining tasks and their expected outcomes, you help AI agents work efficiently, whether alone or in teams. Understanding how tasks are carried out ensures that agents are well-prepared and that tasks are completed correctly.

---

What is a Team?
A Team represents a group of agents working together to complete assigned tasks. Each team is structured around a store, which manages the state and workflow of agents and tasks, making it the backbone of the team's functionality.

Using AI Development Tools?
Our documentation is available in an LLM-friendly format at docs.kaibanjs.com/llms-full.txt. Feed this URL directly into your AI IDE or coding assistant for enhanced development support!

Creating a Team
When assembling a team, you combine agents with complementary roles and tools, assign tasks, and select a process that dictates their execution order and interaction.


// Define agents with specific roles and goals
const profileAnalyst = new Agent({
    name: 'Mary', 
    role: 'Profile Analyst', 
    goal: 'Extract structured information from conversational user input.', 
    background: 'Data Processor',
    tools: []
});

const resumeWriter = new Agent({
    name: 'Alex Mercer', 
    role: 'Resume Writer', 
    goal: `Craft compelling, well-structured resumes 
    that effectively showcase job seekers qualifications and achievements.`,
    background: `Extensive experience in recruiting, 
    copywriting, and human resources, enabling 
    effective resume design that stands out to employers.`,
    tools: []
});

// Define the tasks for each agent
const processingTask = new Task({ 
  description: `Extract relevant details such as name, 
  experience, skills, and job history from the user's 'aboutMe' input. 
  aboutMe: {aboutMe}`,
  expectedOutput: 'Structured data ready to be used for a resume creation.', 
  agent: profileAnalyst
});

const resumeCreationTask = new Task({ 
    description: `Utilize the structured data to create 
    a detailed and attractive resume. 
    Enrich the resume content by inferring additional details from the provided information.
    Include sections such as a personal summary, detailed work experience, skills, and educational background.`,
    expectedOutput: `A professionally formatted resume in markdown format, 
    ready for submission to potential employers.`, 
    agent: resumeWriter 
});

// Create and start the team
const team = new Team({
  name: 'Resume Creation Team',
  agents: [profileAnalyst, resumeWriter],
  tasks: [processingTask, resumeCreationTask],
  inputs: { aboutMe: `My name is David Llaca. 
    JavaScript Developer for 5 years. 
    I worked for three years at Disney, 
    where I developed user interfaces for their primary landing pages
     using React, NextJS, and Redux. Before Disney, 
     I was a Junior Front-End Developer at American Airlines, 
     where I worked with Vue and Tailwind. 
     I earned a Bachelor of Science in Computer Science from FIU in 2018, 
     and I completed a JavaScript bootcamp that same year.` },  // Initial input for the first task
    env: {OPENAI_API_KEY: 'your-open-ai-api-key'},  // Environment variables for the team
    insights: `
Resume Success Metrics (2023):
1. Format Impact: STAR format results in 89% interview rate
2. Professional Titles: Using Mr./Ms. increases callbacks by 100%
3. Content Structure: 4-6 bullet points per role optimal
4. Keywords: "Implemented" + metrics = 76% success rate
5. Experience Focus: Last 10 years most relevant to employers
  `
});

// Listen to the workflow status changes
// team.onWorkflowStatusChange((status) => {
//   console.log("Workflow status:", status);
// });

team.start()
  .then((output) => {
    console.log("Workflow status:", output.status);
    console.log("Result:", output.result);
  })
  .catch((error) => {
    console.error("Workflow encountered an error:", error);
  });


Team Attributes
name
The name given to the team, reflecting its purpose or mission.

Type: String
Example: Resume Creation Team
agents
A collection of agents assigned to the team, each with specific roles and goals.

Type: Array of Agent objects
Example: [profileAnalyst, resumeWriter]
tasks
The tasks that the team is responsible for completing, directly associated with the agents.

Type: Array of Task objects
Example: [processingTask, resumeCreationTask]
inputs
Initial data or parameters provided to guide task execution. These inputs are dynamically integrated into task descriptions and operations, evaluated at runtime to tailor task behavior based on specific requirements.

Type: Object
Example: { aboutMe: 'Detailed background information...' }
env
A collection of environment variables that configure access to AI model APIs needed for your team's operations. This setup allows you to easily define API keys for one or more AI models, ensuring all agents in your team can access the necessary AI services.

Type: Object
Example: { OPENAI_API_KEY: 'your-open-ai-api-key' }
Supported values:
OPENAI_API_KEY for OpenAI services.
ANTHROPIC_API_KEY for Anthropic.
GOOGLE_API_KEY for Google.
MISTRAL_API_KEY for Mistral.
Note: It is crucial to use environment variables to manage these API keys. This method prevents sensitive information from being hardcoded into the source code, enhancing the security and adaptability of your system. It allows for easy updates and changes without altering the codebase, providing a secure and scalable solution for integrating AI services.

insights
A string containing the team's knowledge base and experience that can be referenced by agents during task execution. This allows agents to make informed decisions based on historical data, patterns, and previous experiences.

Type: String (optional)
Example:
const team = new Team({
  // ... other team configuration ...
  insights: `
Resume Success Metrics (2023):
1. Format Impact: STAR format results in 89% interview rate
2. Professional Titles: Using Mr./Ms. increases callbacks by 100%
3. Content Structure: 4-6 bullet points per role optimal
4. Keywords: "Implemented" + metrics = 76% success rate
5. Experience Focus: Last 10 years most relevant to employers
  `
});

Usage: Agents can access and utilize these insights to provide more personalized and context-aware responses, improving the quality of their task outputs.
logLevel
The logging level set for monitoring and debugging the team's activities.

Type: String (optional)
Example: 'debug', 'info', 'warn', 'error'
Default: info
memory
Controls whether tasks maintain context and history from previous task executions in the workflow.

Type: Boolean (optional)
Default: true
Usage:
When enabled (default), tasks have access to the workflow history and can build upon previous task contexts
When disabled, tasks operate in isolation with access only to explicit task results
Useful for controlling context sharing and optimizing token usage in complex workflows
Team Methods
start(inputs)
Initiates the team's task processing workflow and monitors its progress.

Parameters:
inputs (Object, optional): Additional inputs to override or supplement the initial inputs.
Returns: Promise<Object> - Resolves with different structures based on the workflow status:
For completed workflows:
    {
    status: 'FINISHED',
    result: workflowResult,
    stats: {
      duration: number,
      taskCount: number,
      agentCount: number,
      iterationCount: number,
      llmUsageStats: {
        inputTokens: number,
        outputTokens: number,
        callsCount: number,
        callsErrorCount: number,
        parsingErrors: number
      },
      costDetails: {
        totalCost: number
      },
      teamName: string
  }
}

For errored workflows:
// The promise is rejected with an Error object
new Error('Workflow encountered an error')

For blocked workflows:
  {
    status: 'BLOCKED',
    result: null,
    stats: { ... } // Same structure as FINISHED state
  }

Example:

team.start()
  .then((output) => {
    if (output.status === 'FINISHED') {
      console.log("Workflow completed. Final result:", output.result);
    } else if (output.status === 'BLOCKED') {
      console.log("Workflow is blocked");
      // Handle blocked state (e.g., request human intervention)
    }
  })
  .catch((error) => {
    console.error("Workflow encountered an error:", error);
  });

Note: This method resolves the promise for FINISHED and BLOCKED states, and rejects for ERRORED state. For BLOCKED state, it resolves with a null result, allowing the promise chain to continue but indicating that the workflow is blocked.

It's important to note that once the Promise resolves (whether due to completion, error, or blockage), it won't resolve again, even if the workflow continues after being unblocked.

For full HITL implementation, you would need to use this method in conjunction with other Team methods like provideFeedback and validateTask, and potentially set up additional listeners onWorkflowStatusChange to monitor the workflow's progress after it has been unblocked.

getStore()
Provides NodeJS developers direct access to the team's store.

Returns: The store object.
useStore()
Provides a React hook for accessing the team's store in React applications.

Returns: The store object.
provideFeedback(taskId, feedbackContent)
Provides feedback on a specific task, enabling human intervention in the AI workflow. This method triggers the human-in-the-loop workflow by setting the task status to REVISE, prompting the agent to reconsider and improve its work based on the provided feedback.

Parameters:
taskId (String): The ID of the task to provide feedback for.
feedbackContent (String): The feedback to be incorporated into the task.
Returns: void
Note: Calling this method initiates the human-in-the-loop process, allowing for iterative refinement of task outputs. You can track the workflow status using the onWorkflowStatusChange method.
validateTask(taskId)
Marks a task as validated, used in the HITL process to approve a task that required validation.

Parameters:
taskId (String): The ID of the task to be marked as validated.
Returns: void
onWorkflowStatusChange(callback)
Subscribes to changes in the workflow status, allowing real-time monitoring of the overall workflow progress.

Parameters:
callback
pause()
Temporarily halts the workflow execution. Tasks that are currently executing will be paused, and no new tasks will start until the workflow is resumed.

Returns: Promise<void>
Note: Tasks in DOING state will transition to PAUSED state. The workflow status will change to PAUSED.
Example:

// Pause workflow after 5 minutes to check intermediate results
setTimeout(() => {
  team.pause()
    .then(() => {
      const tasks = team.getTasks();
      console.log('Workflow paused. Current task states:', 
        tasks.map(t => ({ id: t.id, status: t.status }))
      );
    });
}, 5 * 60 * 1000);

resume()
Continues the workflow execution from its paused state. Previously paused tasks will resume execution, and new tasks will start according to their dependencies and execution strategy.

Returns: Promise<void>
Note: Tasks in PAUSED state will transition back to DOING state. The workflow status will change back to RUNNING.
Example:

// Monitor workflow status and resume after validation
team.onWorkflowStatusChange((status) => {
  if (status === 'PAUSED') {
    validateIntermediateResults()
      .then((isValid) => {
        if (isValid) {
          team.resume()
            .then(() => console.log('Validation passed, workflow resumed'));
        } else {
          team.stop()
            .then(() => console.log('Validation failed, workflow stopped'));
        }
      });
  }
});

stop()
Permanently stops the workflow execution. All executing tasks will be stopped, and the workflow cannot be resumed after being stopped.

Returns: `
Managing Task Results
Teams in KaibanJS handle the passing of results between tasks automatically. This system ensures that tasks can build upon each other's outputs while maintaining a clean and organized workflow.

Task Result Flow
Result Storage: When a task completes, its result is:

Stored in the task object
Logged in the workflow logs
Made available to subsequent tasks
Result Access: Tasks can access previous results through:

Direct interpolation in task descriptions using {taskResult:taskN}
The team's workflow context
Example Workflow with Result Passing
const team = new Team({
  name: 'Content Creation Team',
  agents: [researcher, writer, editor],
  tasks: [
    new Task({
      description: 'Research the topic: {topic}',
      expectedOutput: 'Key research points in JSON format',
      agent: researcher
    }),
    new Task({
      description: 'Write an article using this research: {taskResult:task1}',
      expectedOutput: 'Draft article in markdown format',
      agent: writer
    }),
    new Task({
      description: 'Edit and improve this article: {taskResult:task2}',
      expectedOutput: 'Final polished article',
      agent: editor
    })
  ],
  inputs: { topic: 'Artificial Intelligence Trends 2024' }
});

Workflow Context
The team maintains a workflow context that includes:

All completed task results
Input variables
Current workflow state
This context ensures that tasks have access to all the information they need to execute successfully.