import { config } from "./config.js";
import { openDb } from "./db.js";
import { buildApp } from "./app.js";
import { deleteExpiredSessions } from "./repo.js";

const db = openDb(config.dbPath);

// Sweep expired sessions on boot and hourly.
deleteExpiredSessions(db, new Date().toISOString());
setInterval(() => deleteExpiredSessions(db, new Date().toISOString()), 60 * 60 * 1000).unref();

const app = buildApp(db);

app
  .listen({ port: config.port, host: "0.0.0.0" })
  .then(() => app.log.info(`OpenAvail API listening on ${config.port}`))
  .catch((err) => {
    app.log.error(err);
    process.exit(1);
  });
