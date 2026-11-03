function escapePdf(value) { return String(value).replaceAll("\\", "\\\\").replaceAll("(", "\\(").replaceAll(")", "\\)"); }

export function renderPatternPdf({ project, pattern, label = "TESTER DRAFT" }) {
  const draft = pattern.draft;
  const lines = [`INA PATTERN STUDIO - ${label}`, draft.title, `Pattern version: ${pattern.version}`, `Frame: ${draft.frame.diameterCm} cm diameter x ${draft.frame.heightCm} cm height`, `Fitting: ${draft.frame.fittingDescription}`, `Materials: ${draft.materials.yarn}; hook ${draft.materials.hookMm} mm; gauge ${draft.materials.gauge}`, `Repeat: ${draft.repeat.stitches} stitches x ${draft.repeat.count ?? "as needed"}`, "", ...draft.rows.map((row) => `Row ${row.number} (${row.stitchCount} sts): ${row.instruction}`), "", `Finishing: ${draft.finishing}`, "This is a draft for testing. It is not for sale and has not been physically verified.", `Project: ${project.id}`];
  const content = ["BT", "/F1 11 Tf", "50 760 Td", ...lines.flatMap((line, index) => [index ? "0 -18 Td" : "", `(${escapePdf(line)}) Tj`]).filter(Boolean), "ET"].join("\n");
  const objects = ["<< /Type /Catalog /Pages 2 0 R >>", "<< /Type /Pages /Kids [3 0 R] /Count 1 >>", "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>", `<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}\nendstream`, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"];
  let pdf = "%PDF-1.4\n"; const offsets = [0];
  for (let index = 0; index < objects.length; index += 1) { offsets.push(Buffer.byteLength(pdf)); pdf += `${index + 1} 0 obj\n${objects[index]}\nendobj\n`; }
  const xref = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.slice(1).map((offset) => `${String(offset).padStart(10, "0")} 00000 n `).join("\n")}\ntrailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(pdf, "ascii");
}
