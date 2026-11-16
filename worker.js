export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // 1. /proxy 경로 호출 시 Cboe 데이터 중계
    if (url.pathname === "/proxy") {
      if (request.method === "OPTIONS") {
        return new Response(null, {
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, OPTIONS",
          },
        });
      }

      const target = url.searchParams.get("url");
      if (!target || !target.startsWith("https://cdn.cboe.com/")) {
        return new Response("Invalid target URL", { status: 400 });
      }

      const upstream = await fetch(target, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          "Accept": "application/json",
          "Referer": "https://www.cboe.com/",
        },
      });

      return new Response(upstream.body, {
        status: upstream.status,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Access-Control-Allow-Origin": "*",
          "Cache-Control": "no-store",
        },
      });
    }

    // 2. 그 외 모든 경로는 정적 자산(public/index.html) 반환
    return env.ASSETS.fetch(request);
  },
};
