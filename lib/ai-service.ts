import { GoogleGenAI } from "@google/genai";
import { UserFunction, DbConnection, HostImage } from "./types";

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

export const generateScriptAssistResponse = async (prompt: string, content: string, variablesJson: string, functions: UserFunction[]) => {
    const context = `Current Content:\n${content}\n\n${getCommonContext(variablesJson, functions)}`;
    const systemInstruction = `You are a JavaScript expert. The user is writing a script to manipulate the context variables.
    The script has access to 'ctx' (the variables object) and a 'log' function.
    
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