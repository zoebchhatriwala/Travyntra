
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function AnalyticsLoading() {
    return (
        <div className="p-8 space-y-8 animate-in fade-in duration-500">
            <div>
                <Skeleton className="h-8 w-64 mb-2" />
                <Skeleton className="h-4 w-96" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                    <Card key={i} className="border-none shadow-joy rounded-corner-xl bg-white">
                        <CardHeader className="pb-2">
                            <Skeleton className="h-4 w-24" />
                        </CardHeader>
                        <CardContent>
                            <Skeleton className="h-10 w-32 mb-2" />
                            <Skeleton className="h-3 w-40" />
                        </CardContent>
                    </Card>
                ))}
            </div>

            <Card className="border-none shadow-joy rounded-corner-xl bg-white h-[400px]">
                <CardContent className="p-6">
                    <Skeleton className="h-full w-full" />
                </CardContent>
            </Card>
        </div>
    );
}
