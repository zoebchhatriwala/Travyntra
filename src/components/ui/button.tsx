import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"
// @ts-ignore
import styles from "./button.module.css"

const buttonVariants = cva(
    styles.base,
    {
        variants: {
            variant: {
                default: styles.default,
                destructive: styles.destructive,
                outline: styles.outline,
                secondary: styles.secondary,
                ghost: styles.ghost,
                link: styles.link,
            },
            size: {
                default: styles.size_default,
                sm: styles.size_sm,
                lg: styles.size_lg,
                icon: styles.size_icon,
            },
        },
        defaultVariants: {
            variant: "default",
            size: "default",
        },
    }
)

export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
    asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant, size, asChild = false, ...props }, ref) => {
        const Comp = asChild ? Slot : "button"
        return (
            <Comp
                className={cn(buttonVariants({ variant, size, className }))}
                ref={ref}
                {...props}
            />
        )
    }
)
Button.displayName = "Button"

export { Button, buttonVariants }
