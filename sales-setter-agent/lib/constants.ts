export const APP_NAME = "Gerald — Sales Setter Agent";

export const COLORS = {
  primary: "#1a1a2e",
  primaryLight: "#16213e",
  accent: "#0f3460",
  accentLight: "#e94560",
  surface: "#ffffff",
  surfaceAlt: "#f8f9fa",
  border: "#e2e8f0",
  text: "#1a202c",
  textSecondary: "#718096",
  success: "#38a169",
  successLight: "#c6f6d5",
  error: "#e53e3e",
  errorLight: "#fed7d7",
  warning: "#d69e2e",
  warningLight: "#fefcbf",
} as const;

export const CALL_STATES = {
  IDLE: "idle",
  CONNECTING: "connecting",
  CONNECTED: "connected",
  ENDED: "ended",
  ERROR: "error",
} as const;

export type CallState = (typeof CALL_STATES)[keyof typeof CALL_STATES];
