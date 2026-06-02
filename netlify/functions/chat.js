exports.handler = async function(event) {
  var CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json"
  };

  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers: CORS, body: "" };
  if (event.httpMethod !== "POST") return { statusCode: 405, headers: CORS, body: JSON.stringify({ error: "Method not allowed." }) };

  var KEY = process.env.GEMINI_API_KEY;
  if (!KEY) return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: "GEMINI_API_KEY not set in Netlify environment variables." }) };

  var parsed;
  try { parsed = JSON.parse(event.body || "{}"); }
  catch(e) { return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: "Invalid body." }) }; }

  var history = parsed.history;
  if (!Array.isArray(history) || history.length === 0) {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: "history array required." }) };
  }

  var contents = [];
  for (var i = 0; i < history.length; i++) {
    var m = history[i];
    if (!m || !String(m.content || "").trim()) continue;
    var role = (m.role === "ai" || m.role === "assistant" || m.role === "model") ? "model" : "user";
    contents.push({ role: role, parts: [{ text: String(m.content).trim() }] });
  }
  while (contents.length > 0 && contents[0].role === "model") contents.shift();

  var alt = [];
  for (var j = 0; j < contents.length; j++) {
    if (alt.length === 0 || contents[j].role !== alt[alt.length - 1].role) alt.push(contents[j]);
  }
  if (alt.length === 0 || alt[alt.length - 1].role !== "user") {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: "Last message must be from user." }) };
  }

  var SYS = "You are KLE TECH GENIUSPHERE AI, a Generative AI tutor for KLE University course 24EEIC319 VI Semester. You teach all 7 chapters: Ch1 Intro to GenAI, Ch2 AE/VAE/GAN/Diffusion Models, Ch3 Training and Evaluation metrics, Ch4 Autoregressive Models ARIMA PixelCNN WaveNet, Ch5 Transformers GPT BERT T5, Ch6 Large Language Models RAG Agents, Ch7 Ethical AI. For every topic provide: Simple Explanation, Technical Explanation, Architecture Diagram, Workflow, Real Example, Advantages, Limitations, Applications, Interview Questions, Exam Questions 2mark 5mark 10mark, Summary. For comparisons make a markdown table. Be friendly, thorough, and encouraging. End every response with 4 follow-up topic suggestions.";

  var URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=" + KEY;
  var payload = {
    system_instruction: { parts: [{ text: SYS }] },
    contents: alt,
    generationConfig: { maxOutputTokens: 2048, temperature: 0.7 },
    safetySettings: [
      { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
    ]
  };

  var res, data;
  try {
    res = await fetch(URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    data = await res.json();
  } catch(err) {
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: "Could not reach Gemini API." }) };
  }

  if (!res.ok) {
    var msg = (data && data.error && data.error.message) ? data.error.message : ("Error " + res.status);
    if (res.status === 401 || res.status === 403) return { statusCode: 401, headers: CORS, body: JSON.stringify({ error: "Invalid GEMINI_API_KEY." }) };
    if (res.status === 429) return { statusCode: 429, headers: CORS, body: JSON.stringify({ error: "Rate limit. Wait 60 seconds." }) };
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: msg }) };
  }

  var reply = data && data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0] && data.candidates[0].content.parts[0].text;
  if (!reply) return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: "Empty response from Gemini." }) };

  return { statusCode: 200, headers: CORS, body: JSON.stringify({ reply: reply }) };
};
