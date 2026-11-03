export class MockConceptAdapter {
  constructor({ now = () => new Date().toISOString() } = {}) { this.now = now; }
  async generate() {
    const concepts = [
      ["Open shell", "A light openwork shell made from a repeated beginner-friendly motif.", "Use a repeating shell family with a documented frame attachment."],
      ["Ribbed wave", "A regular vertical wave with alternating texture and open spaces.", "Use consistent front-post texture and a fixed repeat around the drum frame."],
      ["Lattice band", "A restrained geometric lattice with clear horizontal bands.", "Use chain spaces and anchored groups, keeping the band repeat explicit."]
    ].map(([title, description, likelyConstruction], index) => ({ id: `concept-${index + 1}`, title, description, likelyConstruction, illustrationLabel: "AI concept illustration; not a measured pattern", imagePath: null }));
    return { provider: "mock", model: "deterministic", generatedAt: this.now(), estimatedCostPence: 0, concepts };
  }
}
