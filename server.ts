import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";

// Load environment variables
dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware for parsing requests
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ limit: "1mb", extended: true }));

  // Basic Health endpoint
  app.get("/api/health", (req, res) => {
    res.json({
      status: "ok",
      hasApiKey: false,
    });
  });

  if (process.env.NODE_ENV !== "production") {
    // Mount Vite middleware inside our Express server
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Host production files as statically bound
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`PrintDesk Server listening on http://localhost:${PORT}`);
  });
}

startServer();
