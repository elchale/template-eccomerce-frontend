/**
 * Centralized validation regex used across the app. Keep regexes here so they
 * are unit-testable independently and don't get redefined per-component.
 */

/** Matches CSS hex colors: `#RRGGBB` or `#RRGGBBAA`. */
export const HEX_REGEX = /^#([0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/;
