import type { Config } from "tailwindcss";
import tailwindAnimate from "tailwindcss-animate";

const config: Config = {
    content: [
        "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                border: "var(--border)",
                input: "var(--input)",
                ring: "var(--ring)",
                background: "var(--background)",
                foreground: "var(--foreground)",
                primary: {
                    DEFAULT: "var(--primary)",
                    foreground: "var(--primary-foreground)",
                },
                secondary: {
                    DEFAULT: "var(--secondary)",
                    foreground: "var(--secondary-foreground)",
                },
                destructive: {
                    DEFAULT: "var(--destructive)",
                    foreground: "var(--destructive-foreground)",
                },
                muted: {
                    DEFAULT: "var(--muted)",
                    foreground: "var(--muted-foreground)",
                },
                accent: {
                    DEFAULT: "var(--accent)",
                    foreground: "var(--accent-foreground)",
                },
                popover: {
                    DEFAULT: "var(--popover)",
                    foreground: "var(--popover-foreground)",
                },
                card: {
                    DEFAULT: "var(--card)",
                    foreground: "var(--card-foreground)",
                },

                // Direct access to MD3 System Tokens
                "md-sys": {
                    primary: "var(--md-sys-color-primary)",
                    "on-primary": "var(--md-sys-color-on-primary)",
                    "primary-container": "var(--md-sys-color-primary-container)",
                    "on-primary-container": "var(--md-sys-color-on-primary-container)",

                    secondary: "var(--md-sys-color-secondary)",
                    "on-secondary": "var(--md-sys-color-on-secondary)",
                    "secondary-container": "var(--md-sys-color-secondary-container)",
                    "on-secondary-container": "var(--md-sys-color-on-secondary-container)",

                    tertiary: "var(--md-sys-color-tertiary)",
                    "on-tertiary": "var(--md-sys-color-on-tertiary)",
                    "tertiary-container": "var(--md-sys-color-tertiary-container)",
                    "on-tertiary-container": "var(--md-sys-color-on-tertiary-container)",

                    error: "var(--md-sys-color-error)",
                    "on-error": "var(--md-sys-color-on-error)",

                    background: "var(--md-sys-color-background)",
                    "on-background": "var(--md-sys-color-on-background)",

                    surface: "var(--md-sys-color-surface)",
                    "on-surface": "var(--md-sys-color-on-surface)",
                    "surface-variant": "var(--md-sys-color-surface-variant)",
                    "on-surface-variant": "var(--md-sys-color-on-surface-variant)",

                    outline: "var(--md-sys-color-outline)",
                }
            },
            borderRadius: {
                lg: "var(--radius)",
                md: "calc(var(--radius) - 2px)",
                sm: "calc(var(--radius) - 4px)",
                // Extended MD3 shapes
                "corner-xs": "var(--md-sys-shape-corner-xs)",
                "corner-sm": "var(--md-sys-shape-corner-sm)",
                "corner-md": "var(--md-sys-shape-corner-md)",
                "corner-lg": "var(--md-sys-shape-corner-lg)",
                "corner-xl": "var(--md-sys-shape-corner-xl)",
                "corner-full": "var(--md-sys-shape-corner-full)",
            },
        },
    },
    plugins: [tailwindAnimate],
};

export default config;
