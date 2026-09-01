import express, { type Request, type Response } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";

import { env } from "./config/env";
import routes from "./routes";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";

export const app = express();

/* -------------------------------------------------------------------------- */
/* Security                                                                   */
/* -------------------------------------------------------------------------- */

app.use(
  helmet({
    crossOriginResourcePolicy: false,
    contentSecurityPolicy: {
      directives: {
        ...helmet.contentSecurityPolicy.getDefaultDirectives(),
        // Next.js frontend origin ke iframe embedding er permission dibe
        "frame-ancestors": ["'self'", env.FRONTEND_URL],
      },
    },
    frameguard: false, // iframe embedding restrict block off korar jonno
  })
);

/* -------------------------------------------------------------------------- */
/* CORS                                                                      */
/* -------------------------------------------------------------------------- */

app.use(
  cors({
    origin: env.FRONTEND_URL,
    credentials: true,
  })
);

/* -------------------------------------------------------------------------- */
/* Body Parser                                                                */
/* -------------------------------------------------------------------------- */

app.use(
  express.json({
    limit: "2mb",
  })
);

app.use(
  express.urlencoded({
    extended: true,
    limit: "2mb",
  })
);

/* -------------------------------------------------------------------------- */
/* Logger                                                                    */
/* -------------------------------------------------------------------------- */

app.use(
  morgan(
    env.isProd
      ? "combined"
      : "dev"
  )
);

/* -------------------------------------------------------------------------- */
/* API Root                                                                  */
/* -------------------------------------------------------------------------- */

app.get("/", (_req: Request, res: Response) => {
  res.status(200).json({
    status: "ok",
    message: "ShopScape API is running 🚀",
    environment: env.isProd ? "production" : "development",
  });
});

/* -------------------------------------------------------------------------- */
/* API Routes                                                                */
/* -------------------------------------------------------------------------- */

app.use("/api", routes);

/* -------------------------------------------------------------------------- */
/* 404 & Error Handling                                                      */
/* -------------------------------------------------------------------------- */

app.use(notFoundHandler);
app.use(errorHandler);