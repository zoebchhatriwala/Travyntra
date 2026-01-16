import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-lg border px-3 py-1 text-xs font-semibold w-fit whitespace-nowrap shrink-0 [&>svg]:size-3.5 gap-1.5 [&>svg]:pointer-events-none transition-all overflow-hidden",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground border-transparent shadow-sm",
        secondary:
          "bg-secondary text-secondary-foreground border-transparent",
        destructive:
          "bg-red-50 text-red-700 border-red-100",
        outline:
          "text-foreground border-input bg-background",
        success:
          "bg-green-50 text-green-700 border-green-100",
        warning:
          "bg-orange-50 text-orange-700 border-orange-100",
        info:
          "bg-blue-50 text-blue-700 border-blue-100",
        pending:
          "bg-sky-50 text-sky-700 border-sky-100",
        violet:
          "bg-purple-50 text-purple-700 border-purple-100",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "span"

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
