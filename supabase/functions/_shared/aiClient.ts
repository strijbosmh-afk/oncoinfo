import { z } from "https://esm.sh/zod@3.25.76";

export { z };

const AI_GATEWAY_URL = "https://ai-gateway.vercel.sh/v1/chat/completions";

export class AIClientError extends Error {
  status: number;
  code: "rate_limited" | "payment_required" | "timeout" | "validation_failed" | "service_error";
  userMessage: string;

  constructor(
    message: string,
    options: {
      status?: number;
      code: AIClientError["code"];
      userMessage?: string;
    },
  ) {
    super(message);
    this.name = "AIClientError";
    this.status = options.status ?? 500;
    this.code = options.code;
    this.userMessage = options.userMessage ?? "AI service error";
  }
}

type AIMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
};

type AIRequest = {
  operation: string;
  apiKey: string;
  model?: string;
  messages: AIMessage[];
  tools?: unknown[];
  tool_choice?: unknown;
  stream?: boolean;
  timeoutMs?: number;
  retries?: number;
  temperature?: number;
};

type AIResponse = {
  choices?: Array<{
    message?: {
      content?: string;
      tool_calls?: Array<{
        function?: {
          arguments?: string;
        };
      }>;
    };
  }>;
};

function logAIEvent(operation: string, event: string, details: Record<string, unknown> = {}) {
  console.log(JSON.stringify({ scope: "ai", operation, event, ...details }));
}

function classifyStatus(status: number): AIClientError {
  if (status === 429) {
    return new AIClientError("AI rate limit", {
      status,
      code: "rate_limited",
      userMessage: "Rate limit bereikt, probeer later opnieuw.",
    });
  }

  if (status === 402) {
    return new AIClientError("AI credits exhausted", {
      status,
      code: "payment_required",
      userMessage: "AI credits zijn op. Voeg credits toe om verder te gaan.",
    });
  }

  return new AIClientError("AI service error", {
    status,
    code: "service_error",
    userMessage: "AI service tijdelijk niet beschikbaar.",
  });
}

function shouldRetry(status: number) {
  return status === 429 || status >= 500;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function stripJsonCodeFence(content: string): string {
  let cleaned = content.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "");
  }
  return cleaned;
}

export function parseJsonWithSchema<T>(
  raw: string,
  schema: z.ZodType<T>,
  operation: string,
): T {
  try {
    const parsed = JSON.parse(stripJsonCodeFence(raw));
    return schema.parse(parsed);
  } catch (error) {
    logAIEvent(operation, "validation_failed");
    throw new AIClientError("AI JSON validation failed", {
      code: "validation_failed",
      userMessage: "AI gaf geen geldige gestructureerde data terug.",
    });
  }
}

export async function callAI(request: AIRequest): Promise<AIResponse> {
  const model = request.model ?? "google/gemini-2.5-flash";
  const retries = request.retries ?? 2;
  const timeoutMs = request.timeoutMs ?? 30_000;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      logAIEvent(request.operation, "request", { attempt, stream: Boolean(request.stream), model });
      const response = await fetch(AI_GATEWAY_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${request.apiKey}`,
          "Content-Type": "application/json",
        },
        signal: controller.signal,
        body: JSON.stringify({
          model,
          messages: request.messages,
          tools: request.tools,
          tool_choice: request.tool_choice,
          stream: request.stream,
          temperature: request.temperature,
        }),
      });
      clearTimeout(timeout);

      if (!response.ok) {
        logAIEvent(request.operation, "response_error", { attempt, status: response.status });
        if (shouldRetry(response.status) && attempt < retries && response.status !== 402) {
          await sleep(500 * 2 ** attempt);
          continue;
        }
        throw classifyStatus(response.status);
      }

      logAIEvent(request.operation, "response_ok", { attempt });
      return await response.json();
    } catch (error) {
      clearTimeout(timeout);
      if (error instanceof AIClientError) throw error;

      const isAbort = error instanceof DOMException && error.name === "AbortError";
      logAIEvent(request.operation, isAbort ? "timeout" : "network_error", { attempt });
      if (attempt < retries) {
        await sleep(500 * 2 ** attempt);
        continue;
      }
      throw new AIClientError(isAbort ? "AI timeout" : "AI request failed", {
        code: isAbort ? "timeout" : "service_error",
        userMessage: isAbort ? "AI-aanvraag duurde te lang." : "AI service tijdelijk niet beschikbaar.",
      });
    }
  }

  throw new AIClientError("AI request failed", { code: "service_error" });
}

export async function callAIStream(request: AIRequest): Promise<Response> {
  const model = request.model ?? "google/gemini-2.5-flash";
  const timeoutMs = request.timeoutMs ?? 30_000;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    logAIEvent(request.operation, "request", { attempt: 0, stream: true, model });
    const response = await fetch(AI_GATEWAY_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${request.apiKey}`,
        "Content-Type": "application/json",
      },
      signal: controller.signal,
      body: JSON.stringify({
        model,
        messages: request.messages,
        tools: request.tools,
        tool_choice: request.tool_choice,
        stream: true,
        temperature: request.temperature,
      }),
    });
    clearTimeout(timeout);

    if (!response.ok) {
      logAIEvent(request.operation, "response_error", { status: response.status });
      throw classifyStatus(response.status);
    }

    logAIEvent(request.operation, "response_ok");
    return response;
  } catch (error) {
    clearTimeout(timeout);
    if (error instanceof AIClientError) throw error;
    const isAbort = error instanceof DOMException && error.name === "AbortError";
    logAIEvent(request.operation, isAbort ? "timeout" : "network_error");
    throw new AIClientError(isAbort ? "AI timeout" : "AI request failed", {
      code: isAbort ? "timeout" : "service_error",
      userMessage: isAbort ? "AI-aanvraag duurde te lang." : "AI service tijdelijk niet beschikbaar.",
    });
  }
}

export async function callAIJson<T>(
  request: AIRequest & { schema: z.ZodType<T> },
): Promise<T> {
  const data = await callAI(request);
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new AIClientError("AI response missing content", {
      code: "validation_failed",
      userMessage: "AI gaf geen tekst terug.",
    });
  }
  return parseJsonWithSchema(content, request.schema, request.operation);
}

export async function callAIToolJson<T>(
  request: AIRequest & { schema: z.ZodType<T> },
): Promise<T> {
  const data = await callAI(request);
  const rawArgs = data.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
  if (!rawArgs) {
    throw new AIClientError("AI response missing tool arguments", {
      code: "validation_failed",
      userMessage: "AI gaf geen gestructureerde data terug.",
    });
  }
  return parseJsonWithSchema(rawArgs, request.schema, request.operation);
}
