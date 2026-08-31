import { app } from "./app";
import { env } from "./config/env";

// Register event listeners as a side effect.
import "./events/orderEvents";

// Only bind to a port for local dev / traditional Node hosting.
// On Vercel, the platform itself invokes the exported handler per request,
// so calling .listen() there is unnecessary (and process.env.VERCEL is set).
if (!process.env.VERCEL) {
  app.listen(env.PORT, () => {
    console.log(`🚀 Server running on http://localhost:${env.PORT}`);
  });
}

// Vercel Serverless Function handler
export default app;