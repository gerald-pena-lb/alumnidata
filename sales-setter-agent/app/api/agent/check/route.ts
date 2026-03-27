import { NextResponse } from "next/server";

/**
 * GET /api/agent/check
 *
 * Retrieves the current ElevenLabs agent configuration
 * to verify the custom LLM URL is correct.
 */
export async function GET() {
  const elevenLabsKey = process.env.ELEVENLABS_API_KEY;
  const agentId = process.env.ELEVENLABS_AGENT_ID;

  if (!elevenLabsKey || !agentId) {
    return NextResponse.json({
      error: "ELEVENLABS_API_KEY or ELEVENLABS_AGENT_ID not set",
    });
  }

  try {
    const response = await fetch(
      `https://api.elevenlabs.io/v1/convai/agents/${agentId}`,
      {
        headers: { "xi-api-key": elevenLabsKey },
      }
    );

    if (!response.ok) {
      return NextResponse.json({
        error: `ElevenLabs API returned ${response.status}`,
        details: await response.text(),
      });
    }

    const data = await response.json();
    const agentConfig = data.conversation_config?.agent;
    const ttsConfig = data.conversation_config?.tts;

    return NextResponse.json({
      agent_id: agentId,
      name: data.name,
      llm_config: agentConfig?.prompt?.llm,
      custom_llm_url: agentConfig?.prompt?.custom_llm?.url || "NOT SET",
      custom_llm_model: agentConfig?.prompt?.custom_llm?.model_id,
      first_message: agentConfig?.first_message,
      voice_id: ttsConfig?.voice_id,
      expected_llm_url: process.env.LLM_WEBHOOK_URL,
      urls_match: agentConfig?.prompt?.custom_llm?.url === process.env.LLM_WEBHOOK_URL,
    });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
