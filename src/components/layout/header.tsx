import * as React from "react";
import { cn } from "@/lib/utils";
// @ts-ignore
import styles from "./header.module.css";

interface HeaderProps {
    title?: string;
    children?: React.ReactNode;
    className?: string;
}

export function Header({ title, children, className }: HeaderProps) {
    return (
        <header className={cn(styles.header, className)}>
            <div className={styles.title}>{title}</div>
            <div className={styles.actions}>{children}</div>
        </header>
    );
}
