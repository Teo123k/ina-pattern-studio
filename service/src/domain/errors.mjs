export class ToolError extends Error {
  constructor(code, message, status = 400, details = undefined) {
    super(message);
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export function requireValue(condition, code, message, details) {
  if (!condition) throw new ToolError(code, message, 400, details);
}
