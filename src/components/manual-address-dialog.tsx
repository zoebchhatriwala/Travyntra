"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { CountrySelect } from "@/components/ui/country-select";

export interface Address {
    street: string;
    city: string;
    state: string;
    country: string;
    zipcode: string;
    latitude?: string;
    longitude?: string;
}

interface ManualAddressDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSave: (address: Address) => void;
    initialValue?: Address | null;
}

export function ManualAddressDialog({ open, onOpenChange, onSave, initialValue }: ManualAddressDialogProps) {
    const [address, setAddress] = useState<Address>({
        street: "",
        city: "",
        state: "",
        country: "",
        zipcode: "",
        latitude: "",
        longitude: "",
    });

    useEffect(() => {
        if (open && initialValue) {
            setAddress(initialValue);
        } else if (open && !initialValue) {
            setAddress({
                street: "",
                city: "",
                state: "",
                country: "",
                zipcode: "",
                latitude: "",
                longitude: "",
            });
        }
    }, [open, initialValue]);

    const handleChange = (field: keyof Address, value: string) => {
        setAddress(prev => ({ ...prev, [field]: value }));
    };

    const [errors, setErrors] = useState<{ street?: string; country?: string; city?: string; state?: string }>({});

    const handleSave = () => {
        const newErrors: { street?: string; country?: string; city?: string; state?: string } = {};
        if (!address.street.trim()) newErrors.street = "Street is required";
        if (!address.country.trim()) newErrors.country = "Country is required";
        if (!address.city.trim()) newErrors.city = "City is required";
        if (!address.state.trim()) newErrors.state = "State is required";

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        onSave(address);
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <div className="flex items-center justify-between">
                        <DialogTitle className="text-xl font-semibold">Add Address Manually</DialogTitle>
                        {/* Close button is handled by DialogContent's default X, but we can add custom if needed */}
                    </div>
                </DialogHeader>

                <div className="grid gap-6 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="street" className={errors.street ? "text-red-500" : ""}>Street <span className="text-red-500">*</span></Label>
                        <Input
                            id="street"
                            value={address.street}
                            onChange={(e) => {
                                handleChange("street", e.target.value);
                                if (errors.street) setErrors(prev => ({ ...prev, street: undefined }));
                            }}
                            placeholder="Enter Street Address"
                            className={errors.street ? "border-red-500" : ""}
                        />
                        {errors.street && <p className="text-xs text-red-500">{errors.street}</p>}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="city" className={errors.city ? "text-red-500" : ""}>City <span className="text-red-500">*</span></Label>
                            <Input
                                id="city"
                                value={address.city}
                                onChange={(e) => {
                                    handleChange("city", e.target.value);
                                    if (errors.city) setErrors(prev => ({ ...prev, city: undefined }));
                                }}
                                placeholder="Enter City"
                                className={errors.city ? "border-red-500" : ""}
                            />
                            {errors.city && <p className="text-xs text-red-500">{errors.city}</p>}
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="state" className={errors.state ? "text-red-500" : ""}>State <span className="text-red-500">*</span></Label>
                            <Input
                                id="state"
                                value={address.state}
                                onChange={(e) => {
                                    handleChange("state", e.target.value);
                                    if (errors.state) setErrors(prev => ({ ...prev, state: undefined }));
                                }}
                                placeholder="Enter State"
                                className={errors.state ? "border-red-500" : ""}
                            />
                            {errors.state && <p className="text-xs text-red-500">{errors.state}</p>}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="country" className={errors.country ? "text-red-500" : ""}>Country <span className="text-red-500">*</span></Label>
                            <CountrySelect
                                value={address.country}
                                onChange={(val) => {
                                    handleChange("country", val);
                                    if (errors.country) setErrors(prev => ({ ...prev, country: undefined }));
                                }}
                            />
                            {errors.country && <p className="text-xs text-red-500">{errors.country}</p>}
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="zipcode">Zipcode</Label>
                            <Input
                                id="zipcode"
                                value={address.zipcode}
                                onChange={(e) => handleChange("zipcode", e.target.value)}
                                placeholder="Enter Zipcode"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="latitude">Latitude</Label>
                            <Input
                                id="latitude"
                                value={address.latitude}
                                onChange={(e) => handleChange("latitude", e.target.value)}
                                placeholder="Enter Latitude"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="longitude">Longitude</Label>
                            <Input
                                id="longitude"
                                value={address.longitude}
                                onChange={(e) => handleChange("longitude", e.target.value)}
                                placeholder="Enter Longitude"
                            />
                        </div>
                    </div>
                </div>

                <DialogFooter className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleSave} className="bg-indigo-600 hover:bg-indigo-700 text-white">Apply</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
