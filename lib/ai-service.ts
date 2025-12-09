import { GoogleGenAI, Type, FunctionDeclaration } from "@google/genai";
import { UserFunction, DbConnection, HostImage, ApiSource, AgentConfig } from "./types";
import { interpolateString } from "./utils";

const commonInstruction = `
    IMPORTANT SYNTAX RULES (STRICT HANDLEBARS):
    1. DO NOT use Pipe syntax (Liquid/Shopify) like '{{ value | filter }}'. THIS WILL CAUSE ERRORS.
    2. Use standard Handlebars subexpressions for helpers: '{{ last (split user.name " ") }}'.
    3. Use provided logical helpers for booleans: eq, ne, gt, lt, and, or, not.
       Example: '{{#if (eq user.role "admin") }} ... {{/if}}'
    4. Custom Functions:
       - For inline value injection: '{{#func:myFunc(arg1, arg2)}}' (Special preprocessor syntax).
       - For boolean logic inside IF: '{{#if (func 'myFunc' arg1) }} ... {{/if}}'.
       - DO NOT use the '#func:...' syntax as a block helper (e.g. {{#func:..}}..{{/func}} is INVALID).
    5. Available helpers: split, join, first, last, uppercase, func, eq, ne, gt, lt, and, or, not.
`;

const getCommonContext = (variablesJson: string, functions: UserFunction[]) => {
    const funcs = functions.map(f => `${f.name}(${f.params.join(',')})`).join('; ');
    return `Available Variables (JSON): ${variablesJson}\nAvailable Functions: ${funcs}`;
};

const handleAiAssist = async (systemInstruction: string, prompt: string, context: string): Promise<string> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Context:\n${context}\n\nUser Request: ${prompt}`,
            config: {
                systemInstruction: systemInstruction,
            }
        });
        return response.text || "No response generated.";
    } catch (e: any) {
        console.error("AI Error", e);
        return `Error generating response: ${e.message}`;
    }
};

export const generateJsonAssistResponse = async (prompt: string, content: string, variablesJson: string, functions: UserFunction[]) => {
    const context = `Current Content:\n${content}\n\n${getCommonContext(variablesJson, functions)}`;
    const systemInstruction = `You are a JSON expert assisting a developer in a specialized JSON editor.
    The editor supports Handlebars syntax (e.g., {{ user.id }}) and custom helper functions.
    
    ${commonInstruction}
    
    Your goal is to help the user write, debug, or understand the JSON template.
    If providing code updates, provide the specific JSON snippet wrapped in a markdown code block (e.g. \`\`\`json ... \`\`\`).
    Be concise and helpful.`;

    return handleAiAssist(systemInstruction, prompt, context);
};

export const generateYamlAssistResponse = async (prompt: string, content: string, variablesJson: string, functions: UserFunction[]) => {
    const context = `Current Content:\n${content}\n\n${getCommonContext(variablesJson, functions)}`;
    const systemInstruction = `You are a YAML expert assisting a developer in a specialized YAML editor.
    The editor supports Handlebars syntax (e.g., {{ user.id }}) and custom helper functions.
    
    ${commonInstruction}
    
    Your goal is to help the user write, debug, or understand the YAML template.
    If providing code updates, provide the specific YAML snippet wrapped in a markdown code block (e.g. \`\`\`yaml ... \`\`\`).
    Be concise and helpful.`;

    return handleAiAssist(systemInstruction, prompt, context);
};

