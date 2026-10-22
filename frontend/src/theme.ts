"use client";

import { createTheme } from "@mui/material/styles";

export const PALETTE = {
  text: {
    primary: "#0f172a",
    secondary: "#475569",
    muted: "#94a3b8",
  },
  background: {
    default: "#ffffff",
    subtle: "#f8fafc",
  },
  border: {
    default: "#e2e8f0",
  },
  action: {
    primary: "#334155",
    hover: "#0f172a",
  },
} as const;

const theme = createTheme({
  breakpoints: {
    values: {
      xs: 0,
      sm: 600,
      md: 768,
      lg: 1024,
      xl: 1440,
    },
  },
  palette: {
    primary: { main: PALETTE.action.primary },
    secondary: { main: PALETTE.text.secondary },
    text: {
      primary: PALETTE.text.primary,
      secondary: PALETTE.text.secondary,
      disabled: PALETTE.text.muted,
    },
    background: {
      default: PALETTE.background.default,
      paper: PALETTE.background.subtle,
    },
    divider: PALETTE.border.default,
  },
  typography: {
    fontFamily: "Roboto, Arial, Helvetica, sans-serif",
    h1: {
      fontWeight: 300,
      fontSize: 96,
      letterSpacing: -1.5,
    },
    h2: {
      fontWeight: 300,
      fontSize: 60,
      letterSpacing: -0.5,
    },
    h3: {
      fontWeight: 400,
      fontSize: 48,
      letterSpacing: 0,
    },
    h4: {
      fontWeight: 400,
      fontSize: 34,
      letterSpacing: 0.25,
    },
    h5: {
      fontWeight: 400,
      fontSize: 24,
      letterSpacing: 0,
    },
    h6: {
      fontWeight: 500,
      fontSize: 20,
      letterSpacing: 0.15,
    },
    subtitle1: {
      fontWeight: 400,
      fontSize: 16,
      letterSpacing: 0.15,
    },
    subtitle2: {
      fontWeight: 500,
      fontSize: 14,
      letterSpacing: 0.1,
    },
    body1: {
      fontWeight: 400,
      fontSize: 16,
      letterSpacing: 0.5,
    },
    body2: {
      fontWeight: 400,
      fontSize: 14,
      letterSpacing: 0.25,
    },
    button: {
      fontWeight: 500,
      fontSize: 14,
      letterSpacing: 1.25,
      textTransform: "uppercase",
    },
    caption: {
      fontWeight: 400,
      fontSize: 12,
      letterSpacing: 0.4,
    },
    overline: {
      fontWeight: 400,
      fontSize: 10,
      letterSpacing: 1.5,
      textTransform: "uppercase",
    },
  },
});

export default theme;
