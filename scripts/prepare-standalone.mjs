import { cpSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const standaloneRoot = path.join(projectRoot, ".next", "standalone");

function copyIfPresent(sourcePath, targetPath) {
  if (!existsSync(sourcePath) || !existsSync(standaloneRoot)) {
    return false;
  }

  mkdirSync(path.dirname(targetPath), { recursive: true });
  cpSync(sourcePath, targetPath, { recursive: true, force: true });
  return true;
}

export function prepareStandalone() {
  const copiedStatic = copyIfPresent(
    path.join(projectRoot, ".next", "static"),
    path.join(standaloneRoot, ".next", "static"),
  );
  const copiedPublic = copyIfPresent(
    path.join(projectRoot, "public"),
    path.join(standaloneRoot, "public"),
  );

  return { copiedStatic, copiedPublic };
}

const executedDirectly = process.argv[1]
  ? path.resolve(process.argv[1]) === __filename
  : false;

if (executedDirectly) {
  prepareStandalone();
}
