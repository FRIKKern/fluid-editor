// Where our dev server is. FLUID_PORT lets several checkouts run their checks side by side.
export const PORT = Number(process.env.FLUID_PORT || 5178);
export const BASE = `http://127.0.0.1:${PORT}`;
