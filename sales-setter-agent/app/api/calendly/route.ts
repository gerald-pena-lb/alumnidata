import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/calendly
 *
 * Handles the book_strategy_call tool invocation from the voice agent.
 * Supports two modes:
 *   1. Direct booking via Calendly Scheduling API (preferred)
 *   2. Fallback to pre-filled scheduling link
 */
export async function POST(req: NextRequest) {
  const calendlyApiKey = process.env.CALENDLY_API_KEY;
  const schedulingUrl = process.env.CALENDLY_SCHEDULING_URL;
  const eventTypeUri = process.env.CALENDLY_EVENT_TYPE_URI;

  if (!calendlyApiKey || !schedulingUrl) {
    return NextResponse.json({
      success: true,
      method: "manual",
      scheduling_url: schedulingUrl || "https://calendly.com",
      message:
        "Calendly API not fully configured. Returning public scheduling link.",
    });
  }

  try {
    const body = await req.json();
    const { prospect_email, prospect_name, notes, preferred_time } = body;

    // If a preferred time is provided and we have the event type, book directly
    if (preferred_time && eventTypeUri) {
      const bookingRes = await fetch("https://api.calendly.com/invitees", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${calendlyApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          event_type: eventTypeUri,
          start_time: preferred_time,
          invitee: {
            name: prospect_name,
            email: prospect_email,
          },
          location: { kind: "google_conference" },
          questions_and_answers: notes
            ? [
                {
                  question: "Notes from qualification call",
                  answer: notes,
                },
              ]
            : undefined,
        }),
      });

      if (bookingRes.ok) {
        const bookingData = await bookingRes.json();
        return NextResponse.json({
          success: true,
          method: "direct_booking",
          event: bookingData.resource,
          message: `Strategy call booked for ${prospect_name}. Calendar invite sent to ${prospect_email}. Alinka will receive the meeting details and your notes.`,
        });
      }
    }

    // Fetch available slots for the next 7 days
    if (eventTypeUri) {
      const now = new Date();
      const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      const availabilityRes = await fetch(
        `https://api.calendly.com/event_type_available_times?event_type=${encodeURIComponent(
          eventTypeUri
        )}&start_time=${now.toISOString()}&end_time=${nextWeek.toISOString()}`,
        {
          headers: {
            Authorization: `Bearer ${calendlyApiKey}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (availabilityRes.ok) {
        const availabilityData = await availabilityRes.json();
        const availableSlots = availabilityData.collection?.slice(0, 10) || [];

        return NextResponse.json({
          success: true,
          method: "available_times",
          available_slots: availableSlots.map(
            (slot: { start_time: string; status: string }) => ({
              start_time: slot.start_time,
              status: slot.status,
            })
          ),
          message: `Here are the available times for a strategy call with Alinka. Please ask ${prospect_name} which time works best, then call this function again with the preferred_time to confirm the booking.`,
        });
      }
    }

    // Fallback: return pre-filled scheduling link
    const prefilledUrl = `${schedulingUrl}?name=${encodeURIComponent(
      prospect_name
    )}&email=${encodeURIComponent(prospect_email)}`;

    return NextResponse.json({
      success: true,
      method: "link",
      scheduling_url: prefilledUrl,
      message: `I'll send ${prospect_name} a personalized booking link to select their preferred time with Alinka directly.`,
      notes,
    });
  } catch (error) {
    console.error("Calendly API error:", error);
    return NextResponse.json(
      { error: "Failed to process booking request" },
      { status: 500 }
    );
  }
}
