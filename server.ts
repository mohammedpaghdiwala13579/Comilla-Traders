import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API route to proxy Apps Script calls and bypass CORS
  app.post("/api/proxy", async (req, res) => {
    try {
      const { url, action, payload } = req.body;
      if (!url) {
        return res.status(400).json({ error: "Missing url parameter" });
      }

      console.log(`[PROXY] Proxying action "${action}" to ${url}`);

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ action, payload }),
        redirect: "follow"
      });

      if (!response.ok) {
        console.error(`[PROXY ERROR] Apps Script returned status ${response.status} ${response.statusText}`);
        return res.status(response.status).json({ error: `Apps Script error: ${response.statusText}` });
      }

      const text = await response.text();
      try {
        const json = JSON.parse(text);
        res.json(json);
      } catch (e) {
        res.send(text);
      }
    } catch (error: any) {
      console.error("[PROXY FATAL ERROR]:", error);
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  });

  // Vite middleware for development or static serving for production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: express.Request, res: express.Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
