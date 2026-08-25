import { app } from "./app";
import { env } from "./config/env";
// Registers the order-status -> notification listener as a side effect.
import "./events/orderEvents";

const server = app.listen(env.PORT, () => {
  console.log(`🚀 API running on http://localhost:${env.PORT}`);
});

process.on("SIGTERM", () => {
  server.close(() => process.exit(0));
});
