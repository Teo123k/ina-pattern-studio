import { requireValue } from "../domain/errors.mjs";

export function buildGeometryPreview({ geometry, geometryVersion, surface }) {
  requireValue(geometry?.status === "CONFIRMED" && geometry.version === geometryVersion, "stale_geometry", "Use the current confirmed geometry version.");
  requireValue(surface && Number.isInteger(surface.stitchesAround) && surface.stitchesAround > 0 && Number.isInteger(surface.rows) && surface.rows > 0 && Number.isFinite(surface.rowHeightCm) && surface.rowHeightCm > 0, "invalid_stitch_surface", "stitchesAround, rows and measured/assumed rowHeightCm are required.");
  requireValue(["assumed", "swatch_calibrated", "physical_comparison"].includes(surface.calibration), "invalid_stitch_surface", "Surface calibration must be assumed, swatch_calibrated or physical_comparison.");
  const apertures = surface.apertures ?? [];
  requireValue(Array.isArray(apertures) && apertures.every((item) => Number.isFinite(item.widthCm) && item.widthCm > 0 && Number.isFinite(item.heightCm) && item.heightCm > 0 && Number.isInteger(item.count) && item.count > 0), "invalid_stitch_surface", "Each aperture needs positive widthCm, heightCm and integer count.");
  const frame = geometry.frame;
  const bulb = geometry.bulb;
  const averageDiameterCm = (frame.topRingInnerDiameterCm + frame.bottomRingInnerDiameterCm) / 2;
  const surfaceHeightCm = Math.min(frame.shadeHeightCm, surface.rows * surface.rowHeightCm);
  const surfaceAreaCm2 = Math.PI * averageDiameterCm * surfaceHeightCm;
  const apertureAreaCm2 = apertures.reduce((total, item) => total + item.widthCm * item.heightCm * item.count, 0);
  requireValue(apertureAreaCm2 <= surfaceAreaCm2, "invalid_stitch_surface", "Declared aperture area cannot exceed the shade surface area.");
  const openAreaPercent = (apertureAreaCm2 / surfaceAreaCm2) * 100;
  const bulbRadiusCm = bulb.maxDiameterCm / 2;
  const clearanceMap = [
    { location: "top_ring", radialClearanceCm: frame.topRingInnerDiameterCm / 2 - bulbRadiusCm - bulb.radialOffsetCm },
    { location: "bottom_ring", radialClearanceCm: frame.bottomRingInnerDiameterCm / 2 - bulbRadiusCm - bulb.radialOffsetCm },
    { location: "top_position", axialClearanceCm: geometry.calculated.topClearanceCm }
  ];
  const status = { assumed: "UNCALIBRATED_DIGITAL_CONCEPT", swatch_calibrated: "CALIBRATED_DIGITAL_PROTOTYPE", physical_comparison: "PHYSICALLY_VERIFIED_PROTOTYPE" }[surface.calibration];
  const warnings = [...clearanceMap.filter((item) => (item.radialClearanceCm ?? item.axialClearanceCm) <= 0).map((item) => `Bulb envelope intersects at ${item.location}.`)];
  if (openAreaPercent < geometry.lighting.airflowOpenTextilePercent.minimum || openAreaPercent > geometry.lighting.airflowOpenTextilePercent.maximum) warnings.push(`Declared open area ${openAreaPercent.toFixed(1)}% is outside the prototype target of ${geometry.lighting.airflowOpenTextilePercent.minimum}-${geometry.lighting.airflowOpenTextilePercent.maximum}%.`);
  warnings.push("Digital geometry prediction only. Follow fixture and bulb manufacturer instructions; complete supervised physical temperature and airflow checks before sale approval.");
  const report = { status, geometryVersion, dimensions: { topRingInnerDiameterCm: frame.topRingInnerDiameterCm, bottomRingInnerDiameterCm: frame.bottomRingInnerDiameterCm, shadeHeightCm: frame.shadeHeightCm, renderedSurfaceHeightCm: surfaceHeightCm }, stitchSurface: { stitchesAround: surface.stitchesAround, rows: surface.rows, repeatStitches: surface.repeatStitches ?? null, openAreaPercent, apertureAreaCm2, surfaceAreaCm2 }, bulbEnvelope: { identity: bulb.identity, maximumDiameterCm: bulb.maxDiameterCm, heightCm: bulb.heightCm, radialOffsetCm: bulb.radialOffsetCm }, clearanceMap, warnings };
  return { report, glb: buildGlb({ topRadius: frame.topRingInnerDiameterCm / 2, bottomRadius: frame.bottomRingInnerDiameterCm / 2, height: surfaceHeightCm, bulbRadius: bulbRadiusCm, bulbHeight: bulb.heightCm, bulbTop: bulb.topRelativeToTopRingCm }) };
}

