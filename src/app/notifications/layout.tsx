
import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Notifications | Travyntra",
    description: "Manage your travel alerts and notifications.",
};

export default function NotificationsLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen bg-gray-50/50">
            {children}
        </div>
    );
}
