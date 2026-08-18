import { DurableObject } from "cloudflare:workers";

const OPTIONS = [
  { id: "classroom", label: "课堂教学", caption: "任务设计与评价", color: "#39A0FF", index: "01" },
  { id: "project", label: "课题研究", caption: "选题论证与路径", color: "#20D6C7", index: "02" },
  { id: "paper", label: "论文写作", caption: "结构诊断与表达", color: "#8B7CFF", index: "03" },
  { id: "competition", label: "竞赛准备", caption: "评委追问与答辩", color: "#FFB547", index: "04" },
  { id: "play", label: "用AI玩", caption: "角色模拟与创意", color: "#FF5FA2", index: "05" }
];

const AI_TOOLS = [
  { id: "deepseek", label: "DeepSeek" },
  { id: "doubao", label: "豆包" },
  { id: "kimi", label: "Kimi" },
  { id: "qwen", label: "通义千问" },
  { id: "wps", label: "WPS AI" },
  { id: "ernie", label: "百度文心" },
  { id: "chatgpt", label: "ChatGPT" },
  { id: "other", label: "其他工具" },
  { id: "none", label: "尚未使用" }
];

function json(body, status = 200) {
  return Response.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff"
    }
  });
}

function cleanSentence(value) {
  return String(value || "")
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 60);
}

function authorized(request, env) {
  const configured = String(env.ADMIN_KEY || "");
  const supplied = String(request.headers.get("X-Admin-Key") || "");
  return configured.length >= 6 && supplied === configured;
}

function csvCell(value) {
  let safe = String(value ?? "");
  if (/^[=+\-@]/.test(safe)) safe = `'${safe}`;
  return `"${safe.replace(/"/g, '""')}"`;
}

export class OpeningRoom extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.ctx = ctx;
    this.env = env;
  }

  async responses() {
    return (await this.ctx.storage.get("responses")) || [];
  }

  async fetch(request) {
    const url = new URL(request.url);

    if (request.method === "POST" && url.pathname === "/api/submit") {
      const length = Number(request.headers.get("Content-Length") || 0);
      if (length > 4096) return json({ ok: false, message: "提交内容过长" }, 413);

      let body;
      try {
        body = await request.json();
      } catch {
        return json({ ok: false, message: "请求格式错误" }, 400);
      }

      const clientId = String(body.clientId || "").slice(0, 80);
      const choice = String(body.choice || "");
      const sentence = cleanSentence(body.sentence);
      const tools = [...new Set(Array.isArray(body.tools) ? body.tools.map(String) : [])]
        .filter((id) => AI_TOOLS.some((tool) => tool.id === id))
        .slice(0, 8);
      if (!clientId || !OPTIONS.some((option) => option.id === choice)) {
        return json({ ok: false, message: "请选择一项最需要的AI应用场景" }, 400);
      }

      const responses = await this.responses();
      const item = { clientId, choice, tools, sentence, submittedAt: new Date().toISOString() };
      const existingIndex = responses.findIndex((entry) => entry.clientId === clientId);
      if (existingIndex >= 0) responses[existingIndex] = item;
      else responses.push(item);
      if (responses.length > 3000) responses.splice(0, responses.length - 3000);
      await this.ctx.storage.put("responses", responses);
      return json({ ok: true, total: responses.length });
    }

    if (request.method === "GET" && url.pathname === "/api/results") {
      const responses = await this.responses();
      const counts = Object.fromEntries(OPTIONS.map((option) => [option.id, 0]));
      const toolCounts = Object.fromEntries(AI_TOOLS.map((tool) => [tool.id, 0]));
      for (const item of responses) {
        if (Object.hasOwn(counts, item.choice)) counts[item.choice] += 1;
        for (const tool of item.tools || []) {
          if (Object.hasOwn(toolCounts, tool)) toolCounts[tool] += 1;
        }
      }
      return json({
        total: responses.length,
        counts,
        toolCounts,
        sentences: responses.map((item) => item.sentence).filter(Boolean).slice(-36).reverse(),
        updatedAt: new Date().toISOString()
      });
    }

    if (request.method === "POST" && url.pathname === "/api/reset") {
      if (!authorized(request, this.env)) return json({ ok: false, message: "管理密码不正确" }, 403);
      await this.ctx.storage.put("responses", []);
      return json({ ok: true });
    }

    if (request.method === "GET" && url.pathname === "/api/export.csv") {
      if (!authorized(request, this.env)) return json({ ok: false, message: "管理密码不正确" }, 403);
      const responses = await this.responses();
      const labels = Object.fromEntries(OPTIONS.map((option) => [option.id, option.label]));
      const lines = ["序号,选择场景,一句话期待,提交时间"];
      responses.forEach((item, index) => {
        lines.push([index + 1, labels[item.choice] || item.choice, item.sentence, item.submittedAt].map(csvCell).join(","));
      });
      return new Response(`\uFEFF${lines.join("\r\n")}`, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": "attachment; filename=ai-opening-results.csv",
          "Cache-Control": "no-store"
        }
      });
    }

    return json({ ok: false, message: "Not found" }, 404);
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/api/config") {
      return json({
        title: "AI教师能力现场共创",
        options: OPTIONS,
        aiTools: AI_TOOLS,
        publicUrl: `${url.origin}/`
      });
    }

    if (url.pathname.startsWith("/api/")) {
      const roomId = env.OPENING_ROOM.idFromName("main-room");
      return env.OPENING_ROOM.get(roomId).fetch(request);
    }

    return env.ASSETS.fetch(request);
  }
};
