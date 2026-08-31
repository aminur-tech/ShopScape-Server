import { app } from "../src/app";
 
// Register event listeners as a side effect.
import "../src/events/orderEvents";
 
// This is the file Vercel auto-detects as a Serverless Function
// (any file directly under /api becomes one, zero-config).
export default app;