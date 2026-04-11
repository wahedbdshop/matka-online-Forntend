import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { prepareStandalone } from "./prepare-standalone.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

prepareStandalone();

await import(
  pathToFileURL(path.join(projectRoot, ".next", "standalone", "server.js")).href
);
