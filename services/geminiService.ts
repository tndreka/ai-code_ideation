
import { GoogleGenAI, Chat } from "@google/genai";
import type { AnalysisScope, UploadedFile } from '../types';

const API_KEY = process.env.API_KEY;

let ai: GoogleGenAI | null = null;
if (API_KEY) {
  ai = new GoogleGenAI({ apiKey: API_KEY });
} else {
  console.error("API_KEY environment variable not found. Gemini API calls will fail.");
}

let activeChatSession: Chat | null = null;

interface StreamHandlers {
  onChunkReceived: (chunkText: string) => void;
  onStreamComplete: () => void;
  onStreamError: (error: Error) => void;
}

const formatCodeForPrompt = (source: UploadedFile[] | string): string => {
  if (typeof source === 'string') {
    return `
\`\`\`
${source}
\`\`\`
`;
  } else if (Array.isArray(source) && source.length > 0) {
    let projectCode = "This project consists of the following files:\n\n";
    for (const file of source) {
      projectCode += `// --- File: ${file.path} ---\n`;
      projectCode += `${file.content}\n`;
      projectCode += `// --- End File: ${file.path} ---\n\n`;
    }
    return projectCode;
  }
  return "No code or files provided for analysis.";
};

const getBaseSystemPrompt = (analysisTypeName: string): string => {
  return `
You are an expert AI assistant acting as a helpful, senior software architect and mentor.
You are performing a ${analysisTypeName} for the user.
Your goal is to provide insightful, specific, and actionable feedback on the provided code/project, helping the user understand how to improve it and explore new ideas, aligned with the specified analysis focus and any provided project context.
Maintain this persona and focus throughout the conversation.
When the user asks follow-up questions, refer to the initial code, provided project context, and your previous suggestions if relevant.
Be concise in follow-ups unless asked for detailed explanations.
Your initial response should be a comprehensive analysis as requested. For follow-up questions, provide more targeted and concise answers unless detail is specifically requested.
`;
};

const getFullInitialUserMessagePrompt = (
    formattedCode: string,
    languageInstruction: string,
    analysisFocusInstruction: string,
    projectContextInstruction: string,
    multiFileInstruction: string,
    analysisTypeName: string,
    formattingInstructionsForSuggestions: string,
    formattingInstructionsForMermaid: string
): string => {
    return `
I need a comprehensive ${analysisTypeName}. Please analyze the code/project provided below.

${languageInstruction}

My primary analysis focus is:
${analysisFocusInstruction}

${projectContextInstruction}

${multiFileInstruction ? `\n${multiFileInstruction}\n` : ''}

${formattingInstructionsForSuggestions}

${formattingInstructionsForMermaid}

Here is the code/project to analyze:
${formattedCode}

Please provide your initial comprehensive analysis now. Structure your feedback using markdown, with headings and bullet points for clarity.
`;
}

const getFormattingInstructionsForSuggestions = (multiFileSupportEnabled: boolean): string => {
    return `
**Formatting Specific Code Suggestions:**
When you identify a specific part of the code (a few lines, a function, a block) that can be improved or for which you have a concrete suggestion, **you MUST format your feedback for that part as follows, using these exact markers**:

\`[[SUGGESTION_START]]\`
${multiFileSupportEnabled ? `\`FILE_PATH: [path/to/file.ext]\` (The full path of the file, e.g., \`FILE_PATH: src/utils/helpers.js\`)` : ''}
\`LINE_NUMBERS: [start_line]-[end_line]\` (e.g., \`LINE_NUMBERS: 10-15\` or \`LINE_NUMBERS: 23-23\`. Use the actual line numbers from the input code within that specific file.)
\`TITLE: [A brief, descriptive title for your suggestion]\`
\`DESCRIPTION: [Your detailed explanation, observation, or rationale for the change. You can use Markdown formatting (like lists, bolding, inline code) within this description.]\`
\`ORIGINAL_CODE_SNIPPET: [OPTIONAL - If helpful, include the original snippet using a Markdown code block. Try to match the detected language.]\`
\` \`\`\`[lang]\`
\` // original code snippet here \`
\` \`\`\` \`
\`SUGGESTED_CODE_SNIPPET: [OPTIONAL - If you are proposing a direct code change, include your suggested snippet using a Markdown code block. Try to match the detected language.]\`
\` \`\`\`[lang]\`
\` // suggested code snippet here \`
\` \`\`\` \`
\`[[SUGGESTION_END]]\`

Ensure each field (FILE_PATH, LINE_NUMBERS, TITLE, DESCRIPTION, etc.) is on its own line. The FILE_PATH line is ONLY required if multiple files were provided for analysis.
`;
};

