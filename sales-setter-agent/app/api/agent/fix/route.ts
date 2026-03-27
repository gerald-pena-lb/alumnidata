import { NextResponse } from "next/server";
import { NEPQ_SYSTEM_PROMPT, AGENT_FIRST_MESSAGE } from "@/lib/nepq-prompt";

/**
 * GET /api/agent/fix
 *
 * Updates the ElevenLabs agent with latest prompt, TTS, and LLM config.
 * Visit this URL in your browser to apply changes.
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
        method: "PATCH",
        headers: {
          "xi-api-key": elevenLabsKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "Tiffany — NEPQ Sales Setter",
          conversation_config: {
            agent: {
              prompt: {
                prompt: NEPQ_SYSTEM_PROMPT,
                llm: "claude-sonnet-4-6",
                custom_llm: null,
                temperature: 0.7,
                max_tokens: 300,
              },
              first_message: AGENT_FIRST_MESSAGE,
              language: "en",
            },
            tts: {
              model_id: "eleven_flash_v2",
              voice_id: "EXAVITQu4vr4xnSDxMaL",
              stability: 0.7,
              similarity_boost: 0.75,
            },
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json({
        status: "error",
        message: "Failed to update agent",
        details: errorText,
      });
    }

    return NextResponse.json({
      status: "ok",
      agent_id: agentId,
      llm: "claude-sonnet-4-6",
      tts: "eleven_flash_v2",
      voice: "EXAVITQu4vr4xnSDxMaL (Sarah)",
      message: "Agent updated. Test it in the ElevenLabs dashboard first, then try your app.",
    });
  } catch (error) {
    return NextResponse.json({
      status: "error",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