export const generateHtmlAssistResponse = async (prompt: string, content: string, variablesJson: string, functions: UserFunction[], hostImages: HostImage[] = []) => {
    let imagesContext = "";
    if (hostImages && hostImages.length > 0) {
        imagesContext = `\n\nAvailable Hosted Images (Use these names): \n${hostImages.map(img => `- ${img.name}`).join('\n')}`;
    }
    
    const context = `Current Content:\n${content}\n\n${getCommonContext(variablesJson, functions)}${imagesContext}`;
    const systemInstruction = `You are an HTML Email expert. The user is working on an HTML email template that supports Handlebars syntax.
    Use table-based layouts for email compatibility and inline CSS.
    
    ${commonInstruction}

    You may be provided with a list of "Available Hosted Images". 
    If the user asks for an image that matches one of these (e.g. "logo"), DO NOT use the URL directly.
    Instead, use the Handlebars syntax: \`<img src="{{ images.[Image Name] }}" ... />\`.
    Example: If image name is 'Company Logo', use \`src="{{ images.[Company Logo] }}"\`.
    
    Your goal is to help the user write responsive, client-compatible email HTML.
    If providing code, provide the full HTML snippet or the specific table structure needed.
    ALWAYS wrap your code in a markdown code block (e.g. \`\`\`html ... \`\`\`).`;

    return handleAiAssist(systemInstruction, prompt, context);
};

export const generateSmsAssistResponse = async (prompt: string, content: string, variablesJson: string, functions: UserFunction[]) => {
    const context = `Current Content:\n${content}\n\n${getCommonContext(variablesJson, functions)}`;
    const systemInstruction = `You are an SMS marketing expert. The user is writing an SMS message using Handlebars syntax.
    
    ${commonInstruction}
    
    Your goal is to help the user write concise, effective SMS messages.
    Keep messages short (under 160 chars is ideal, but concatenated is fine).
    Avoid complex HTML.
    ALWAYS wrap your code in a markdown code block (e.g. \`\`\`text ... \`\`\`).`;

    return handleAiAssist(systemInstruction, prompt, context);
};

export const generateScriptAssistResponse = async (prompt: string, content: string, variablesJson: string, functions: UserFunction[]) => {
    const context = `Current Content:\n${content}\n\n${getCommonContext(variablesJson, functions)}`;
    const systemInstruction = `You are a JavaScript expert. The user is writing a script to transform data.
    The script has access to 'input' (the variables object) and a 'log' function.
    The script MUST return a value (object, array, or primitive) which will be the result.
    
    Your goal is to help the user write logic to transform data.
    If providing code, provide valid JavaScript code that fits within the script environment.
    ALWAYS wrap your code in a markdown code block (e.g. \`\`\`javascript ... \`\`\`).`;

    return handleAiAssist(systemInstruction, prompt, context);
};

export const generateSqlAssistResponse = async (prompt: string, content: string, variablesJson: string, functions: UserFunction[], activeConnection?: DbConnection) => {
    const dialect = activeConnection?.dialect || 'postgres';
    const context = `Current Content:\n${content}\n\n${getCommonContext(variablesJson, functions)}`;

    const systemInstruction = `You are a SQL expert. The user is writing a SQL query for a ${dialect} database.
    The query supports Handlebars syntax for dynamic values (e.g. {{ user.id }}).
    
    ${commonInstruction}
    
    Your goal is to help the user write efficient and correct SQL queries.
    If providing code, provide the specific SQL query.
    ALWAYS wrap your code in a markdown code block (e.g. \`\`\`sql ... \`\`\`).`;

    return handleAiAssist(systemInstruction, prompt, context);
};

export const generateXmlAssistResponse = async (prompt: string, content: string, variablesJson: string, functions: UserFunction[]) => {
    const context = `Current Content:\n${content}\n\n${getCommonContext(variablesJson, functions)}`;
    const systemInstruction = `You are an XML expert. The user is working on an XML template that supports Handlebars syntax.
    
    ${commonInstruction}
    
    Your goal is to help the user structure XML data correctly.
    If providing code, provide the specific XML snippet.
    ALWAYS wrap your code in a markdown code block (e.g. \`\`\`xml ... \`\`\`).`;

    return handleAiAssist(systemInstruction, prompt, context);
};

