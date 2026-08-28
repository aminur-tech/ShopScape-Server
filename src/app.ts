import express, { type Request, type Response } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";

import { env } from "./config/env";
import routes from "./routes";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";

export const app = express();

app.use(helmet());

app.use(
  cors({
    origin: env.FRONTEND_URL,
    credentials: true,
  })
);

app.use(express.json());

app.use(morgan(env.isProd ? "combined" : "dev"));

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
*/

app.use("/api", routes);

/*
|--------------------------------------------------------------------------
| Get All Registered Routes
|--------------------------------------------------------------------------
*/

function getRoutes(
  router: express.Router,
  prefix = ""
): {
  method: string;
  path: string;
}[] {
  const routesList: {
    method: string;
    path: string;
  }[] = [];

  const stack = (router as any).stack || [];

  for (const layer of stack) {
    // Normal route
    if (layer.route) {
      const path = prefix + layer.route.path;

      for (const method of Object.keys(layer.route.methods)) {
        routesList.push({
          method: method.toUpperCase(),
          path,
        });
      }
    }

    // Nested router
    else if (layer.name === "router" && layer.handle) {
      let nestedPrefix = prefix;

      if (layer.regexp) {
        const regexp = layer.regexp.toString();

        const match = regexp.match(
          /^\/\^\\\/\(\?:\\\/\(\[\^\\\/\]\+\?\)\)\?/
        );

        if (match) {
          nestedPrefix += "/:param";
        }
      }

      routesList.push(...getRoutes(layer.handle, nestedPrefix));
    }
  }

  return routesList;
}

/*
|--------------------------------------------------------------------------
| API Root - Show All Endpoints
|--------------------------------------------------------------------------
*/

app.get("/", (_req: Request, res: Response) => {
  const endpoints = getRoutes(routes);

  res.json({
    status: "ok",
    message: "ShopScape API is running 🚀",
    totalEndpoints: endpoints.length,
    endpoints,
  });
});

/*
|--------------------------------------------------------------------------
| 404
|--------------------------------------------------------------------------
*/

app.use(notFoundHandler);

/*
|--------------------------------------------------------------------------
| Error Handler
|--------------------------------------------------------------------------
*/

app.use(errorHandler);