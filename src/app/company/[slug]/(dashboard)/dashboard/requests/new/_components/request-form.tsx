"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { createTripRequest, updateTripRequest } from "../../../actions";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Plane, Calendar, FileText } from "lucide-react";

const requestSchema = z.object({
    title: z.string().min(5, "Title acts as the subject line, make it descriptive (min 5 chars)."),
    destination: z.string().min(2, "Destination is required"),
    startDate: z.string().refine((val) => !isNaN(Date.parse(val)), "Invalid start date"),
    endDate: z.string().refine((val) => !isNaN(Date.parse(val)), "Invalid end date"),
    purpose: z.string().min(10, "Please provide more context about the purpose of this trip."),
    // We use string for budget in the form to handle empty states better with HTML inputs, then parse it
    budget: z.string().optional(),
    flightPreferences: z.string().optional(),
    hotelPreferences: z.string().optional(),
});

type RequestFormValues = z.infer<typeof requestSchema>;

interface RequestFormProps {
    slug: string;
    currency: string;
    initialData?: any;
    requestId?: string;
}

export function RequestForm({ slug, currency, initialData, requestId }: RequestFormProps) {
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const preferences = initialData?.preferences as any;

    const form = useForm<RequestFormValues>({
        resolver: zodResolver(requestSchema),
        defaultValues: {
            title: initialData?.title || "",
            destination: initialData?.destination || "",
            purpose: initialData?.purpose || "",
            budget: initialData?.budget ? initialData.budget.toString() : "",
            flightPreferences: preferences?.flight || "",
            hotelPreferences: preferences?.hotel || "",
            startDate: initialData?.startDate ? new Date(initialData.startDate).toISOString().split('T')[0] : "",
            endDate: initialData?.endDate ? new Date(initialData.endDate).toISOString().split('T')[0] : "",
        },
    });

    async function onSubmit(data: RequestFormValues) {
        setIsSubmitting(true);
        try {
            const preferences = {
                flight: data.flightPreferences,
                hotel: data.hotelPreferences,
            };

            if (initialData && requestId) {
                const result = await updateTripRequest(requestId, {
                    title: data.title,
                    destination: data.destination,
                    startDate: new Date(data.startDate),
                    endDate: new Date(data.endDate),
                    purpose: data.purpose,
                    budget: data.budget ? Number(data.budget) : undefined,
                    preferences,
                });

                if (result.error) {
                    toast.error(result.error);
                    return;
                }

                toast.success("Trip request updated successfully!");
                router.push(`/company/${slug}/dashboard/requests/${requestId}`);
            } else {
                const result = await createTripRequest({
                    title: data.title,
                    destination: data.destination,
                    startDate: new Date(data.startDate),
                    endDate: new Date(data.endDate),
                    purpose: data.purpose,
                    budget: data.budget ? Number(data.budget) : undefined,
                    preferences,
                });

                if (result.error) {
                    toast.error(result.error);
                    return;
                }

                toast.success("Trip request drafted successfully!");
                router.push(`/company/${slug}/dashboard`);
            }
        } catch (error) {
            toast.error("Something went wrong. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    }


    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 max-w-4xl mx-auto">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Main Details */}
                    <div className="md:col-span-2 space-y-6">
                        <Card className="border-none shadow-sm bg-white/50 backdrop-blur-sm">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-xl font-display text-gray-800">
                                    <Plane className="w-5 h-5 text-indigo-500" />
                                    Trip Details
                                </CardTitle>
                                <CardDescription>
                                    Where are you going and why? giving clear details helps accelerate approval.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <FormField
                                    control={form.control}
                                    name="title"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Request Title</FormLabel>
                                            <FormControl>
                                                <Input placeholder="e.g. Q4 Sales Conference in Berlin" {...field} className="bg-white" />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="destination"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Destination</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="City, Country" {...field} className="bg-white" />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="budget"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Estimated Budget</FormLabel>
                                                <FormControl>
                                                    <div className="relative">
                                                        <span className="absolute left-3 top-2.5 text-gray-400 text-sm">{currency}</span>
                                                        <Input type="number" placeholder="0.00" className="pl-12 bg-white" {...field} />
                                                    </div>
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                <FormField
                                    control={form.control}
                                    name="purpose"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Business Purpose</FormLabel>
                                            <FormControl>
                                                <Textarea
                                                    placeholder="Describe the reason for this trip..."
                                                    className="resize-none min-h-[100px] bg-white"
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </CardContent>
                        </Card>

                        <Card className="border-none shadow-sm bg-white/50 backdrop-blur-sm">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-xl font-display text-gray-800">
                                    <FileText className="w-5 h-5 text-indigo-500" />
                                    Preferences
                                </CardTitle>
                                <CardDescription>
                                    Help the travel agents book the best options for you.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <FormField
                                    control={form.control}
                                    name="flightPreferences"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Flight Preferences</FormLabel>
                                            <FormControl>
                                                <Textarea
                                                    placeholder="e.g. Aisle seat, Late morning departure, SkyTeam alliance..."
                                                    className="resize-none bg-white"
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="hotelPreferences"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Hotel Preferences</FormLabel>
                                            <FormControl>
                                                <Textarea
                                                    placeholder="e.g. Near City Center, Gym required, High floor..."
                                                    className="resize-none bg-white"
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </CardContent>
                        </Card>
                    </div>

                    {/* Sidebar / Dates */}
                    <div className="space-y-6">
                        <Card className="border-none shadow-sm bg-indigo-50/50 backdrop-blur-sm sticky top-24">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-lg font-display text-gray-800">
                                    <Calendar className="w-4 h-4 text-indigo-500" />
                                    Timing
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <FormField
                                    control={form.control}
                                    name="startDate"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Start Date</FormLabel>
                                            <FormControl>
                                                <Input type="date" className="bg-white" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="endDate"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>End Date</FormLabel>
                                            <FormControl>
                                                <Input type="date" className="bg-white" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <div className="pt-4">
                                    <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200 transition-all hover:scale-[1.02]" disabled={isSubmitting}>
                                        {isSubmitting ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                {initialData ? "Updating Request..." : "Creating Request..."}
                                            </>
                                        ) : (
                                            initialData ? "Update Request" : "Submit Request"
                                        )}
                                    </Button>

                                    <p className="text-xs text-center text-gray-400 mt-3">
                                        This will start the approval workflow.
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </form>
        </Form>
    );
}
