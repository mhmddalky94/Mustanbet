import express from "express";
import http from "http";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

async function startServer() {
  const app = express();
  const server = http.createServer(app);
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json());

  // API to call Gemini
  app.post("/api/generate", async (req, res) => {
    try {
      const apiKey = (req.headers["x-gemini-key"] as string) || process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(401).json({ error: "لم يتم العثور على مفتاح Gemini. يرجى تفعيل مفتاح البيئة." });
      }

      const { prompt, systemInstruction, responseMimeType } = req.body;
      const ai = new GoogleGenAI({ apiKey });

      // Prioritize gemini-3.8-flash; use compatible flash fallbacks if 503 temporary demand occurs
      const candidateModels = ["gemini-3.8-flash", "gemini-3.1-flash-lite", "gemini-flash-latest"];
      let text = "";
      let usedModel = "gemini-3.8-flash";
      let lastError: any = null;

      for (const modelCandidate of candidateModels) {
        // Give gemini-3.8-flash 2 attempts with backoff before trying fallback
        const maxAttempts = modelCandidate === "gemini-3.8-flash" ? 2 : 1;
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
          try {
            const config: Record<string, any> = {};
            if (systemInstruction) config.systemInstruction = systemInstruction;
            if (responseMimeType) config.responseMimeType = responseMimeType;

            const response = await ai.models.generateContent({
              model: modelCandidate,
              contents: prompt,
              config: Object.keys(config).length > 0 ? config : undefined,
            });
            if (response.text) {
              text = response.text;
              usedModel = modelCandidate;
              break;
            }
          } catch (err: any) {
            lastError = err;
            if (attempt < maxAttempts) {
              await new Promise((r) => setTimeout(r, 600));
            }
          }
        }
        if (text) break;
      }

      if (!text && lastError) {
        throw lastError;
      }

      res.json({ text, model: usedModel });
    } catch (error: any) {
      console.error("Gemini Error:", error);
      res.status(500).json({ error: error.message || "فشل في توليد المحتوى." });
    }
  });

  // API to fetch Verse (Completely open, keyless Quran API via api.alquran.cloud / quran.com)
  app.get("/api/quran/verse/:key", async (req, res) => {
    try {
      const key = req.params.key;

      // 1. Fetch from api.alquran.cloud (completely open & keyless)
      try {
        const alquranRes = await fetch(`https://api.alquran.cloud/v1/ayah/${key}/editions/quran-uthmani`, {
          headers: { Accept: "application/json" },
        });
        if (alquranRes.ok) {
          const data = await alquranRes.json();
          const ayahData = data.data?.[0] || data.data;
          const text = ayahData?.text;
          if (text) {
            return res.json({ text, source: "alquran.cloud" });
          }
        }
      } catch (e) {
        console.warn("api.alquran.cloud fetch failed, trying fallback:", e);
      }

      // 2. Fallback to Quran.com free public API
      const freeResponse = await fetch(`https://api.quran.com/api/v4/verses/by_key/${key}?fields=text_uthmani`, {
        headers: { Accept: "application/json" },
      });

      if (freeResponse.ok) {
        const freeData = await freeResponse.json();
        const verseText = freeData.verse?.text_uthmani || freeData.verse?.text;
        if (verseText) {
          return res.json({ text: verseText, source: "quran.com" });
        }
      }

      throw new Error(`Failed to fetch verse ${key} from keyless Quran APIs`);
    } catch (error: any) {
      console.error("Quran Verse Error:", error);
      res.status(500).json({ error: error.message || "Failed to fetch verse." });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR === "true" ? false : { server },
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