const getFormattingInstructionsForMermaid = (): string => {
    return `
**Optional Architecture/Component Diagram:**
If your analysis benefits from a visual representation of the system architecture, component interactions, or data flow, you MAY provide a diagram using **Mermaid.js graph syntax**.
Enclose the Mermaid.js code block within these exact markers:
\`[[MERMAID_DIAGRAM_START]]\`
\`TITLE: [A brief, descriptive title for your diagram, e.g., "Component Interaction Diagram"]\`
\` \`\`\`mermaid
graph TD
    NodeA["Text for Node A"] --> NodeB("Text for Node B");
    %% Comments are best on their own lines.
    NodeB --> NodeC{"Decision C?"};
    NodeC -- "Option 1" --> NodeD(("Result D"));
    NodeC -- "Option 2" --> NodeE["Final Step E"];
\` \`\`\`
\`[[MERMAID_DIAGRAM_END]]\`

The TITLE line must come immediately after \`[[MERMAID_DIAGRAM_START]]\`.

**Overall Mermaid Strategy:** 
*   Keep diagrams simple and clear. When in doubt, adhere closely to the structure of the basic example provided (NodeA --> NodeB; etc.). 
*   Favor clarity and correctness over complex diagrammatic features. 
*   **If Unsure, SIMPLIFY or OMIT:** If you are not confident about the syntax for a complex diagrammatic feature, it is MUCH better to provide a simpler, valid diagram or even omit the diagram entirely for this turn, rather than providing invalid syntax. Focus on basic node connections (A --> B).
*   **If Unsure, QUOTE IT:** For node text or IDs, if there's any doubt if it needs quotes (spaces, special chars, starts with number), **USE DOUBLE QUOTES**.
*   Before finalizing your diagram, mentally review your Mermaid code against the 'Common Pitfalls' listed below to ensure validity.

**Important Syntax Notes for Mermaid:**
*   Use standard ASCII characters for all Mermaid syntax.
*   Node IDs should typically be simple identifiers (e.g., \`node1\`, \`userService\`).
*   Node Text inside shapes (e.g., \`A[Node Text]\`, \`B(Node Text)\`) **MUST** be enclosed in double quotes if it contains spaces, any special characters (parentheses, slashes, hyphens, etc.), or starts with numbers. For example: \`A["User Input (Code/Files)"]\`, \`B["1. Initial Step"]\`. **When in doubt, quote your node text.**
*   Semicolons are often optional if a statement is followed by a newline.
*   Comments: Start with \`%%\`. **STRONGLY RECOMMENDED to place comments on their own separate lines.**
*   Only include valid and complete Mermaid.js syntax. Keep diagrams concise.


**Common Pitfalls to Avoid in Mermaid Syntax:**
*   **Unterminated Node Definitions:** Ensure all shapes (\`()\`, \`[]\`, \`{}\`, etc.) and their text content are correctly defined and *fully* closed.
    *   Example: \`A["Node A Text"]\` is correct. \`A["Node A Text\` (missing closing \`"]\`) or \`A[\` (missing text and closing bracket) is **incorrect**.
    *   Specifically for round nodes: \`B("Node B Text")\` is correct. \`B(\` (missing text and parenthesis) or \`B("Node B Text\` (missing closing parenthesis) is **incorrect**.
    *   Do NOT add extraneous characters (like numbers or random letters) immediately after a closed node definition on the same line (e.g., \`A["Node"] 1\` is **incorrect**). The next item should be a semicolon, a new link, or a newline.
*   **Invalid Characters in Node IDs:** Unquoted IDs shouldn't have spaces/special chars. If needed, use double quotes for IDs: \`"My Node ID"["My Node Text"]\`. Prefer simple alphanumeric IDs.
*   **Complex Node Text/Labels (Reiteration):** Avoid special Markdown characters *within node labels*. Stick to plain text or use double quotes for complex labels (e.g., \`N["Label with (parentheses) and /slashes/"]\`). If starting labels with numbers or symbols, **YOU MUST USE QUOTES**: \`A["1. First Step"]\`.
*   **Incorrect Commenting:** Ensure comments start with \`%%\` and **STRONGLY prefer new lines**. Comments (\`%%\`) **MUST ALWAYS** be placed on their own separate lines. **CRITICAL: DO NOT** place comments on the same line immediately after a semicolon (\`;\`). This is a very common cause of parsing errors and must be avoided.
*   **Incomplete Links/Dangling Arrows:** Every arrow must be fully formed (e.g., \`A --> B\`, \`C --- D\`) and connect two defined nodes. Avoid incomplete links like \`A --> \` or \`B -- \` or \`X - Y\`. After forming a complete arrow (e.g., \`-->\`), ensure a valid node ID or definition follows. Do not leave an arrow hanging or follow it with text that is not a node. Every arrow (e.g., \`-->\`, \`---\`) **must** be immediately followed by a valid node ID or node definition to complete the link. Do not end a line or the diagram with an incomplete arrow (e.g., \`A --> \` is **incorrect**).
*   **Link Text Formatting:** Link text, if used directly on the arrow, *must* be enclosed in pipes and be complete: \`A -->|"This is Link Text"| B\`. Incomplete forms like \`A -->|Text\` (missing closing \`|\`) or \`A -->|\` (missing text and closing \`|\`) are **incorrect**. Ensure the text itself within the pipes is also valid (e.g., quoted if complex).
*   **Subgraph Endings:** The \`end\` keyword to close a \`subgraph\` should ideally be on its own line or the last item on a line before a newline. Do not follow \`end\` with unrelated characters or malformed comments on the same line.
*   **General Cleanliness:** Avoid extraneous characters or text immediately after valid syntax elements (like node definitions, links, or keywords like \`end\` for subgraphs). For example, after \`A["Node Text"]\`, do not put stray numbers or text on the same line unless it's a new valid element (like a link \`--> C\`), a semicolon, or a comment on a new line.
*   **Link Definitions**: Ensure links connect valid nodes. Avoid extraneous characters (like numbers or stray text) immediately after a node name or an arrow in a link definition unless it's properly formatted link text (e.g., \`A -- "Link Text" --> B\` or \`A -->|"Link Text"| B\`). After fully defining a node (e.g., \`A["Node Text"]\`) or a link (e.g., \`A --> B\` or \`A -- "Link Text" --> B\`), do NOT place any stray characters (like numbers or random letters) on the same line immediately following it. The next item should be a semicolon, a new valid Mermaid element, or a newline.
*   **Style Directives**: If using \`style\` directives, they must be complete and correct. Example: \`style nodeId fill:#f9f,stroke:#333,stroke-width:2px\`. Ensure you specify a valid node ID and valid style attributes. If a style line is started (e.g., \`style nodeId\`), it must be followed by valid attributes, not just a newline. **It is often safer to use default styling or omit complex \`style\` directives if unsure.**
`;
};


