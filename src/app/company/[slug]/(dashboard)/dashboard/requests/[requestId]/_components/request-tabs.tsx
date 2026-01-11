"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function RequestTabs({ slug, requestId }: { slug: string, requestId: string }) {
    const pathname = usePathname();
    const cleanPath = pathname?.endsWith("/") ? pathname.slice(0, -1) : pathname;

    const baseUrl = `/company/${slug}/dashboard/requests/${requestId}`;

    // Check if we are on the base URL (Overview) or sub-routes
    const isOverview = cleanPath === baseUrl;
    const isDiscussion = cleanPath === `${baseUrl}/discussion`;

    return (
        <div className="flex items-center gap-6 border-t border-gray-100 pt-1 -mb-px">
            <Link
                href={baseUrl}
                className={cn(
                    "text-sm font-bold py-3 border-b-2 transition-colors",
                    isOverview
                        ? "border-indigo-600 text-indigo-600"
                        : "border-transparent text-gray-500 hover:text-gray-900 hover:border-gray-200"
                )}
            >
                Overview
            </Link>
            <Link
                href={`${baseUrl}/discussion`}
                className={cn(
                    "text-sm font-bold py-3 border-b-2 transition-colors",
                    isDiscussion
                        ? "border-indigo-600 text-indigo-600"
                        : "border-transparent text-gray-500 hover:text-gray-900 hover:border-gray-200"
                )}
            >
                Discussion
            </Link>
        </div>
    );
}
