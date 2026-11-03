import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const projectId = process.argv[2];
if (!projectId || !/^IL-\d{4}-\d{3}$/.test(projectId)) {
  console.error("Usage: node tools/validate-project-record.mjs IL-YYYY-001");
  process.exit(1);
}

const states = new Set(["brief", "concept_review", "construction", "pattern_draft", "prototype", "tester_review", "release_candidate", "approved", "etsy_draft_created", "published"]);
const root = process.cwd();
const path = resolve(root, "knowledge/projects", projectId, "project.json");
let project;
try {
  project = JSON.parse(await readFile(path, "utf8"));
} catch {
  console.error(`Project record not found or invalid JSON: ${projectId}`);
  process.exit(1);
}

const errors = [];
if (project.projectId !== projectId) errors.push("projectId must match the directory name.");
if (!states.has(project.state)) errors.push("state is not recognised.");
if (!project.brief || typeof project.brief !== "object") errors.push("brief is required.");
if (!project.testing || typeof project.testing !== "object") errors.push("testing is required.");
if (!project.release || typeof project.release !== "object") errors.push("release is required.");

if (["construction", "pattern_draft", "prototype", "tester_review", "release_candidate", "approved", "etsy_draft_created", "published"].includes(project.state)) {
  for (const key of ["frameDiameterCm", "frameHeightCm", "fittingType"]) {
    if (project.brief?.[key]?.status !== "CONFIRMED") errors.push(`${key} must be CONFIRMED before construction.`);
  }
  if (project.material?.gaugeStatus !== "CONFIRMED") errors.push("Gauge must be CONFIRMED before construction.");
}

if (["approved", "etsy_draft_created", "published"].includes(project.state)) {
  if (project.release.ivanaApproval !== true) errors.push("Ivana approval is required for this state.");
  if (project.testing.prototypeCount < 2) errors.push("Two prototypes are required for this state.");
  if (project.testing.testerCount < 3) errors.push("Three independent testers are required for this state.");
  if (project.testing.criticalIssuesOpen !== 0) errors.push("Critical issues must be resolved for this state.");
  if (!project.release.finalPdfPath) errors.push("Final PDF path is required for this state.");
}

if (errors.length) {
  console.error(JSON.stringify({ valid: false, projectId, errors }, null, 2));
  process.exit(1);
}
console.log(JSON.stringify({ valid: true, projectId, state: project.state }, null, 2));
