import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function DashboardPage() {
    return (
        <>
            <Header title="Dashboard">
                <Button>New Request</Button>
            </Header>

            <div style={{ padding: '2rem', display: 'grid', gap: '1.5rem', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
                <Card>
                    <CardHeader>
                        <CardTitle>Active Requests</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted">No active travel requests.</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Upcoming Trips</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted">No upcoming trips scheduled.</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Recent Expenses</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">$0.00</div>
                        <p className="text-muted text-sm decoration-muted">Last 30 days</p>
                    </CardContent>
                </Card>
            </div>
        </>
    );
}
