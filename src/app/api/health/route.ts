import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
    const healthStats = {
        database: "down",
        api: "up",
        timestamp: new Date().toISOString(),
    };

    try {
        // Basic database heartbeat check
        await prisma.$queryRaw`SELECT 1`;
        healthStats.database = "up";
    } catch (error) {
        console.error("Health check failed for database:", error);
    }

    return NextResponse.json(healthStats);
}
