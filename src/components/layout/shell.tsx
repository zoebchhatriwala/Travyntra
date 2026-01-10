import * as React from "react";
// @ts-ignore
import styles from "./shell.module.css";

interface DashboardShellProps {
    sidebar: React.ReactNode;
    children: React.ReactNode;
}

export function DashboardShell({ sidebar, children }: DashboardShellProps) {
    return (
        <div className={styles.shell}>
            {sidebar}
            <main className={styles.main}>
                {children}
            </main>
        </div>
    );
}
