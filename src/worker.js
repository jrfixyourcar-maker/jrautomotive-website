import { onRequestGet, onRequestPost } from "../functions/api/message.js";

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === "/api/message") {
      if (request.method === "GET") {
        return onRequestGet({ request, env, ctx });
      }

      if (request.method === "POST") {
        return onRequestPost({ request, env, ctx });
      }

      return json({ ok: false, message: "Method not allowed." }, 405);
    }

    if (url.pathname.startsWith("/api/")) {
      return json({ ok: false, message: "Not found." }, 404);
    }

    return env.ASSETS.fetch(request);
  }
};
