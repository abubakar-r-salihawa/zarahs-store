const allowedOrigins = new Set([
  "https://zarahs-store.vercel.app",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
]);

function corsHeaders(req: Request) {
  const origin = req.headers.get("origin") || "";
  const allowedOrigin = allowedOrigins.has(origin)
    ? origin
    : "https://zarahs-store.vercel.app";

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

function json(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders(req),
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(req) });
  }

  if (req.method !== "POST") {
    return json(req, { error: "Method not allowed" }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const authorization = req.headers.get("authorization");

  if (!supabaseUrl || !serviceRoleKey) {
    return json(req, { error: "Vendor management is not configured" }, 500);
  }

  if (!authorization?.toLowerCase().startsWith("bearer ")) {
    return json(req, { error: "Sign in as the store owner first" }, 401);
  }

  try {
    const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        "apikey": serviceRoleKey,
        "authorization": authorization,
      },
    });

    if (!userResponse.ok) {
      return json(req, { error: "Your session is no longer valid. Please sign in again." }, 401);
    }

    const user = await userResponse.json();
    if (user?.app_metadata?.role !== "admin") {
      return json(req, { error: "Only the store owner can manage vendor access." }, 403);
    }

    const requestBody = await req.json();
    const action = requestBody?.action;
    const payload = requestBody?.payload || {};

    if (!["list", "upsert", "delete"].includes(action)) {
      return json(req, { error: "Unsupported vendor-management action" }, 400);
    }

    const rpcResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/manage_vendor_account`, {
      method: "POST",
      headers: {
        "apikey": serviceRoleKey,
        "authorization": `Bearer ${serviceRoleKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        p_admin_user_id: user.id,
        p_action: action,
        p_payload: payload,
      }),
    });

    const rpcBody = await rpcResponse.json().catch(() => null);

    if (!rpcResponse.ok) {
      const message = rpcBody?.message || rpcBody?.hint || "Vendor details could not be saved";
      return json(req, { error: message }, rpcResponse.status >= 500 ? 500 : 400);
    }

    return json(req, { data: rpcBody });
  } catch (error) {
    console.error("manage-vendor-access failed", error);
    return json(req, { error: "Vendor management failed. Please try again." }, 500);
  }
});
