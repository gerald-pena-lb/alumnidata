import { NextResponse } from "next/server";

/**
 * GET /api/agent/voice
 *
 * Shows the current TTS/voice config for the agent.
 */
export async function GET() {
  const elevenLabsKey = process.env.ELEVENLABS_API_KEY;
  const agentId = process.env.ELEVENLABS_AGENT_ID;

  if (!elevenLabsKey || !agentId) {
    return NextResponse.json({ error: "Missing env vars" });
  }

  try {
    const res = await fetch(
      `https://api.elevenlabs.io/v1/convai/agents/${agentId}`,
      { headers: { "xi-api-key": elevenLabsKey } }
    );

    if (!res.ok) {
      return NextResponse.json({ error: await res.text() });
    }

    const data = await res.json();
    const tts = data.conversation_config?.tts;

    return NextResponse.json({
      voice_id: tts?.voice_id,
      model_id: tts?.model_id,
      speed: tts?.speed ?? "not set (default ~1.0)",
      stability: tts?.stability,
      similarity_boost: tts?.similarity_boost,
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) });
  }
}
