import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const body = await req.json();
    console.log("BODY:", body);

    const { name, phone, role, admin_id } = body;

    if (!name || !phone || !admin_id) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: corsHeaders }
      );
    }

    const url = Deno.env.get("SUPABASE_URL");
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    console.log("ENV:", { url, key: key?.slice(0, 10) });

    if (!url || !key) {
      return new Response(
        JSON.stringify({ error: "Missing env vars" }),
        { status: 500, headers: corsHeaders }
      );
    }

    const supabase = createClient(url, key);

    // ✅ CHECK IF USER ALREADY EXISTS
    const email = `${phone}@mkoba.local`;

    const { data: existing } = await supabase.auth.admin.listUsers({
      filter: `email eq "${email}"`,
    });

    if (existing?.users?.length) {
      return new Response(
        JSON.stringify({ error: "User already exists" }),
        { status: 409, headers: corsHeaders }
      );
    }

    // ✅ CREATE USER
    const { data: authUser, error: authError } =
      await supabase.auth.admin.createUser({
        email,
        password: "12345678",
        email_confirm: true,
      });

    if (authError) {
      return new Response(
        JSON.stringify({ error: authError.message }),
        { status: 400, headers: corsHeaders }
      );
    }

    // ✅ INSERT MEMBER
    const { error: memberError } = await supabase.from("members").insert({
      id: authUser.user.id,
      name,
      phone,
      role: role ?? "user",
      active: true,
    });

    if (memberError) {
      return new Response(
        JSON.stringify({ error: memberError.message }),
        { status: 400, headers: corsHeaders }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: corsHeaders }
    );
  } catch (err) {
    console.error("CRASH:", err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: corsHeaders }
    );
  }
});