export const generateRestAssistResponse = async (prompt: string, variablesJson: string, functions: UserFunction[], apiSources: ApiSource[] = []) => {
    // 1. Summarize Sources and their Tags (Entities)
    // We only send the list of tags initially to keep the context small.
    const sourceSummaries = apiSources.map(s => {
        const tags = new Set<string>();
        if (s.spec && s.spec.paths) {
            Object.values(s.spec.paths).forEach((methods: any) => {
                if (typeof methods === 'object') {
                    Object.values(methods).forEach((op: any) => {
                        if (op && op.tags && Array.isArray(op.tags)) {
                            op.tags.forEach((t: string) => tags.add(t));
                        }
                    });
                }
            });
        }
        const tagList = Array.from(tags).sort();
        const limitedTags = tagList.slice(0, 100).join(', ') + (tagList.length > 100 ? '...' : '');
        return `Source: "${s.name}" (BaseURL: ${s.baseUrl})\nAvailable Entities (Tags): ${limitedTags || 'None (check paths)'}`;
    }).join('\n\n');

    const commonContext = getCommonContext(variablesJson, functions);
    const context = `${commonContext}\n\nAvailable API Sources Summary:\n${sourceSummaries}`;

    const systemInstruction = `You are a REST API expert. The user is building API requests in a client similar to Postman.
    
    ${commonInstruction}

    You have access to a tool 'get_endpoints_by_tag' to look up detailed API definitions.
    
    Protocol:
    1. Analyze the user's request and the 'Available API Sources Summary'.
    2. Identify the relevant API Source and the Entity (Tag) that likely contains the desired endpoint.
    3. Call 'get_endpoints_by_tag(source_name, tag)' to retrieve the full specification for that entity.
    4. The tool output will return the 'baseUrl' and the paths.
    5. Use the retrieved spec (including schemas/definitions) to construct the final JSON request configuration.

    To configure the entire request (method, url, body, params), output a JSON object wrapped in \`\`\`json\`\`\`:
    {
      "method": "POST",
      "url": "https://api.example.com/resource/{id}", // Use brackets {} for path parameters.
      "pathParams": { "id": "{{ user.id }}" }, // Define values for path parameters here.
      "params": { "q": "search term" }, // Query parameters (Key-Value pairs)
      "headers": { "Content-Type": "application/json" },
      "body": { ... }
    }

    IMPORTANT STRICT RULE FOR PARAMETERS AND HEADERS:
    - KEYS must be plain, static strings (e.g. "userId", "Authorization", "q"). 
    - NEVER put a Handlebars variable (e.g. {{ user.id }}) in the KEY.
    - If you need a dynamic key, it is NOT supported.
    - VALUES can contain Handlebars variables.
    
    URL Handling:
    - If the URL has path parameters, use the standard notation \`{paramName}\` in the URL string.
    - DO NOT inject handlebars variables directly into the URL path like \`.../{{user.id}}\`.
    - Instead, use \`.../{id}\` and map it in "pathParams": \`{ "id": "{{ user.id }}" }\`.
    
    INCORRECT:
    "url": "https://api.com/users/{{ user.id }}"
    
    CORRECT:
    "url": "https://api.com/users/{id}",
    "pathParams": { "id": "{{ user.id }}" }

    INCORRECT:
    "params": { "{{ user.id }}": "123" }  <-- WRONG: Variable in key
    "headers": { "{{ token }}": "Bearer ..." } <-- WRONG
    
    CORRECT:
    "params": { "id": "{{ user.id }}" } <-- RIGHT: Variable in value
    "headers": { "Authorization": "Bearer {{ token }}" } <-- RIGHT

    If you only want to set the Body, wrap the JSON body in \`\`\`json\`\`\`.
    If you only want to set the URL, wrap the URL in \`\`\`text\`\`\`.

    IMPORTANT:
    - You MUST use the exact paths from the tool output.
    - The tool output contains the 'baseUrl'. You MUST prepend this to the path to form the full URL.
    - Do not guess paths. If you are unsure, search for the tag that seems most relevant.
    - Concatenate the Base URL and the Endpoint Path correctly.
    - If the tool returns definitions/components to resolve refs, use them.

    Your goal is to help the user construct URL parameters, headers, or body content.`;

    const getEndpointsTool: FunctionDeclaration = {
        name: 'get_endpoints_by_tag',
        description: 'Get detailed endpoint specifications (paths and definitions) for a specific tag/entity in an API source.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                source_name: { type: Type.STRING, description: 'The exact name of the API source from the summary.' },
                tag: { type: Type.STRING, description: 'The tag name to look up.' }
            },
            required: ['source_name', 'tag']
        }
    };

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const chat = ai.chats.create({
        model: 'gemini-2.5-flash',
        config: {
            systemInstruction,
            tools: [{ functionDeclarations: [getEndpointsTool] }]
        }
    });

    try {
        let result = await chat.sendMessage({
            message: `Context:\n${context}\n\nUser Request: ${prompt}`
        });

        // Loop for tool calls (max 3 turns)
        for (let i = 0; i < 3; i++) {
             const call = result.functionCalls?.[0];
             if (!call) break;

             if (call.name === 'get_endpoints_by_tag') {
                 const { source_name, tag } = call.args as any;
                 const source = apiSources.find(s => s.name === source_name);
                 let toolResponse = { result: "Source not found or no spec available." };

                 if (source && source.spec && source.spec.paths) {
                     const relevantPaths: Record<string, any> = {};
                     
                     Object.entries(source.spec.paths).forEach(([path, methods]: [string, any]) => {
                         let keepPath = false;
                         const filteredMethods: Record<string, any> = {};
                         
                         if (methods) {
                             Object.entries(methods).forEach(([method, op]: [string, any]) => {
                                 // Check if tag matches
                                 if (op.tags && Array.isArray(op.tags) && op.tags.includes(tag)) {
                                     // Return full operation details to ensure schema/refs are preserved
                                     filteredMethods[method] = op;
                                     keepPath = true;
                                 }
                             });
                         }

                         if (keepPath) {
                             relevantPaths[path] = filteredMethods;
                         }
                     });
                     
                     if (Object.keys(relevantPaths).length > 0) {
                        let effectiveBaseUrl = source.baseUrl;
                        // Fallback logic: If baseUrl is empty, try to infer from specUrl (just-in-time calculation)
                        if (!effectiveBaseUrl && source.specUrl) {
                            try {
                                const u = new URL(source.specUrl);
                                effectiveBaseUrl = u.origin;
                                // Append Swagger 2.0 basePath if exists
                                if (source.spec.swagger === '2.0' && source.spec.basePath) {
                                    effectiveBaseUrl += source.spec.basePath;
                                }
                                effectiveBaseUrl = effectiveBaseUrl.replace(/\/$/, '');
                            } catch (e) {
                                // invalid specUrl, keep empty
                            }
                        }

                        // Include definitions/components to resolve refs
                        const partialSpec: any = {
                             baseUrl: effectiveBaseUrl,
                             paths: relevantPaths,
                             definitions: source.spec.definitions,
                             components: source.spec.components
                        };
                        toolResponse = { result: JSON.stringify(partialSpec) };
                     } else {
                        toolResponse = { result: `No endpoints found for tag '${tag}' in source '${source_name}'.` };
                     }
                 }

                 // Send the tool output back to the model
                 result = await chat.sendMessage({
                    message: [{
                        functionResponse: {
                            name: 'get_endpoints_by_tag',
                            id: call.id,
                            response: toolResponse
                        }
                    }]
                 });
             }
        }

        return result.text || "No response generated.";

    } catch (e: any) {
        console.error("AI Error", e);
        return `Error generating response: ${e.message}`;
    }
};

