import * as React from "react"
import { cn } from "@/lib/utils"

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
    ({ className, ...props }, ref) => {
        return (
            <textarea
                className={cn(
                    "flex min-h-[80px] w-full rounded-corner-sm border border-input bg-slate-50/50 px-4 py-2 text-base shadow-xs placeholder:text-muted-foreground transition-all outline-none disabled:cursor-not-allowed disabled:opacity-50",
                    "focus-visible:border-primary focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-primary",
                    className
                )}
                ref={ref}
                {...props}
            />
        )
    }
)
Textarea.displayName = "Textarea"

export { Textarea }
