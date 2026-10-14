
import "dotenv/config";

import express from "express";
import cors from "cors";

// Existing assistant routes
import assistantRoutes from "./routes/assistant.routes";

// Step 8 AI routes
import aiRoutes from "./assistant/ai/ai.routes";

const app = express();

// CORS must run before the API routes.
app.use(
  cors({
    origin: [
      "http://localhost:5500",
      "http://127.0.0.1:5500",
      "http://localhost:3001",
      "http://127.0.0.1:3001",
    ],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());

// Existing API
app.use("/api/assistant", assistantRoutes);

// Step 8 AI API
app.use("/api/assistant", aiRoutes);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`API running at http://localhost:${PORT}`);
});
