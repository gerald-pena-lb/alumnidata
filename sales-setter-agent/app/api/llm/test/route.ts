import { NextResponse } from "next/server";

/**
 * GET /api/llm/test
 *
 * Tests the Anthropic API connection and Claude Opus 4.6 access.
 * Visit this URL in your browser to verify the LLM is working.
 */
export async function GET() {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return NextResponse.json({
      status: "error",
      message: "ANTHROPIC_API_KEY is not set in environment variables",
    });
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-opus-4-6",
        max_tokens: 20,
        messages: [{ role: "user", content: "Say hello in one word." }],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json({
        status: "error",
        httpStatus: response.status,
        message: "Anthropic API returned an error",
        details: errorText,
      });
    }

    const data = await response.json();
    return NextResponse.json({
      status: "ok",
      model: data.model,
      response: data.content?.[0]?.text,
      message: "Claude Opus 4.6 is working correctly",
    });
  } catch (error) {
    return NextResponse.json({
      status: "error",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
