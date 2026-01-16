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
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Plane, Calendar, FileText, Users, Train, Car, Building, Globe } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LocationSelector } from "@/components/location-selector";
import { ManualAddressDialog, type Address } from "@/components/manual-address-dialog";
import { MapPin, Pencil } from "lucide-react";
import { TripPreferences } from "@/types/request/trip-preferences";
import { type Money } from "@/types/finance/money";
import { createMoney, moneyToDecimal } from "@/lib/utils/money";
import { formatAddress } from "@/lib/utils/address";


const requestSchema = z.object({
    title: z.string().min(5, "Title acts as the subject line, make it descriptive (min 5 chars)."),
    destination: z.string().min(2, "Destination is required"),
    startDate: z.string().refine((val) => !isNaN(Date.parse(val)), "Invalid start date"),
    endDate: z.string().refine((val) => !isNaN(Date.parse(val)), "Invalid end date"),
    purpose: z.string().min(10, "Please provide more context about the purpose of this trip."),
    budget: z.string().optional(),
    flightPreferences: z.string().optional(),
    flightFrom: z.string().optional(),
    flightTo: z.string().optional(),
    hotelPreferences: z.string().optional(),
    carPreferences: z.string().optional(),
    carPickup: z.string().optional(),
    carDropoff: z.string().optional(),
    trainPreferences: z.string().optional(),
    trainFrom: z.string().optional(),
    trainTo: z.string().optional(),
    otherPreferences: z.string().optional(),
    isGroup: z.boolean().default(false),
    parentTripId: z.string().optional(),
    destinationDetails: z.object({
        street: z.string().default(""),
        city: z.string().default(""),
        state: z.string().default(""),
        country: z.string().default(""),
        zipcode: z.string().default(""),
        latitude: z.string().optional(),
        longitude: z.string().optional(),
    }).optional(),
    carPickupDetails: z.object({
        street: z.string().default(""),
        city: z.string().default(""),
        state: z.string().default(""),
        country: z.string().default(""),
        zipcode: z.string().default(""),
        latitude: z.string().optional(),
        longitude: z.string().optional(),
    }).optional(),
    carDropoffDetails: z.object({
        street: z.string().default(""),
        city: z.string().default(""),
        state: z.string().default(""),
        country: z.string().default(""),
        zipcode: z.string().default(""),
        latitude: z.string().optional(),
        longitude: z.string().optional(),
    }).optional(),
});

type RequestFormValues = z.infer<typeof requestSchema>;

export interface RequestFormProps {
    slug: string;
    currency: string;
    initialData?: {
        title: string;
        destination: string;
        purpose: string;
        budget?: Money | number | string | null;
        startDate: Date | string;
        endDate: Date | string;
        isGroup?: boolean;
        parentTripId?: string;
        preferences?: TripPreferences;
        destinationDetails?: Address;
    };
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
    const [addressDialogOpen, setAddressDialogOpen] = useState(false);
    const [pickupAddressDialogOpen, setPickupAddressDialogOpen] = useState(false);
    const [dropoffAddressDialogOpen, setDropoffAddressDialogOpen] = useState(false);

    // Handler for saving address from manual dialog
    const handleAddressSave = (address: Address) => {
        form.setValue("destination", formatAddress(address));
        form.setValue("destinationDetails", address);
    };

    const handlePickupAddressSave = (address: Address) => {
        form.setValue("carPickup", formatAddress(address));
        form.setValue("carPickupDetails", address);
    };

    const handleDropoffAddressSave = (address: Address) => {
        form.setValue("carDropoff", formatAddress(address));
        form.setValue("carDropoffDetails", address);
    };

    // UI State for Travel Modes
    const [selectedModes, setSelectedModes] = useState<string[]>(() => {
        const modes = [];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const prefs = initialData?.preferences as any;
        if (prefs?.flight?.details || prefs?.flight?.from) modes.push('flight');
        if (prefs?.hotel) modes.push('hotel');
        if (prefs?.train?.details || prefs?.train?.from) modes.push('train');
        if (prefs?.car?.details || prefs?.car?.pickup) modes.push('car');
        return modes.length > 0 ? modes : ['flight', 'hotel']; // Default
    });

    // Auto-detection State
    const [originCountry, setOriginCountry] = useState<string | null>(null);
    const [destCountry, setDestCountry] = useState<string | null>(null);

    const isInternational = originCountry && destCountry && originCountry !== destCountry;

