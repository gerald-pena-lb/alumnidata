import { NextResponse } from "next/server";

/**
 * GET /api/calendly/lookup
 *
 * Looks up your Calendly event type URIs using your personal access token.
 * Visit this endpoint in your browser to find the correct CALENDLY_EVENT_TYPE_URI.
 */
export async function GET() {
  const calendlyApiKey = process.env.CALENDLY_API_KEY;

  if (!calendlyApiKey) {
    return NextResponse.json(
      { error: "CALENDLY_API_KEY not configured in environment variables" },
      { status: 500 }
    );
  }

  try {
    // Step 1: Get current user to find their URI
    const userRes = await fetch("https://api.calendly.com/users/me", {
      headers: { Authorization: `Bearer ${calendlyApiKey}` },
    });

    if (!userRes.ok) {
      const errText = await userRes.text();
      return NextResponse.json(
        { error: "Failed to authenticate with Calendly. Check your API key.", details: errText },
        { status: userRes.status }
      );
    }

    const userData = await userRes.json();
    const userUri = userData.resource?.uri;

    // Step 2: Get all event types for this user
    const eventTypesRes = await fetch(
      `https://api.calendly.com/event_types?user=${encodeURIComponent(userUri)}&active=true`,
      {
        headers: { Authorization: `Bearer ${calendlyApiKey}` },
      }
    );

    if (!eventTypesRes.ok) {
      return NextResponse.json(
        { error: "Failed to fetch event types" },
        { status: eventTypesRes.status }
      );
    }

    const eventTypesData = await eventTypesRes.json();
    const eventTypes = eventTypesData.collection || [];

    return NextResponse.json({
      message: "Find your event type below and copy the 'uri' value as your CALENDLY_EVENT_TYPE_URI",
      event_types: eventTypes.map(
        (et: { uri: string; name: string; slug: string; active: boolean; scheduling_url: string }) => ({
          name: et.name,
          slug: et.slug,
          uri: et.uri,
          active: et.active,
          scheduling_url: et.scheduling_url,
        })
      ),
    });
  } catch (error) {
    console.error("Calendly lookup error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