const handleError = (error: any, onStreamError: (error: Error) => void, context?: string) => {
    console.error(`Error ${context || 'calling Gemini API or during streaming'}:`, error);
    let errorMessage = `An unknown error occurred ${context || 'during AI analysis'}. Check the console.`;
    if (error instanceof Error) {
      if (error.message.toLowerCase().includes("api key not valid") || error.message.toLowerCase().includes("permission denied")) {
        errorMessage = "Error: Invalid or unauthorized API Key. Please ensure the API_KEY environment variable is correctly configured and has the necessary permissions.";
      } else if (error.message.toLowerCase().includes("quota") || error.message.toLowerCase().includes("resource has been exhausted")) {
        errorMessage = "Error: API quota exceeded. Please check your Gemini API usage and limits.";
      } else {
        errorMessage = `Error ${context || 'during AI analysis'}: ${error.message}.`;
      }
    }
    onStreamError(new Error(errorMessage));
};


export const initiateReviewAndChat = async (
  source: UploadedFile[] | string,
  handlers: StreamHandlers,
  languageHint?: string,
  analysisScope: AnalysisScope = 'general_ideation',
  framework?: string,
  projectGoals?: string,
  ignorePatterns?: string // Raw text of patterns used for filtering, for AI context
): Promise<void> => {
  const { onChunkReceived, onStreamComplete, onStreamError } = handlers;

  if (!ai) {
    onStreamError(new Error("AI Service not initialized. Please ensure API_KEY is configured."));
    return;
  }

  const codeToAnalyze = formatCodeForPrompt(source);
  if (codeToAnalyze === "No code or files provided for analysis.") {
     onStreamError(new Error("No code or files provided for analysis. Some files might have been filtered by ignore patterns."));
     return;
  }

  let languageDetectionInstruction = `
1.  **Language Detection:**
    *   Analyze the provided code snippet(s) and identify its primary programming language(s).
    *   If multiple files are present and they use different primary languages (e.g., Python backend, JavaScript frontend), note this.
    *   Begin your response by clearly stating the detected language(s), for example: "Detected Language(s): Python, JavaScript (HTML/CSS)".
    *   If the code is too short, ambiguous, or appears to be plain text/data, state that you couldn't confidently determine a specific programming language.`;

  if (languageHint && languageHint !== 'auto') {
    languageDetectionInstruction = `
1.  **Language Guidance:**
    *   The user has indicated the code is likely written in or related to **${languageHint}**. Please prioritize your analysis based on this language.
    *   Begin your response by confirming this guidance, for example: "Language Hint Provided: ${languageHint}". If the code clearly seems to be a different language, you may note this discrepancy respectfully.`;
  }

  let analysisFocusInstruction = "";
  let analysisTypeName = "General Ideation";

  switch (analysisScope) {
    case 'performance':
      analysisTypeName = "Performance Review";
      analysisFocusInstruction = `
  **Analysis Focus: Performance Review**
  Concentrate on identifying performance bottlenecks, inefficient algorithms, or data structures.
  Suggest optimizations for loops, resource usage (CPU, memory), and potential concurrency improvements.
  Provide actionable advice with clear explanations of the expected performance impact. Consider aspects like Big O notation if applicable.`;
      break;
    case 'security':
      analysisTypeName = "Security Audit";
      analysisFocusInstruction = `
  **Analysis Focus: Security Audit**
  Conduct a security audit of the code. Identify potential vulnerabilities such as:
  - Injection flaws (e.g., SQL injection, Cross-Site Scripting (XSS), command injection)
  - Broken authentication or authorization mechanisms
  - Sensitive data exposure (e.g., hardcoded secrets, improper encryption)
  - Insecure deserialization, security misconfigurations, use of components with known vulnerabilities.
  Explain the risks associated with identified vulnerabilities and suggest specific, actionable mitigations or best practices.`;
      break;
    case 'design_patterns':
      analysisTypeName = "Design Pattern Analysis";
      analysisFocusInstruction = `
  **Analysis Focus: Design Pattern Analysis**
  Analyze the code for opportunities to apply or improve the use of common software design patterns.
  Explain how these patterns could enhance aspects like maintainability, flexibility, reusability, or scalability.
  If patterns seem to be in use, comment on their effectiveness and potential refinements.`;
      break;
    case 'feature_brainstorming':
      analysisTypeName = "Feature Brainstorming";
      analysisFocusInstruction = `
  **Analysis Focus: Feature Brainstorming**
  Based on the existing codebase and its apparent purpose, brainstorm innovative new features, enhancements, or potential use cases.
  Think creatively about how this code could be extended or repurposed. Provide a few well-developed ideas.`;
      break;
    case 'general_ideation':
    default:
      analysisTypeName = "General Ideation (Comprehensive Review)";
      analysisFocusInstruction = `
  **Analysis Focus: General Ideation (Comprehensive Review)**
  Provide a comprehensive review covering: Conceptual Improvements, Code Structure, Readability, Design, Feature Enhancements, Modernization, Efficiency, Security Considerations, Maintainability, Scalability, and Error Handling.
  When discussing 'Code Structure', 'Design', or overall system architecture aspects, consider if a simple Mermaid.js diagram could visually represent relationships, component interactions, or data flows to enhance clarity.`;
      break;
  }

  let projectContextInstruction = `
**Project Context & Configuration:**
Framework: ${framework || 'Not specified'}
User's Project Goals: ${projectGoals || 'Not specified'}
User-defined Ignore Patterns (files matching these were excluded by the user before sending for analysis):
${ignorePatterns ? ignorePatterns.split('\n').map(p => `- ${p.trim()}`).join('\n') : 'None specified'}

Please tailor your analysis, suggestions, and examples to this context.
For instance, if a framework is specified, provide framework-specific advice where appropriate.
If project goals are mentioned, align your feedback to help achieve them.
`;
  if (!framework && !projectGoals && !ignorePatterns) {
    projectContextInstruction = "**Project Context & Configuration:** No specific context provided by the user.";
  }


  const multiFileInputInstruction = typeof source !== 'string' && source.length > 0 ?
    `The project includes multiple files. When your suggestion applies to a specific part of a particular file, you **MUST** specify the file's path using a \`FILE_PATH: [path/to/file.ext]\` line just before the \`LINE_NUMBERS:\` line.` :
    "";
  
  const suggestionFormatting = getFormattingInstructionsForSuggestions(typeof source !== 'string' && source.length > 0);
  const mermaidFormatting = getFormattingInstructionsForMermaid();

  const systemInstruction = getBaseSystemPrompt(analysisTypeName);
  const initialUserMessage = getFullInitialUserMessagePrompt(
      codeToAnalyze,
      languageDetectionInstruction,
      analysisFocusInstruction,
      projectContextInstruction,
      multiFileInputInstruction,
      analysisTypeName,
      suggestionFormatting,
      mermaidFormatting
  );
  
  const modelName = "gemini-2.5-flash-preview-04-17";

  try {
    activeChatSession = ai.chats.create({
      model: modelName,
      config: {
        systemInstruction: systemInstruction,
      }
    });

    const responseStream = await activeChatSession.sendMessageStream({ message: initialUserMessage });

    for await (const chunk of responseStream) {
      onChunkReceived(chunk.text);
    }
    onStreamComplete();

  } catch (error: any) {
    handleError(error, onStreamError, "initiating review");
    activeChatSession = null; 
  }
};

export const sendFollowUpMessage = async (
  message: string,
  handlers: StreamHandlers
): Promise<void> => {
  const { onChunkReceived, onStreamComplete, onStreamError } = handlers;

  if (!ai) {
    onStreamError(new Error("AI Service not initialized. Please ensure API_KEY is configured."));
    return;
  }
  if (!activeChatSession) {
    onStreamError(new Error("Chat session not active. Please start a new review first."));
    return;
  }
  if (!message.trim()) {
    onStreamComplete(); 
    return;
  }

  try {
    const responseStream = await activeChatSession.sendMessageStream({ message });
    for await (const chunk of responseStream) {
      onChunkReceived(chunk.text);
    }
    onStreamComplete();
  } catch (error: any) {
    handleError(error, onStreamError, "sending follow-up");
  }
};

export const clearActiveChatSession = (): void => {
  activeChatSession = null;
  console.log("Active chat session cleared.");
};
