# KaibanJS Agentic Workflow Architecture Guide

A focused guide for architecting AI agentic workflows with KaibanJS - covering Agents, Tasks, Teams, and coordination patterns.

## Core Concepts Overview

KaibanJS is built around four primary components for agentic workflows:
- **Agents**: Autonomous entities that execute tasks and make decisions
- **Tasks**: Defined pieces of work with clear instructions and expected outcomes
- **Teams**: Collections of agents working together with coordinated workflows
- **Tools**: Capabilities that extend agent functionality (optional)

## Agents

### What is an Agent?

An agent is an **autonomous entity** designed to:
- Execute specific tasks
- Make independent decisions  
- Interact with other agents
- Use tools to accomplish goals

### Creating Agents

```javascript
import { Agent } from 'kaibanjs';

const analyst = new Agent({
    name: 'DataAnalyst',
    role: 'Data Analysis Specialist', 
    goal: 'Analyze data and provide insights',
    background: 'Expert in data processing and statistical analysis',
    tools: [], // Optional tools array
    llmConfig: {
        provider: 'openai',
        model: 'gpt-4o-mini'
    }
});
```

### Key Agent Attributes

- **`name`**: Descriptive identifier
- **`role`**: Function within the team
- **`goal`**: Individual objective guiding decisions
- **`background`**: Context that enriches interaction
- **`tools`**: Capabilities the agent can use (array)
- **`llmConfig`**: Language model configuration (optional)
- **`maxIterations`**: Maximum iterations before stopping (default: 10)
- **`forceFinalAnswer`**: Whether to deliver final answer near max iterations (default: true)

## Tasks

### What is a Task?

A Task is a **defined piece of work** characterized by:
- Clear instructions detailing what needs to be accomplished
- Defined outcome specifying expected results
- Assigned responsibility to a specific agent

### Creating Tasks

```javascript
import { Task } from 'kaibanjs';

const analysisTask = new Task({
    title: 'Data Analysis', // Optional
    description: 'Analyze the dataset for trends and patterns: {dataSource}',
    expectedOutput: 'Statistical analysis report with key findings and visualizations',
    agent: analyst,
    isDeliverable: false // Optional, marks as final deliverable
});
```

### Key Task Attributes

- **`title`**: Concise summary (optional)
- **`description`**: What work needs to be performed
- **`expectedOutput`**: Anticipated result from completion
- **`agent`**: Agent assigned to execute the task
- **`isDeliverable`**: Whether outcome is a final deliverable (default: false)
- **`allowParallelExecution`**: Can run concurrently with other tasks (default: false)
- **`referenceId`**: User-defined identifier for external references
- **`dependencies`**: Array of task reference IDs that must complete first

### Task Result Passing

Tasks can access results from previous tasks using `{taskResult:taskN}` syntax:

```javascript
const dataCollection = new Task({
    description: 'Collect user data from the database',
    expectedOutput: 'JSON object with user analytics',
    agent: dataCollector
});

const reportGeneration = new Task({
    description: 'Generate report based on this data: {taskResult:task1}',
    expectedOutput: 'Comprehensive PDF report', 
    agent: reportWriter
});
```

## Teams

### What is a Team?

A Team represents agents working together with:
- Shared state management through a store
- Coordinated task execution
- Input/output handling
- Workflow orchestration

### Creating Teams

```javascript
import { Team } from 'kaibanjs';

const analysisTeam = new Team({
    name: 'Data Analysis Team',
    agents: [dataCollector, analyst, reportWriter],
    tasks: [dataCollection, analysisTask, reportGeneration],
    inputs: { 
        dataSource: 'customer_database',
        dateRange: '2024-Q1' 
    },
    env: { 
        OPENAI_API_KEY: 'your-api-key' 
    },
    memory: true, // Enable task context sharing (default)
    insights: `
        Team Knowledge Base:
        - Focus on actionable insights
        - Use statistical significance testing
        - Include confidence intervals in reports
    `
});
```

### Key Team Attributes

- **`name`**: Team identifier
- **`agents`**: Array of agents in the team
- **`tasks`**: Array of tasks to execute
- **`inputs`**: Initial data/parameters for tasks
- **`env`**: Environment variables (API keys, etc.)
- **`memory`**: Enable/disable task context sharing (default: true)
- **`insights`**: Shared knowledge base for agents

### Team Methods

```javascript
// Start workflow
team.start()
    .then((output) => {
        if (output.status === 'FINISHED') {
            console.log('Result:', output.result);
            console.log('Stats:', output.stats);
        } else if (output.status === 'BLOCKED') {
            console.log('Workflow blocked');
        }
    })
    .catch(error => console.error('Error:', error));

// Monitor workflow status
team.onWorkflowStatusChange((status) => {
    console.log('Workflow status:', status);
});

// Access team store (for React)
const useTeamStore = team.useStore();
const { agents, tasks, teamWorkflowStatus } = useTeamStore(state => ({
    agents: state.agents,
    tasks: state.tasks, 
    teamWorkflowStatus: state.teamWorkflowStatus
}));
```

## Task Orchestration Patterns

### Sequential Execution

Tasks execute one after another in defined order:

```javascript
const team = new Team({
    name: 'Sequential Team',
    agents: [agent1, agent2, agent3],
    tasks: [
        new Task({ description: 'First task', agent: agent1 }),
        new Task({ description: 'Second task', agent: agent2 }),
        new Task({ description: 'Third task', agent: agent3 })
    ]
});
```

### Dependency-Based Execution

Tasks execute based on dependencies:

