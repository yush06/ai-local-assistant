import "dotenv/config";

import express from "express";

// Existing assistant routes
import assistantRoutes from "./routes/assistant.routes";

// New Step 8 AI routes
import aiRoutes from "./assistant/ai/ai.routes";

const app = express();

app.use(express.json());

// Existing API
app.use("/api/assistant", assistantRoutes);

// Step 8 AI API
app.use("/api/assistant", aiRoutes);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`API running at http://localhost:${PORT}`);
});