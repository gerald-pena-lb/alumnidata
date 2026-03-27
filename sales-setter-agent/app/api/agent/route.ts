import { NextRequest, NextResponse } from "next/server";
import { NEPQ_SYSTEM_PROMPT, AGENT_FIRST_MESSAGE } from "@/lib/nepq-prompt";

/**
 * POST /api/agent
 *
 * Creates (or updates) the ElevenLabs Conversational AI agent
 * with the NEPQ system prompt and custom LLM (Claude Opus 4.6 proxy).
 *
 * Call this once during setup, or when you need to update the agent config.
 */
export async function POST(req: NextRequest) {
  const elevenLabsKey = process.env.ELEVENLABS_API_KEY;
  if (!elevenLabsKey) {
    return NextResponse.json(
      { error: "ELEVENLABS_API_KEY not configured" },
      { status: 500 }
    );
  }

  try {
    const body = await req.json();
    const { agentId } = body; // If provided, update existing agent

    // LLM_WEBHOOK_URL is optional — if not set, uses ElevenLabs' built-in Claude Sonnet 4.6

    // Use built-in Claude model if LLM_WEBHOOK_URL is not set, otherwise use custom LLM proxy
    const llmWebhookUrl = process.env.LLM_WEBHOOK_URL;
    const useCustomLlm = !!llmWebhookUrl;

    const llmConfig = useCustomLlm
      ? {
          llm: "custom-llm",
          custom_llm: {
            url: llmWebhookUrl,
            model_id: "claude-opus-4-6",
            api_type: "chat_completions",
          },
        }
      : {
          llm: "claude-sonnet-4-6",
        };

    const agentConfig = {
      name: "Tiffany — NEPQ Sales Setter",
      conversation_config: {
        agent: {
          prompt: {
            prompt: NEPQ_SYSTEM_PROMPT,
            ...llmConfig,
            temperature: 0.7,
            max_tokens: 300,
          },
          first_message: AGENT_FIRST_MESSAGE,
          language: "en",
        },
        tts: {
          model_id: "eleven_flash_v2",
          voice_id: process.env.ELEVENLABS_VOICE_ID || "EXAVITQu4vr4xnSDxMaL",
          stability: 0.7,
          similarity_boost: 0.75,
        },
        conversation: {
          max_duration_seconds: 1800, // 30 min max
          client_events: [
            "agent_response",
            "user_transcript",
            "agent_response_correction",
          ],
        },
      },
    };

    const url = agentId
      ? `https://api.elevenlabs.io/v1/convai/agents/${agentId}`
      : "https://api.elevenlabs.io/v1/convai/agents/create";

    const method = agentId ? "PATCH" : "POST";

    const response = await fetch(url, {
      method,
      headers: {
        "xi-api-key": elevenLabsKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(agentConfig),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("ElevenLabs agent creation failed:", errorText);
      return NextResponse.json(
        { error: "Failed to create/update agent", details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json({
      success: true,
      agentId: data.agent_id,
      message: agentId ? "Agent updated" : "Agent created",
    });
  } catch (error) {
    console.error("Agent creation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
