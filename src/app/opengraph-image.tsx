
import { ImageResponse } from "next/og";

export const runtime = "edge";

export const alt = "Travyntra - Corporate Joy for Business Travel";
export const size = {
    width: 1200,
    height: 630,
};

export const contentType = "image/png";

export default async function Image() {
    return new ImageResponse(
        (
            <div
                style={{
                    background: "linear-gradient(to bottom right, #EEF2FF, #F5F3FF)",
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    fontFamily: "sans-serif",
                }}
            >
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        marginBottom: 40,
                    }}
                >
                    {/* Logo SVG Representation for OG Image */}
                    <svg
                        width="120"
                        height="120"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        style={{ marginRight: 20 }}
                    >
                        {/* Using a simplified path similar to the generated "bird" icon logic if we had the SVG path, 
                but for now using a stylized shape to represent the brand since we can't easily import the PNG here in Edge runtime 
                without fetch. We'll use a nice geometric abstraction. */}
                        <path
                            d="M3 21L21 3M3 21L12 21L21 3M3 21L3 12L21 3"
                            stroke="#4338CA"
                            strokeWidth="2"
                            fill="#4338CA"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                        <path
                            d="M2 12C2 17.5228 6.47715 22 12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2"
                            stroke="#F59E0B"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeDasharray="4 4"
                        />
                    </svg>
                    <div
                        style={{
                            fontSize: 80,
                            fontWeight: 900,
                            color: "#1e1b4b", // Indigo 950
                            letterSpacing: "-0.04em",
                        }}
                    >
                        Travyntra
                    </div>
                </div>
                <div
                    style={{
                        fontSize: 32,
                        fontWeight: 600,
                        color: "#4338CA", // Indigo 700
                        background: "#E0E7FF", // Indigo 100
                        padding: "16px 48px",
                        borderRadius: "50px",
                        marginBottom: 20,
                    }}
                >
                    Corporate Joy for Business Travel
                </div>
            </div>
        ),
        {
            ...size,
        }
    );
}
