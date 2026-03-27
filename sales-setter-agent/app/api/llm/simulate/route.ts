import { NextResponse } from "next/server";

/**
 * GET /api/llm/simulate
 *
 * Simulates a request from ElevenLabs to the LLM proxy
 * to verify the full pipeline works end-to-end.
 */
export async function GET() {
  const llmUrl = process.env.LLM_WEBHOOK_URL;

  if (!llmUrl) {
    return NextResponse.json({
      status: "error",
      message: "LLM_WEBHOOK_URL is not set",
    });
  }

  try {
    // Simulate what ElevenLabs sends to the custom LLM
    const simulatedRequest = {
      model: "claude-opus-4-6",
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant. Respond in one short sentence.",
        },
        {
          role: "user",
          content: "Hello, how are you?",
        },
      ],
      stream: true,
      temperature: 0.7,
      max_tokens: 100,
    };

    const startTime = Date.now();
    const response = await fetch(llmUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(simulatedRequest),
    });

    const elapsed = Date.now() - startTime;

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json({
        status: "error",
        llmUrl,
        httpStatus: response.status,
        elapsed: `${elapsed}ms`,
        message: "LLM proxy returned an error",
        details: errorText.slice(0, 500),
      });
    }

    // Read the SSE stream
    const text = await response.text();
    const chunks: string[] = [];
    for (const line of text.split("\n")) {
      if (line.startsWith("data: ") && line !== "data: [DONE]") {
        try {
          const parsed = JSON.parse(line.slice(6));
          if (parsed.choices?.[0]?.delta?.content) {
            chunks.push(parsed.choices[0].delta.content);
          }
        } catch {
          // skip
        }
      }
    }

    return NextResponse.json({
      status: "ok",
      llmUrl,
      elapsed: `${elapsed}ms`,
      contentType: response.headers.get("content-type"),
      assembled_response: chunks.join(""),
      raw_line_count: text.split("\n").filter(Boolean).length,
      message: chunks.length > 0
        ? "LLM proxy is working. ElevenLabs should be able to reach it."
        : "LLM proxy responded but no content chunks found. Check SSE format.",
    });
  } catch (error) {
    return NextResponse.json({
      status: "error",
      llmUrl,
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
