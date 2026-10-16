export const locales = ["en", "th"] as const;
export const defaultLocale = "en";
export type Locale = (typeof locales)[number];
