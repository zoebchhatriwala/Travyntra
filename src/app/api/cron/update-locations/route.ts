
import { NextResponse } from 'next/server';
import { updateLocationData } from '@/lib/services/location-updater';

export const dynamic = 'force-dynamic'; // Prevent caching
export const maxDuration = 300; // 5 minutes max execution time (Vercel specific, but good practice)

export async function GET(request: Request) {
    try {
        const authHeader = request.headers.get('authorization');

        // Simple protection: Check for CRON_SECRET if it exists in env, otherwise assume secure context or add one.
        // For local dev, we might skip. In prod, Vercel Cron sends specific headers or we use a secret.
        const cronSecret = process.env.CRON_SECRET;
        if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
            // also check for Vercel Cron header
            const isVercelCron = request.headers.get('vercel-user-agent') === 'vercel-cron/1.0';
            if (!isVercelCron) {
                return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
            }
        }

        const logs = await updateLocationData();

        return NextResponse.json({
            success: true,
            message: 'Location data updated successfully',
            logs
        });

    } catch (error: any) {
        console.error("Cron job failed:", error);
        return NextResponse.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
}
