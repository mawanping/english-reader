const { buildExercisesPrompt } = require("../lib/prompts.js");
const { checkLimit } = require("../lib/rate-limit.js");

const DEEPSEEK_KEY = process.env.DEEPSEEK_API_KEY;

async function callDeepSeek(messages) {
  const res = await fetch("https://api.deepseek.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${DEEPSEEK_KEY}`,
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages,
      response_format: { type: "json_object" },
      max_tokens: 8000,
      temperature: 0.8,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`AI API error (${res.status}): ${errText}`);
  }

  const data = await res.json();
  return JSON.parse(data.choices[0].message.content);
}

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { article, words, level, deviceId, unlockCode } = req.body;

    if (!article) {
      return res.status(400).json({ error: "请提供文章内容" });
    }

    const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown";
    const limit = checkLimit(ip, deviceId, unlockCode);

    if (!limit.allowed) {
      return res.status(429).json({
        error: `免费使用次数已用完（${limit.limit}次）`,
        contact: limit.contact,
        limitReached: true,
      });
    }

    const messages = buildExercisesPrompt(article, words, level);
    const result = await callDeepSeek(messages);

    return res.json({
      ...result,
      usage: { remaining: limit.remaining, limit: limit.limit, used: limit.used, unlimited: limit.unlimited },
    });
  } catch (err) {
    console.error("generate-exercises error:", err.message);
    return res.status(500).json({ error: err.message });
  }
};