    const toggleMode = (mode: string) => {
        setSelectedModes(prev =>
            prev.includes(mode) ? prev.filter(m => m !== mode) : [...prev, mode]
        );
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const preferences = initialData?.preferences as any;

    const form = useForm<RequestFormValues>({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        resolver: zodResolver(requestSchema) as any,
        defaultValues: {
            title: initialData?.title || "",
            destination: initialData?.destination || "",
            purpose: initialData?.purpose || "",
            budget: (() => {
                if (!initialData?.budget) return "";
                // If it's already a Money object
                if (typeof initialData.budget === 'object' && 'amount' in initialData.budget) {
                    return moneyToDecimal(initialData.budget as Money).toString();
                }
                // If it's a number or string
                return initialData.budget.toString();
            })(),

            // Flight
            flightPreferences: typeof preferences?.flight === 'string' ? preferences.flight : preferences?.flight?.details || "",
            flightFrom: preferences?.flight?.from || "",
            flightTo: preferences?.flight?.to || "",

            // Hotel
            hotelPreferences: preferences?.hotel || "",

            // Car
            carPreferences: typeof preferences?.car === 'string' ? preferences.car : preferences?.car?.details || "",
            carPickup: preferences?.car?.pickup || "",
            carDropoff: preferences?.car?.dropoff || "",

            // Train
            trainPreferences: typeof preferences?.train === 'string' ? preferences.train : preferences?.train?.details || "",
            trainFrom: preferences?.train?.from || "",
            trainTo: preferences?.train?.to || "",

            otherPreferences: preferences?.other || "",
            startDate: initialData?.startDate ? new Date(initialData.startDate).toISOString().split('T')[0] : "",
            endDate: initialData?.endDate ? new Date(initialData.endDate).toISOString().split('T')[0] : "",
            isGroup: initialData?.isGroup || false,
            parentTripId: initialData?.parentTripId || "none",
            destinationDetails: initialData?.destinationDetails || preferences?.destinationDetails || undefined,
            carPickupDetails: preferences?.car?.pickupDetails || undefined,
            carDropoffDetails: preferences?.car?.dropoffDetails || undefined,
        },
    });

    async function onSubmit(data: RequestFormValues) {
        setIsSubmitting(true);
        try {
            const preferences = {
                flight: {
                    details: data.flightPreferences,
                    from: data.flightFrom,
                    to: data.flightTo
                },
                hotel: data.hotelPreferences,
                car: {
                    details: data.carPreferences,
                    pickup: data.carPickup,
                    dropoff: data.carDropoff,
                    pickupDetails: data.carPickupDetails,
                    dropoffDetails: data.carDropoffDetails,
                },
                train: {
                    details: data.trainPreferences,
                    from: data.trainFrom,
                    to: data.trainTo
                },
                other: data.otherPreferences,
                destinationDetails: data.destinationDetails,
            };

            if (initialData && requestId) {
                const result = await updateTripRequest(requestId, {
                    title: data.title,
                    destination: data.destinationDetails as Address,
                    startDate: new Date(data.startDate),
                    endDate: new Date(data.endDate),
                    purpose: data.purpose,
                    budget: (data.budget && data.budget !== "") ? createMoney(Number(data.budget), currency) : undefined,
                    preferences,
                    isGroup: data.isGroup,
                    parentTripId: data.parentTripId,
                });

                if (result.error) {
                    toast.error(result.error);
                    return;
                }

                toast.success("Trip request updated successfully!");
                router.push(`/company/${slug}/dashboard/requests/${requestId}`);
            } else {
                // Create trip request
                const result = await createTripRequest({
                    title: data.title,
                    destination: data.destinationDetails as Address,
                    startDate: new Date(data.startDate),
                    endDate: new Date(data.endDate),
                    purpose: data.purpose,
                    budget: data.budget ? createMoney(Number(data.budget), currency) : undefined,
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
            console.error("Form Submission Error:", error);
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
                                                <Input placeholder="e.g. Q4 Sales Conference in Berlin" {...field} />
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
                                                <div className="flex gap-2">
                                                    <div className="relative flex-1">
                                                        <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
                                                        <FormControl>
                                                            <Input
                                                                placeholder="City, Country"
                                                                {...field}
                                                                readOnly
                                                                className="pl-9 bg-white cursor-pointer hover:bg-gray-50"
                                                                onClick={() => setAddressDialogOpen(true)}
                                                            />
                                                        </FormControl>
                                                    </div>
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="icon"
                                                        onClick={() => setAddressDialogOpen(true)}
                                                        title="Edit Address"
                                                    >
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                                <FormMessage />
                                                <ManualAddressDialog
                                                    open={addressDialogOpen}
                                                    onOpenChange={setAddressDialogOpen}
                                                    onSave={handleAddressSave}
                                                    initialValue={form.getValues("destinationDetails")}
                                                />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="budget"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Estimated Budget</FormLabel>
                                                <div className="relative">
                                                    <span className="absolute left-3 top-2.5 text-gray-400 text-sm">{currency}</span>
                                                    <FormControl>
                                                        <Input type="number" placeholder="0.00" className="pl-12" {...field} />
                                                    </FormControl>
                                                </div>
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
                                                    className="resize-none min-h-[100px]"
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
                            <CardContent className="space-y-6">
                                {/* Mode Selection */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                                    {[
                                        { id: 'flight', icon: Plane, label: 'Flight' },
                                        { id: 'hotel', icon: Building, label: 'Hotel' },
                                        { id: 'train', icon: Train, label: 'Train' },
                                        { id: 'car', icon: Car, label: 'Car / Taxi' },
                                    ].map((mode) => (
                                        <div
                                            key={mode.id}
                                            onClick={() => toggleMode(mode.id)}
                                            className={`
                                                cursor-pointer flex flex-col items-center justify-center p-4 rounded-corner-md border-2 transition-all duration-200
                                                ${selectedModes.includes(mode.id)
                                                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700 shadow-sm'
                                                    : 'border-transparent bg-gray-100/50 text-gray-500 hover:bg-gray-100 hover:scale-105'}
                                            `}
                                        >
                                            <mode.icon className={`w-6 h-6 mb-2 ${selectedModes.includes(mode.id) ? 'stroke-2' : ''}`} />
                                            <span className="font-semibold text-sm">{mode.label}</span>
                                        </div>
                                    ))}
                                </div>

                                {/* Dynamic Fields based on Modes */}
                                <div className="space-y-8 animate-in fade-in zoom-in-95 duration-300">

                                    {selectedModes.includes('flight') && (
                                        <div className="space-y-4 p-4 border rounded-corner-md bg-white/40">
                                            <div className="flex items-center justify-between">
                                                <FormLabel className="text-lg font-semibold flex items-center gap-2 text-indigo-900">
                                                    <Plane className="w-4 h-4" /> Flight Preferences
                                                </FormLabel>
                                                {isInternational && (
                                                    <Badge variant="secondary" className="bg-amber-100 text-amber-700 border-amber-200 gap-1">
                                                        <Globe className="w-3 h-3" /> International
                                                    </Badge>
                                                )}
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <FormField
                                                    control={form.control}
                                                    name="flightFrom"
                                                    render={({ field }) => (
                                                        <FormItem className="min-w-0">
                                                            <FormLabel className="text-xs text-gray-500 uppercase tracking-wide">Origin</FormLabel>
                                                            <FormControl>
                                                                <LocationSelector
                                                                    mode="flight"
                                                                    value={field.value}
                                                                    onChange={field.onChange}
                                                                    onCountryChange={setOriginCountry}
                                                                    placeholder="From Airport..."
                                                                />
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                                <FormField
                                                    control={form.control}
                                                    name="flightTo"
                                                    render={({ field }) => (
                                                        <FormItem className="min-w-0">
                                                            <FormLabel className="text-xs text-gray-500 uppercase tracking-wide">Destination</FormLabel>
                                                            <FormControl>
                                                                <LocationSelector
                                                                    mode="flight"
                                                                    value={field.value}
                                                                    onChange={field.onChange}
                                                                    onCountryChange={setDestCountry}
                                                                    placeholder="To Airport..."
                                                                />
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                            </div>
                                            <FormField
                                                control={form.control}
                                                name="flightPreferences"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormControl>
                                                            <Textarea
                                                                placeholder="Additional airline preferences, seat choice, timing constraints..."
                                                                className="resize-none min-h-[80px]"
                                                                {...field}
                                                            />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>
                                    )}

                                    {selectedModes.includes('hotel') && (
                                        <div className="space-y-4 p-4 border rounded-corner-md bg-white/40">
                                            <FormLabel className="text-lg font-semibold flex items-center gap-2 text-indigo-900">
                                                <Building className="w-4 h-4" /> Hotel Preferences
                                            </FormLabel>
                                            <FormField
                                                control={form.control}
                                                name="hotelPreferences"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormControl>
                                                            <Textarea
                                                                placeholder="Preferred area, star rating, room type, specific amenities..."
                                                                className="resize-none h-24"
                                                                {...field}
                                                            />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>
                                    )}

                                    {selectedModes.includes('train') && (
                                        <div className="space-y-4 p-4 border rounded-corner-md bg-white/40">
                                            <FormLabel className="text-lg font-semibold flex items-center gap-2 text-indigo-900">
                                                <Train className="w-4 h-4" /> Train / Rail
                                            </FormLabel>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <FormField
                                                    control={form.control}
                                                    name="trainFrom"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormControl>
                                                                <LocationSelector
                                                                    mode="train"
                                                                    value={field.value}
                                                                    onChange={field.onChange}
                                                                    placeholder="From Station..."
                                                                    allowCustom={true}
                                                                />
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                                <FormField
                                                    control={form.control}
                                                    name="trainTo"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormControl>
                                                                <LocationSelector
                                                                    mode="train"
                                                                    value={field.value}
                                                                    onChange={field.onChange}
                                                                    placeholder="To Station..."
                                                                    allowCustom={true}
                                                                />
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                            </div>
                                            <FormField
                                                control={form.control}
                                                name="trainPreferences"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormControl>
                                                            <Textarea
                                                                placeholder="Class, Seat type, Route..."
                                                                className="resize-none min-h-[60px]"
                                                                {...field}
                                                            />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>
                                    )}

                                    {selectedModes.includes('car') && (
                                        <div className="space-y-4 p-4 border rounded-corner-md bg-white/40">
                                            <FormLabel className="text-lg font-semibold flex items-center gap-2 text-indigo-900">
                                                <Car className="w-4 h-4" /> Car Rental / Taxi
                                            </FormLabel>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <FormField
                                                    control={form.control}
                                                    name="carPickup"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <div className="flex gap-2">
                                                                <div className="relative flex-1">
                                                                    <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
                                                                    <FormControl>
                                                                        <Input
                                                                            placeholder="Pickup Address..."
                                                                            {...field}
                                                                            readOnly
                                                                            className="pl-9 cursor-pointer hover:bg-gray-100"
                                                                            onClick={() => setPickupAddressDialogOpen(true)}
                                                                        />
                                                                    </FormControl>
                                                                </div>
                                                                <Button
                                                                    type="button"
                                                                    variant="outline"
                                                                    size="icon"
                                                                    onClick={() => setPickupAddressDialogOpen(true)}
                                                                    title="Edit Pickup Address"
                                                                >
                                                                    <Pencil className="h-4 w-4" />
                                                                </Button>
                                                            </div>
                                                            <FormMessage />
                                                            <ManualAddressDialog
                                                                open={pickupAddressDialogOpen}
                                                                onOpenChange={setPickupAddressDialogOpen}
                                                                onSave={handlePickupAddressSave}
                                                                initialValue={form.getValues("carPickupDetails")}
                                                            />
                                                        </FormItem>
                                                    )}
                                                />
                                                <FormField
                                                    control={form.control}
                                                    name="carDropoff"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <div className="flex gap-2">
                                                                <div className="relative flex-1">
                                                                    <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
                                                                    <FormControl>
                                                                        <Input
                                                                            placeholder="Dropoff Address..."
                                                                            {...field}
                                                                            readOnly
                                                                            className="pl-9 cursor-pointer hover:bg-gray-100"
                                                                            onClick={() => setDropoffAddressDialogOpen(true)}
                                                                        />
                                                                    </FormControl>
                                                                </div>
                                                                <Button
                                                                    type="button"
                                                                    variant="outline"
                                                                    size="icon"
                                                                    onClick={() => setDropoffAddressDialogOpen(true)}
                                                                    title="Edit Dropoff Address"
                                                                >
                                                                    <Pencil className="h-4 w-4" />
                                                                </Button>
                                                            </div>
                                                            <FormMessage />
                                                            <ManualAddressDialog
                                                                open={dropoffAddressDialogOpen}
                                                                onOpenChange={setDropoffAddressDialogOpen}
                                                                onSave={handleDropoffAddressSave}
                                                                initialValue={form.getValues("carDropoffDetails")}
                                                            />
                                                        </FormItem>
                                                    )}
                                                />
                                            </div>
                                            <FormField
                                                control={form.control}
                                                name="carPreferences"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormControl>
                                                            <Textarea
                                                                placeholder="Vehicle type, needed duration, transmission..."
                                                                className="resize-none min-h-[60px]"
                                                                {...field}
                                                            />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>
                                    )}

                                    <FormField
                                        control={form.control}
                                        name="otherPreferences"
                                        render={({ field }) => (
                                            <FormItem className="pt-4 border-t">
                                                <FormLabel>Other Requests</FormLabel>
                                                <FormControl>
                                                    <Textarea
                                                        placeholder="Visa assistance, Meal requirements, Accessibility needs..."
                                                        className="resize-none h-20"
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
                                                        <SelectTrigger>
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
                                                <Input type="date" {...field} />
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
                                                <Input type="date" {...field} />
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
