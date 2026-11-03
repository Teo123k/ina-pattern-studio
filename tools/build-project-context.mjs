import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const projectId = process.argv[2];
if (!projectId || !/^IL-\d{4}-\d{3}$/.test(projectId)) {
  console.error("Usage: node tools/build-project-context.mjs IL-YYYY-001");
  process.exit(1);
}

const root = process.cwd();
const path = resolve(root, "knowledge/projects", projectId, "project.json");
if (!path.startsWith(resolve(root, "knowledge/projects") + "/")) {
  console.error("Invalid project ID.");
  process.exit(1);
}

let project;
try {
  project = JSON.parse(await readFile(path, "utf8"));
} catch {
  console.error(`Project record not found or invalid: ${projectId}`);
  process.exit(1);
}

const brief = Object.fromEntries(Object.entries(project.brief ?? {}).map(([key, item]) => [
  key,
  { value: item.value, status: item.status }
]));

const packet = {
  projectId: project.projectId,
  title: project.title,
  state: project.state,
  confirmedBrief: brief,
  material: project.material,
  concept: project.concept,
  pattern: project.pattern,
  testing: project.testing,
  release: project.release,
  nextAllowedAction: project.nextAllowedAction,
  nonNegotiable: [
    "Do not invent unconfirmed facts.",
    "Do not make safety or certification claims.",
    "Do not publish or make external actions.",
    "Report missing confirmations before drafting a pattern."
  ]
};

console.log(JSON.stringify(packet, null, 2));
