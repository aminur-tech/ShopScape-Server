import { app } from "./app";

// Register event listeners as a side effect.
import "./events/orderEvents";

// Vercel Serverless Function handler
export default app;