import { cp, mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const projectId = process.argv[2];
const title = process.argv.slice(3).join(" ").trim();
if (!projectId || !/^IL-\d{4}-\d{3}$/.test(projectId) || !title) {
  console.error("Usage: node tools/create-project.mjs IL-YYYY-001 \"Design title\"");
  process.exit(1);
}

const root = process.cwd();
const projectDir = resolve(root, "knowledge/projects", projectId);
const projectsRoot = resolve(root, "knowledge/projects");
if (!projectDir.startsWith(projectsRoot + "/")) {
  console.error("Invalid project ID.");
  process.exit(1);
}

try {
  await mkdir(projectDir, { recursive: false });
} catch {
  console.error(`Project already exists or cannot be created: ${projectId}`);
  process.exit(1);
}

const now = new Date().toISOString();
const templatePath = resolve(root, "knowledge/templates/project.json");
const project = JSON.parse(await readFile(templatePath, "utf8"));
Object.assign(project, { projectId, title, createdAt: now, updatedAt: now });
await mkdir(resolve(projectDir, "patterns"));
await writeFile(resolve(projectDir, "project.json"), `${JSON.stringify(project, null, 2)}\n`);

const indexPath = resolve(root, "knowledge/projects/index.json");
const index = JSON.parse(await readFile(indexPath, "utf8"));
index.projects.push({ projectId, title, state: "brief", updatedAt: now });
index.updatedAt = now;
await writeFile(indexPath, `${JSON.stringify(index, null, 2)}\n`);

console.log(JSON.stringify({ created: true, projectId, path: `knowledge/projects/${projectId}/project.json` }, null, 2));
