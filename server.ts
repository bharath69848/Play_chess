import express from "express";
import { createServer as createViteServer } from "vite";
import cors from "cors";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // API Route to match the requested 'best-move' functionality
  app.post("/api/best-move", async (req, res) => {
    try {
      const fen = req.body.fen;
      if (!fen) {
        return res.status(400).json({ error: "Missing FEN parameter" });
      }

      const encodedFen = encodeURIComponent(fen);
      const depth = 12;
      const url = `https://stockfish.online/api/s/v2.php?fen=${encodedFen}&depth=${depth}`;
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.success) {
        // data.bestmove comes as "bestmove e2e4 ponder e7e5" sometimes
        // We extract just the move "e2e4" for the App to consume
        let bMove = data.bestmove;
        if (typeof bMove === 'string' && bMove.includes('bestmove')) {
          bMove = bMove.replace('bestmove ', '').split(' ')[0];
        }

        return res.json({
           position: fen,
           bestmove: bMove,
           evaluation: data.evaluation || data.eval || null,
           mate: data.mate || null,
           continuation: data.continuation || "",
           depth: depth
        });
      } else {
        return res.status(500).json({ error: data.error || "Failed to fetch from API" });
      }
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: error.message });
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
    // Support history api fallback
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
