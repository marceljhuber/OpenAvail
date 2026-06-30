import Fastify from "fastify";
import { config } from "./config.js";

const app = Fastify({ logger: { transport: undefined, level: "info" } });

app.get("/api/health", async () => ({ ok: true }));

// Routes (auth, state, vote, admin) are registered in the following steps.

app
  .listen({ port: config.port, host: "0.0.0.0" })
  .then(() => app.log.info(`OpenAvail API listening on ${config.port}`))
  .catch((err) => {
    app.log.error(err);
    process.exit(1);
  });
