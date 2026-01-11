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
import { Loader2, Plane, Calendar, FileText, Users } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const requestSchema = z.object({
    title: z.string().min(5, "Title acts as the subject line, make it descriptive (min 5 chars)."),
    destination: z.string().min(2, "Destination is required"),
    startDate: z.string().refine((val) => !isNaN(Date.parse(val)), "Invalid start date"),
    endDate: z.string().refine((val) => !isNaN(Date.parse(val)), "Invalid end date"),
    purpose: z.string().min(10, "Please provide more context about the purpose of this trip."),
    budget: z.string().optional(),
    flightPreferences: z.string().optional(),
    hotelPreferences: z.string().optional(),
    carPreferences: z.string().optional(),
    trainPreferences: z.string().optional(),
    otherPreferences: z.string().optional(),
    isGroup: z.boolean().default(false),
    parentTripId: z.string().optional(),
});

type RequestFormValues = z.infer<typeof requestSchema>;

interface RequestFormProps {
    slug: string;
    currency: string;
    initialData?: any;
    requestId?: string;
    groupTrips?: {
        id: string;
        title: string;
        destination: string;
        startDate: Date;
        endDate: Date;
    }[];
}

export function RequestForm({ slug, currency, initialData, requestId, groupTrips = [] }: RequestFormProps) {
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const preferences = initialData?.preferences as any;

    const form = useForm<RequestFormValues>({
        resolver: zodResolver(requestSchema) as any,
        defaultValues: {
            title: initialData?.title || "",
            destination: initialData?.destination || "",
            purpose: initialData?.purpose || "",
            budget: initialData?.budget ? initialData.budget.toString() : "",
            flightPreferences: preferences?.flight || "",
            hotelPreferences: preferences?.hotel || "",
            carPreferences: preferences?.car || "",
            trainPreferences: preferences?.train || "",
            otherPreferences: preferences?.other || "",
            startDate: initialData?.startDate ? new Date(initialData.startDate).toISOString().split('T')[0] : "",
            endDate: initialData?.endDate ? new Date(initialData.endDate).toISOString().split('T')[0] : "",
            isGroup: initialData?.isGroup || false,
            parentTripId: initialData?.parentTripId || "none",
        },
    });

    async function onSubmit(data: RequestFormValues) {
        setIsSubmitting(true);
        try {
            const preferences = {
                flight: data.flightPreferences,
                hotel: data.hotelPreferences,
                car: data.carPreferences,
                train: data.trainPreferences,
                other: data.otherPreferences,
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
                    isGroup: data.isGroup,
                    parentTripId: data.parentTripId === "none" ? undefined : data.parentTripId,
                });

                if (result.error) {
                    toast.error(result.error);
                    return;
                }

                toast.success(data.isGroup ? "Group trip created successfully!" : "Trip request drafted successfully!");
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
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <FormField
                                        control={form.control}
                                        name="flightPreferences"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Flight Preferences</FormLabel>
                                                <FormControl>
                                                    <Textarea
                                                        placeholder="Airline, Seat choice, Time..."
                                                        className="resize-none bg-white h-24"
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
                                                        placeholder="Location, Room type, Amenities..."
                                                        className="resize-none bg-white h-24"
                                                        {...field}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="trainPreferences"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Train / Rail</FormLabel>
                                                <FormControl>
                                                    <Textarea
                                                        placeholder="Class, Seat type, Route..."
                                                        className="resize-none bg-white h-24"
                                                        {...field}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="carPreferences"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Car Rental / Taxi</FormLabel>
                                                <FormControl>
                                                    <Textarea
                                                        placeholder="Car type, Transmission, Pickup..."
                                                        className="resize-none bg-white h-24"
                                                        {...field}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="otherPreferences"
                                        render={({ field }) => (
                                            <FormItem className="md:col-span-2">
                                                <FormLabel>Other Requests</FormLabel>
                                                <FormControl>
                                                    <Textarea
                                                        placeholder="Visa assistance, Meal requirements, Accessibility needs..."
                                                        className="resize-none bg-white h-24"
                                                        {...field}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border-none shadow-sm bg-white/50 backdrop-blur-sm">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-xl font-display text-gray-800">
                                    <Users className="w-5 h-5 text-indigo-500" />
                                    Group Settings
                                </CardTitle>
                                <CardDescription>
                                    Is this trip part of a larger team movement?
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <FormField
                                    control={form.control}
                                    name="isGroup"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 bg-white/30">
                                            <div className="space-y-0.5">
                                                <FormLabel className="text-base font-bold">Create as Group Trip</FormLabel>
                                                <div className="text-sm text-gray-500">
                                                    Allow others to link their requests to this trip.
                                                </div>
                                            </div>
                                            <FormControl>
                                                <Checkbox
                                                    checked={field.value}
                                                    onCheckedChange={field.onChange}
                                                />
                                            </FormControl>
                                        </FormItem>
                                    )}
                                />

                                {!form.watch("isGroup") && groupTrips.length > 0 && (
                                    <FormField
                                        control={form.control}
                                        name="parentTripId"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Link to Existing Group Trip</FormLabel>
                                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger className="bg-white">
                                                            <SelectValue placeholder="Select a group trip (optional)" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="none">None (Individual Trip)</SelectItem>
                                                        {groupTrips.map((trip) => (
                                                            <SelectItem key={trip.id} value={trip.id}>
                                                                {trip.title} ({trip.destination})
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                )}
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
