import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

async function startServer() {
  const app = express();
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

  // API to fetch Quran Token (Optional OAuth2 for Quran Foundation)
  app.post("/api/quran/token", async (req, res) => {
    try {
      const clientId = (req.headers["x-quran-client-id"] as string) || process.env.QURAN_CLIENT_ID;
      const clientSecret = (req.headers["x-quran-client-secret"] as string) || process.env.QURAN_CLIENT_SECRET;

      if (!clientId || !clientSecret) {
        return res.status(400).json({ error: "Quran API credentials missing." });
      }

      const params = new URLSearchParams();
      params.append("grant_type", "client_credentials");
      params.append("client_id", clientId);
      params.append("client_secret", clientSecret);
      params.append("scope", "content");

      const response = await fetch("https://oauth2.quran.foundation/oauth2/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Failed to get token: ${errText}`);
      }

      const data = await response.json();
      res.json(data);
    } catch (error: any) {
      console.error("Quran Token Error:", error);
      res.status(500).json({ error: error.message || "Failed to fetch Quran token." });
    }
  });

  // API to fetch Verse (Supports both authenticated Quran Foundation and open free tier)
  app.get("/api/quran/verse/:key", async (req, res) => {
    try {
      const token = req.headers["x-quran-token"] as string;
      const clientId = (req.headers["x-quran-client-id"] as string) || process.env.QURAN_CLIENT_ID;
      const key = req.params.key;

      // 1. Try Quran Foundation OAuth if credentials exist
      if (token && clientId) {
        try {
          const response = await fetch(`https://apis.quran.foundation/content/api/v4/verses/by-key/${key}`, {
            method: "GET",
            headers: {
              "x-auth-token": token,
              "x-client-id": clientId,
              "Accept": "application/json",
            },
          });

          if (response.ok) {
            const data = await response.json();
            const text = data.data?.text?.standard || data.data?.text?.uthmani || data.verse?.text || data.text;
            if (text) {
              return res.json({ text, source: "quran-foundation", ...data });
            }
          }
        } catch (e) {
          console.warn("Quran Foundation OAuth attempt failed, falling back to public endpoint:", e);
        }
      }

      // 2. Fallback to Quran.com free public official API
      const freeResponse = await fetch(`https://api.quran.com/api/v4/verses/by_key/${key}?fields=text_uthmani`, {
        headers: {
          "Accept": "application/json",
        },
      });

      if (!freeResponse.ok) {
        throw new Error(`Failed to fetch verse ${key} from public Quran API`);
      }

      const freeData = await freeResponse.json();
      const verseText = freeData.verse?.text_uthmani || freeData.verse?.text;
      return res.json({ text: verseText, source: "quran-public", ...freeData });
    } catch (error: any) {
      console.error("Quran Verse Error:", error);
      res.status(500).json({ error: error.message || "Failed to fetch verse." });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
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

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
