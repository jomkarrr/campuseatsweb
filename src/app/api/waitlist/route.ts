import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Server-only env vars (set these in Cloudflare Pages -> Settings -> Environment variables).
// SUPABASE_URL can fall back to NEXT_PUBLIC_SUPABASE_URL if you already have that set.
const SUPABASE_URL =
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function getSupabase() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return null;
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function GET() {
  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json(
      { success: false, error: "Waitlist storage is not configured." },
      { status: 503 }
    );
  }

  const { count, error } = await supabase
    .from("waitlist")
    .select("*", { count: "exact", head: true });

  if (error) {
    console.error("Waitlist count error:", error);
    return NextResponse.json(
      { success: false, error: "Unable to fetch waitlist count." },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, count: count ?? 0 });
}

export async function POST(request: Request) {
  try {
    const supabase = getSupabase();
    if (!supabase) {
      return NextResponse.json(
        { success: false, error: "Waitlist storage is not configured." },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { name, contact, role, blockOrOutlet } = body;

    // Validation
    if (!name || typeof name !== "string" || name.trim().length < 2) {
      return NextResponse.json(
        { success: false, error: "Please provide your full name." },
        { status: 400 }
      );
    }

    if (!contact || typeof contact !== "string" || contact.trim().length < 6) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Please provide a valid VIT-AP email address or 10-digit mobile number.",
        },
        { status: 400 }
      );
    }

    const validRoles = ["student", "outlet", "delivery"];
    if (!role || !validRoles.includes(role)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Please select your role (Student, Campus Outlet, or Delivery Partner).",
        },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("waitlist")
      .insert({
        name: name.trim(),
        contact: contact.trim(),
        role,
        block_or_outlet: blockOrOutlet ? String(blockOrOutlet).trim() : null,
      })
      .select("id")
      .single();

    if (error || !data) {
      console.error("Waitlist insert error:", error);
      return NextResponse.json(
        {
          success: false,
          error: "Unable to process registration. Please try again.",
        },
        { status: 500 }
      );
    }

    const { count } = await supabase
      .from("waitlist")
      .select("*", { count: "exact", head: true });

    return NextResponse.json(
      {
        success: true,
        message:
          "You've successfully joined the CampusEats early access waitlist!",
        waitlistNumber: count ?? 1,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Waitlist error:", error);
    return NextResponse.json(
      { success: false, error: "Unable to process registration. Please try again." },
      { status: 500 }
    );
  }
}