function buildGlb({ topRadius, bottomRadius, height, bulbRadius, bulbHeight, bulbTop }) {
  const shade = cylinder(topRadius, bottomRadius, height, 32, -height / 2);
  const bulb = cylinder(bulbRadius, bulbRadius, bulbHeight, 24, -bulbTop - bulbHeight / 2);
  const packed = pack([shade, bulb]);
  const json = { asset: { version: "2.0", generator: "INA Pattern Studio Geometry Preview v1" }, scenes: [{ nodes: [0, 1] }], scene: 0, nodes: [{ mesh: 0, name: "crochet_surface_prediction" }, { mesh: 1, name: "bulb_envelope" }], meshes: packed.meshes, materials: [{ name: "crochet_prediction", pbrMetallicRoughness: { baseColorFactor: [0.82, 0.72, 0.55, 0.45], metallicFactor: 0, roughnessFactor: 0.9 }, alphaMode: "BLEND" }, { name: "bulb_envelope", pbrMetallicRoughness: { baseColorFactor: [1, 0.82, 0.3, 0.55], metallicFactor: 0, roughnessFactor: 0.4 }, alphaMode: "BLEND" }], buffers: [{ byteLength: packed.binary.length }], bufferViews: packed.bufferViews, accessors: packed.accessors };
  const jsonBytes = padded(Buffer.from(JSON.stringify(json)), 0x20);
  const binary = padded(packed.binary, 0);
  const total = 12 + 8 + jsonBytes.length + 8 + binary.length;
  const header = Buffer.alloc(12); header.writeUInt32LE(0x46546c67, 0); header.writeUInt32LE(2, 4); header.writeUInt32LE(total, 8);
  const jsonHeader = Buffer.alloc(8); jsonHeader.writeUInt32LE(jsonBytes.length, 0); jsonHeader.writeUInt32LE(0x4e4f534a, 4);
  const binHeader = Buffer.alloc(8); binHeader.writeUInt32LE(binary.length, 0); binHeader.writeUInt32LE(0x004e4942, 4);
  return Buffer.concat([header, jsonHeader, jsonBytes, binHeader, binary]);
}

function cylinder(top, bottom, height, segments, centreZ) {
  const positions = []; const indices = [];
  for (let row = 0; row < 2; row += 1) for (let index = 0; index < segments; index += 1) { const angle = (index / segments) * Math.PI * 2; const radius = row ? bottom : top; positions.push(radius * Math.cos(angle), radius * Math.sin(angle), centreZ + (row ? -height / 2 : height / 2)); }
  for (let index = 0; index < segments; index += 1) { const next = (index + 1) % segments; indices.push(index, next, segments + next, index, segments + next, segments + index); }
  return { positions: new Float32Array(positions), indices: new Uint16Array(indices) };
}

function pack(parts) {
  const chunks = []; const bufferViews = []; const accessors = []; const meshes = []; let offset = 0;
  for (let index = 0; index < parts.length; index += 1) {
    const part = parts[index]; const positionBytes = Buffer.from(part.positions.buffer); const indexBytes = Buffer.from(part.indices.buffer); const posOffset = offset; chunks.push(positionBytes); offset += positionBytes.length; const idxOffset = offset; chunks.push(indexBytes); offset += indexBytes.length;
    const posView = bufferViews.push({ buffer: 0, byteOffset: posOffset, byteLength: positionBytes.length, target: 34962 }) - 1; const idxView = bufferViews.push({ buffer: 0, byteOffset: idxOffset, byteLength: indexBytes.length, target: 34963 }) - 1;
    const bounds = [0, 1, 2].map((axis) => ({ min: Infinity, max: -Infinity })); for (let vertex = 0; vertex < part.positions.length; vertex += 3) for (let axis = 0; axis < 3; axis += 1) { bounds[axis].min = Math.min(bounds[axis].min, part.positions[vertex + axis]); bounds[axis].max = Math.max(bounds[axis].max, part.positions[vertex + axis]); }
    const posAccessor = accessors.push({ bufferView: posView, componentType: 5126, count: part.positions.length / 3, type: "VEC3", min: bounds.map((item) => item.min), max: bounds.map((item) => item.max) }) - 1; const idxAccessor = accessors.push({ bufferView: idxView, componentType: 5123, count: part.indices.length, type: "SCALAR" }) - 1;
    meshes.push({ primitives: [{ attributes: { POSITION: posAccessor }, indices: idxAccessor, material: index }] });
  }
  return { binary: Buffer.concat(chunks), bufferViews, accessors, meshes };
}

function padded(value, fill) { const padding = (4 - (value.length % 4)) % 4; return padding ? Buffer.concat([value, Buffer.alloc(padding, fill)]) : value; }
