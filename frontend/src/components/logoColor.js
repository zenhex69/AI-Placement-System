/**
 * Returns a deterministic CSS class for a company logo background
 * based on the first character of the company name.
 * Classes logo-color-0 … logo-color-5 are defined in App.css.
 */
export function logoColorClass(name = "") {
  const idx = (name.charCodeAt(0) || 0) % 6;
  return `logo-color-${idx}`;
}
