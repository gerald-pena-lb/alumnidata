import { NextRequest } from "next/server";

// Use Edge Runtime for native streaming and no cold starts
export const runtime = "edge";

// Store the last request for debugging via GET /api/llm
let lastRequest: unknown = null;
let lastError: string | null = null;

/**
 * GET /api/llm — Debug: see the last request ElevenLabs sent
 */
export async function GET() {
  return new Response(
    JSON.stringify({ lastRequest, lastError }, null, 2),
    { headers: { "Content-Type": "application/json" } }
  );
}

/**
 * POST /api/llm
 *
 * Custom LLM proxy for ElevenLabs Conversational AI.
 * Receives OpenAI Chat Completions-format requests from ElevenLabs,
 * translates them to Anthropic Messages API format (Claude Opus 4.6),
 * and streams back in OpenAI SSE format.
 */
export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    lastError = "ANTHROPIC_API_KEY not configured";
    return new Response(
      JSON.stringify({ error: lastError }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const body = await req.json();
    lastRequest = body;
    lastError = null;

    const messages = body.messages || [];
    const temperature = body.temperature;
    const max_tokens = body.max_tokens;

    // Separate system message from conversation messages
    const systemMessage = messages.find(
      (m: { role: string }) => m.role === "system"
    );
    let conversationMessages = messages.filter(
      (m: { role: string }) => m.role !== "system"
    );

    // Anthropic requires at least one user message.
    // If ElevenLabs sends no user messages (e.g. for first_message generation),
    // add a placeholder so Claude can respond.
    if (conversationMessages.length === 0) {
      conversationMessages = [
        { role: "user", content: "Begin the conversation with your opening line." },
      ];
    }

    // Ensure messages alternate correctly for Anthropic
    // (must start with user, alternate user/assistant)
    const cleanedMessages: { role: string; content: string }[] = [];
    for (const m of conversationMessages) {
      const lastRole = cleanedMessages.length > 0
        ? cleanedMessages[cleanedMessages.length - 1].role
        : null;

      // Skip consecutive same-role messages by merging them
      if (lastRole === m.role) {
        cleanedMessages[cleanedMessages.length - 1].content += "\n" + m.content;
      } else {
        cleanedMessages.push({ role: m.role, content: m.content });
      }
    }

    // Ensure first message is from user
    if (cleanedMessages.length > 0 && cleanedMessages[0].role !== "user") {
      cleanedMessages.unshift({
        role: "user",
        content: "Begin the conversation.",
      });
    }

    // Call Claude Opus 4.6 with streaming
    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-opus-4-6",
        max_tokens: max_tokens || 300,
        temperature: temperature ?? 0.7,
        system: systemMessage?.content || "",
        messages: cleanedMessages,
        stream: true,
      }),
    });

    if (!anthropicRes.ok) {
      const errorText = await anthropicRes.text();
      lastError = `Anthropic ${anthropicRes.status}: ${errorText}`;
      console.error("Anthropic API error:", lastError);

      // Return error in SSE format so ElevenLabs can handle it
      const encoder = new TextEncoder();
      const errorStream = new ReadableStream({
        start(controller) {
          const chunk = JSON.stringify({
            choices: [{ delta: { content: "I apologize, I'm having a technical issue. Could you give me a moment?" }, index: 0 }],
          });
          controller.enqueue(encoder.encode(`data: ${chunk}\n\n`));
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        },
      });
      return new Response(errorStream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    }

    // Stream-translate Anthropic SSE → OpenAI SSE format
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    const responseId = `chatcmpl-${Date.now()}`;
    let chunkIndex = 0;

    const stream = new ReadableStream({
      async start(controller) {
        const reader = anthropicRes.body!.getReader();
        let buffer = "";

        try {
          // Send initial role chunk (OpenAI format requires this first)
          const roleChunk = JSON.stringify({
            id: responseId,
            object: "chat.completion.chunk",
            created: Math.floor(Date.now() / 1000),
            model: "claude-opus-4-6",
            choices: [
              {
                index: 0,
                delta: { role: "assistant", content: "" },
                finish_reason: null,
              },
            ],
          });
          controller.enqueue(encoder.encode(`data: ${roleChunk}\n\n`));

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
              if (!line.startsWith("data: ")) continue;
              const dataStr = line.slice(6).trim();
              if (!dataStr || dataStr === "[DONE]") continue;

              try {
                const event = JSON.parse(dataStr);

                if (event.type === "content_block_delta" && event.delta?.text) {
                  chunkIndex++;
                  const openAiChunk = JSON.stringify({
                    id: responseId,
                    object: "chat.completion.chunk",
                    created: Math.floor(Date.now() / 1000),
                    model: "claude-opus-4-6",
                    choices: [
                      {
                        index: 0,
                        delta: { content: event.delta.text },
                        finish_reason: null,
                      },
                    ],
                  });
                  controller.enqueue(
                    encoder.encode(`data: ${openAiChunk}\n\n`)
                  );
                }

                if (event.type === "message_stop") {
                  // Send final chunk with finish_reason
                  const stopChunk = JSON.stringify({
                    id: responseId,
                    object: "chat.completion.chunk",
                    created: Math.floor(Date.now() / 1000),
                    model: "claude-opus-4-6",
                    choices: [
                      {
                        index: 0,
                        delta: {},
                        finish_reason: "stop",
                      },
                    ],
                  });
                  controller.enqueue(encoder.encode(`data: ${stopChunk}\n\n`));
                  controller.enqueue(encoder.encode("data: [DONE]\n\n"));
                }
              } catch {
                // Skip unparseable lines
              }
            }
          }

          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (err) {
          lastError = `Stream error: ${err}`;
          console.error("Stream translation error:", err);
          controller.error(err);
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    lastError = `Proxy error: ${error}`;
    console.error("LLM proxy error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
