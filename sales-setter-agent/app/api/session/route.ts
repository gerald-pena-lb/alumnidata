import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/session
 *
 * Creates a conversation token for ElevenLabs WebRTC connection (audio support).
 */
export async function POST(req: NextRequest) {
  const elevenLabsKey = process.env.ELEVENLABS_API_KEY;
  const agentId = process.env.ELEVENLABS_AGENT_ID;

  if (!elevenLabsKey || !agentId) {
    return NextResponse.json(
      { error: "ELEVENLABS_API_KEY and ELEVENLABS_AGENT_ID are required" },
      { status: 500 }
    );
  }

  try {
    const body = await req.json();
    const { prospectName, teammateName } = body;

    if (!prospectName || !teammateName) {
      return NextResponse.json(
        { error: "prospectName and teammateName are required" },
        { status: 400 }
      );
    }

    // Get conversation token for WebRTC (supports audio)
    const tokenRes = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/token?agent_id=${agentId}`,
      {
        headers: { "xi-api-key": elevenLabsKey },
      }
    );

    if (!tokenRes.ok) {
      const errorText = await tokenRes.text();
      console.error("ElevenLabs token error:", errorText);
      return NextResponse.json(
        { error: "Failed to create conversation token", details: errorText },
        { status: tokenRes.status }
      );
    }

    const data = await tokenRes.json();

    return NextResponse.json({
      agentId,
      prospectName,
      teammateName,
    });
  } catch (error) {
    console.error("Session creation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