```javascript
const tasks = [
    new Task({
        referenceId: 'data-collection',
        description: 'Collect raw data',
        agent: collector
    }),
    new Task({
        referenceId: 'data-processing', 
        description: 'Process collected data',
        agent: processor,
        dependencies: ['data-collection']
    }),
    new Task({
        referenceId: 'report-generation',
        description: 'Generate final report',
        agent: reporter,
        dependencies: ['data-processing']
    })
];
```

### Parallel Execution

Tasks run simultaneously when dependencies are met:

```javascript
const tasks = [
    new Task({
        referenceId: 'load-data',
        description: 'Load dataset',
        agent: loader
    }),
    new Task({
        referenceId: 'validate-a',
        description: 'Validate dataset A',
        agent: validator,
        dependencies: ['load-data'],
        allowParallelExecution: true
    }),
    new Task({
        referenceId: 'validate-b', 
        description: 'Validate dataset B',
        agent: validator,
        dependencies: ['load-data'],
        allowParallelExecution: true
    }),
    new Task({
        referenceId: 'merge-results',
        description: 'Merge validation results',
        agent: merger,
        dependencies: ['validate-a', 'validate-b']
    })
];
```

## Memory and Context Management

### Memory Configuration

```javascript
const team = new Team({
    // ... other config
    memory: true,  // All task results available to subsequent tasks (default)
    // memory: false, // Only explicitly referenced results available  
});
```

**Memory Enabled (default):**
- Tasks have access to full workflow history
- Better for complex workflows requiring context
- Uses more tokens due to additional context

**Memory Disabled:**
- Tasks operate in isolation
- Only explicit task results (`{taskResult:taskN}`) passed
- Better for independent tasks or minimizing token usage

## Workflow States and Status

### Task States
- `TODO`: Queued for processing
- `DOING`: Actively being worked on
- `BLOCKED`: Halted due to dependencies/obstacles  
- `REVISE`: Requires review based on feedback
- `AWAITING_VALIDATION`: Completed but needs validation
- `VALIDATED`: Validated and approved
- `DONE`: Fully completed

### Workflow States
- `INITIAL`: Not started
- `RUNNING`: Currently executing
- `PAUSED`: Temporarily halted
- `BLOCKED`: Waiting for intervention
- `FINISHED`: Completed successfully
- `ERRORED`: Encountered error

## Best Practices for Agentic Workflows

### Agent Design
1. **Single Responsibility**: Each agent should have one clear purpose
2. **Clear Goals**: Define specific, measurable objectives
3. **Appropriate Tools**: Equip agents with necessary capabilities
4. **Complementary Roles**: Design agents that work well together

### Task Design  
1. **Clear Instructions**: Provide detailed descriptions of required work
2. **Explicit Dependencies**: Define task relationships clearly
3. **Expected Outputs**: Specify format and content of results
4. **Parallel-Safe**: Mark independent tasks for parallel execution

### Team Coordination
1. **Logical Flow**: Organize tasks in logical sequence
2. **Error Handling**: Plan for blocked/failed states
3. **Context Management**: Choose appropriate memory settings
4. **Monitoring**: Set up status change listeners

### Example: Complete Workflow Architecture

```javascript
import { Agent, Task, Team } from 'kaibanjs';

// Define specialized agents
const researcher = new Agent({
    name: 'ResearchAgent',
    role: 'Information Researcher', 
    goal: 'Gather comprehensive data on assigned topics',
    background: 'Expert in data collection and source verification'
});

const analyst = new Agent({
    name: 'AnalysisAgent',
    role: 'Data Analyst',
    goal: 'Process and analyze collected information',
    background: 'Statistical analysis and pattern recognition specialist'
});

const writer = new Agent({
    name: 'WriterAgent', 
    role: 'Technical Writer',
    goal: 'Create clear, actionable reports from analysis',
    background: 'Expert in technical documentation and communication'
});

// Define coordinated tasks
const tasks = [
    new Task({
        referenceId: 'research',
        description: 'Research topic: {subject}. Gather data from multiple sources.',
        expectedOutput: 'Structured research data with source citations',
        agent: researcher
    }),
    new Task({
        referenceId: 'analysis',
        description: 'Analyze research data: {taskResult:task1}. Identify patterns and insights.',
        expectedOutput: 'Analysis results with key findings and statistical summary',
        agent: analyst,
        dependencies: ['research']
    }),
    new Task({
        referenceId: 'report',
        description: 'Create comprehensive report using: {taskResult:task2}',
        expectedOutput: 'Executive report with recommendations in markdown format',
        agent: writer,
        dependencies: ['analysis'],
        isDeliverable: true
    })
];

// Create coordinated team
const researchTeam = new Team({
    name: 'Research Analysis Team',
    agents: [researcher, analyst, writer],
    tasks: tasks,
    inputs: { 
        subject: 'Market trends in AI automation' 
    },
    memory: true,
    insights: `
        Research Standards:
        - Use peer-reviewed sources when possible
        - Include confidence levels in statistical analysis  
        - Format reports for executive consumption
        - Focus on actionable recommendations
    `,
    env: {
        OPENAI_API_KEY: process.env.OPENAI_API_KEY
    }
});

// Execute workflow with monitoring
researchTeam.onWorkflowStatusChange((status) => {
    console.log(`Workflow status: ${status}`);
});

researchTeam.start()
    .then(output => {
        console.log('Research completed:', output.result);
        console.log('Performance stats:', output.stats);
    })
    .catch(error => {
        console.error('Workflow error:', error);
    });
```

This architecture provides:
- **Clear separation of concerns** across agents
- **Logical task dependencies** ensuring proper execution order  
- **Result passing** between coordinated tasks
- **Shared context** through team insights and memory
- **Monitoring capabilities** for workflow management
- **Error handling** for robust execution