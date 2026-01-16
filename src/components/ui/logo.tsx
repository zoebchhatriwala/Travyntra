
import Image from "next/image";
import { cn } from "@/lib/utils";

interface LogoProps {
    className?: string;
    width?: number;
    height?: number;
}

export function Logo({ className, width = 40, height = 40 }: LogoProps) {
    return (
        <div className={cn("relative overflow-hidden rounded-corner-md", className)}>
            <Image
                src="/logo.png"
                alt="Travyntra Logo"
                width={width}
                height={height}
                className="object-contain rounded-md"
                priority
            />
        </div>
    );
}
