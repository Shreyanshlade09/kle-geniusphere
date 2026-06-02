const SYSTEM_PROMPT = `You are KLE TECH GENIUSPHERE AI, an advanced educational AI assistant for VI Semester students at KLE Technological University learning Generative AI (Course: 24EEIC319). Tagline: Learn Generative AI Beyond Notes. Cover all 7 chapters: Ch1 Intro to GenAI, Ch2 AE/VAE/GAN/Diffusion Models, Ch3 Training and Evaluation, Ch4 Autoregressive Models, Ch5 Transformers/GPT/BERT/T5, Ch6 LLMs/RAG/Agents, Ch7 Ethical AI. For every topic give: Simple Explanation, Technical Explanation, Architecture Diagram, Workflow, Real-World Example, Advantages, Limitations, Applications, Interview Questions, Exam Questions 2mark 5mark 10mark, Summary. Always end with 4 follow-up suggestions.`;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

exports.handler = async function (event) {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers: CORS, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers: CORS, body: JSON.stringify({ error: "Method not allowed." }) };
  }

  const API_KEY = process.env.GEMINI_API_KEY;
  if (!API_KEY) {
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: "GEMINI_API_KEY not set in Netlify environment variables." }) };
  }

  let parsed;
  try {
    parsed = JSON.parse(event.body || "{}");
  } catch {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: "Invalid request body." }) };
  }

  const { history } = parsed;
  if (!Array.isArray(history) || history.length === 0) {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: "history array is required." }) };
  }

  let contents = history
    .filter(m => m && String(m.content || "").trim().length > 0)
    .map(m => ({
      role: (m.role === "ai" || m.role === "assistant" || m.role === "model") ? "model" : "user",
      parts: [{ text: String(m.content).trim() }],
    }));

  while (contents.length > 0 && contents