export const runAgentSimulation = async (
    config: AgentConfig, 
    userMessage: string, 
    variables: any, 
    functions: UserFunction[]
): Promise<string> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    try {
        // 1. Interpolate System Message
        let systemInstruction = "";
        try {
            systemInstruction = interpolateString(config.systemMessage, variables, functions);
        } catch (e) {
            systemInstruction = config.systemMessage; // Fallback
        }

        // 2. Prepare Tools (Function Declarations) - Only for connected tools
        // Note: MCP tools would be handled here in a real implementation
        /* 
        const tools = config.connectedTools
            .map(id => functions.find(f => f.id === id))
            .filter(Boolean)
            .map(f => ({
                name: f!.name,
                description: `Custom function: ${f!.name}`,
                parameters: {
                    type: Type.OBJECT,
                    properties: {
                        // Simply map params to generic string inputs for simulation
                        ...f!.params.reduce((acc, p) => ({ ...acc, [p]: { type: Type.STRING } }), {})
                    },
                    required: f!.params
                }
            }));
        */
       // Disabled real tool binding for simulation to avoid complex signature mapping for now

        // 3. Inject Structured Output Instructions if enabled
        const isStructuredOutput = config.outputParser === 'JSON' || config.outputParser === 'AUTO_FIX';
        if (isStructuredOutput) {
            if (config.structuredOutputMethod === 'SCHEMA') {
                systemInstruction += `\n\nRESPONSE FORMAT INSTRUCTIONS:\nYou must output valid JSON that strictly adheres to the following schema:\n${config.jsonSchemaDefinition}`;
            } else {
                systemInstruction += `\n\nRESPONSE FORMAT INSTRUCTIONS:\nYou must output valid JSON that follows this example structure:\n${config.structuredOutputExample}`;
            }
            systemInstruction += `\n\nIMPORTANT: Do not include markdown formatting (like \`\`\`json) in your response. Output raw JSON only.`;
        }
            
        // 4. Construct the prompt with Few-Shot Examples
        let fullSystemPrompt = systemInstruction;
        if (config.fewShotExamples.length > 0) {
            fullSystemPrompt += "\n\nExamples:\n" + config.fewShotExamples.map(ex => `User: ${ex.input}\nAgent: ${ex.output}`).join("\n\n");
        }

        // 5. Execution Loop (Auto-Repair)
        let attempts = 0;
        const maxAttempts = (isStructuredOutput && config.autoRepair) ? 3 : 1;
        
        // Initial conversation history
        const contents: any[] = [{ role: 'user', parts: [{ text: userMessage }] }];

        while (attempts < maxAttempts) {
            attempts++;

            const response = await ai.models.generateContent({
                model: config.modelId || 'gemini-2.5-flash',
                contents: contents,
                config: {
                    systemInstruction: fullSystemPrompt,
                    temperature: config.temperature,
                    maxOutputTokens: config.maxTokens,
                    topP: config.topP,
                    responseMimeType: (config.jsonMode || isStructuredOutput) ? "application/json" : "text/plain",
                }
            });

            const responseText = response.text || "No response generated.";

            // If not structured output, return immediately
            if (!isStructuredOutput) {
                return responseText;
            }

            // Validate JSON
            try {
                // Try parsing
                JSON.parse(responseText);
                // Valid JSON, return it
                return responseText;
            } catch (jsonError: any) {
                console.warn(`Attempt ${attempts} failed to parse JSON:`, jsonError.message);
                
                // If we reached max attempts, fail gracefully with error details
                if (attempts >= maxAttempts) {
                    return `Error: Failed to generate valid JSON after ${maxAttempts} attempts.\n\nLast Invalid Output:\n${responseText}\n\nParser Error: ${jsonError.message}`;
                }

                // Add failed exchange to history and retry with error feedback
                contents.push({ role: 'model', parts: [{ text: responseText }] });
                contents.push({ 
                    role: 'user', 
                    parts: [{ text: `SYSTEM ERROR: The previous output was not valid JSON. Parser Error: ${jsonError.message}.\n\nPlease fix the JSON syntax and output ONLY the valid JSON.` }] 
                });
                
                // Continue loop...
            }
        }

        return "Error: Unexpected execution state.";

    } catch (e: any) {
        console.error("Agent Simulation Error", e);
        return `Error executing agent: ${e.message}`;
    }
};

export const generateAgentAssistResponse = async (prompt: string, config: AgentConfig, variablesJson: string, functions: UserFunction[]) => {
    const context = `Current Config:\n${JSON.stringify(config, null, 2)}\n\n${getCommonContext(variablesJson, functions)}`;
    const systemInstruction = `You are an AI Agent Architect. The user is configuring an AI agent.
    
    Your goal is to help the user refine prompts, select models, or configure output schemas.
    If providing code/JSON, wrap it in markdown blocks.`;

    return handleAiAssist(systemInstruction, prompt, context);
};