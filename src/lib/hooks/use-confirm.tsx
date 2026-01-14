"use client"

import { useState } from "react"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface ConfirmOptions {
    title?: string
    description?: string
    cancelText?: string
    confirmText?: string
    variant?: "default" | "destructive"
}

export function useConfirm() {
    const [promise, setPromise] = useState<{
        resolve: (value: boolean) => void
    } | null>(null)
    const [options, setOptions] = useState<ConfirmOptions>({})

    const confirm = (opts: ConfirmOptions = {}) =>
        new Promise<boolean>((resolve) => {
            setOptions(opts)
            setPromise({ resolve })
        })

    const handleClose = () => {
        if (promise) {
            promise.resolve(false)
        }
        setPromise(null)
    }

    const handleCancel = () => {
        promise?.resolve(false)
        setPromise(null)
    }

    const handleConfirm = () => {
        promise?.resolve(true)
        setPromise(null)
    }

    const ConfirmDialog = () => (
        <AlertDialog open={promise !== null} onOpenChange={(open) => {
            if (!open) handleClose()
        }}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{options.title || "Are you sure?"}</AlertDialogTitle>
                    <AlertDialogDescription>
                        {options.description || "This action cannot be undone."}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={handleCancel}>
                        {options.cancelText || "Cancel"}
                    </AlertDialogCancel>
                    <AlertDialogAction
                        onClick={handleConfirm}
                        className={options.variant === "destructive" ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}
                    >
                        {options.confirmText || "Confirm"}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )

    return { confirm, ConfirmDialog }
}
