"use client";

import React, { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { ChevronLeft, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";

// Context definition
interface SidebarContextType {
    isCollapsed: boolean;
    setIsCollapsed: (value: boolean) => void;
}

const SidebarContext = React.createContext<SidebarContextType | undefined>(undefined);

export function useSidebar() {
    const context = React.useContext(SidebarContext);
    if (context === undefined) {
        throw new Error("useSidebar must be used within a SidebarLayout");
    }
    return context;
}

// Export a helper component for branding that consumes the context
export function SidebarBrand({ logo, title, subtitle, href = "/" }: { logo: React.ReactNode, title: string, subtitle: string, href?: string }) {
    const { isCollapsed } = useSidebar();

    return (
        <a href={href} className="flex items-center gap-3 group" aria-label={title}>
            <div className="shrink-0 transition-transform group-hover:scale-105">
                {logo}
            </div>
            {!isCollapsed && (
                <div className="flex flex-col min-w-0">
                    <span className="font-display text-lg font-bold tracking-tight text-gray-900 leading-none truncate">
                        {title}
                    </span>
                    <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mt-1 truncate">
                        {subtitle}
                    </span>
                </div>
            )}
        </a>
    );
}

interface SidebarLayoutProps {
    children: React.ReactNode;
    sidebarContent: React.ReactNode;
    brandContent: React.ReactNode;
    userMenu: React.ReactNode;
    notificationBell: React.ReactNode;
    headerTitle?: React.ReactNode;
    footerContent?: React.ReactNode;
    sidebarFooter?: React.ReactNode;
}

export function SidebarLayout({
    children,
    sidebarContent,
    brandContent,
    userMenu,
    notificationBell,
    headerTitle,
    footerContent,
    sidebarFooter
}: SidebarLayoutProps) {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isMobileOpen, setIsMobileOpen] = useState(false);

    // Initialize state from local storage on mount
    useEffect(() => {
        // We need to use useEffect to access localStorage on the client side
        // to avoid hydration mismatch if we tried to do it in useState initializer
        const stored = localStorage.getItem("sidebar-collapsed");
        if (stored) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setIsCollapsed(stored === "true");
        }
    }, []);

    const toggleCollapse = () => {
        const newState = !isCollapsed;
        setIsCollapsed(newState);
        localStorage.setItem("sidebar-collapsed", String(newState));
    };

    return (
        <SidebarContext.Provider value={{ isCollapsed, setIsCollapsed: toggleCollapse }}>
            <div className="flex min-h-screen bg-[#FAFAFB]">
                {/* Mobile Overlay */}
                {isMobileOpen && (
                    <div
                        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden"
                        onClick={() => setIsMobileOpen(false)}
                    />
                )}

                {/* Sidebar */}
                <aside
                    className={cn(
                        "fixed inset-y-0 left-0 z-50 bg-white border-r border-gray-100 flex flex-col shadow-sm transition-all duration-300 ease-in-out",
                        isCollapsed ? "w-20" : "w-72",
                        isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
                    )}
                >
                    {/* Brand Area */}
                    <div className={cn("p-6 flex items-center h-24", isCollapsed ? "justify-center px-4" : "justify-between")}>
                        <div className="overflow-hidden w-full flex justify-center lg:justify-start">
                            {brandContent}
                        </div>
                    </div>

                    {/* Navigation Content */}
                    <div className="flex-1 overflow-y-auto overflow-x-hidden py-4">
                        {sidebarContent}
                    </div>

                    {/* Footer */}
                    <div className={cn(
                        "border-t border-gray-50 bg-gray-50/30 flex items-center transition-all duration-300",
                        isCollapsed ? "flex-col p-4 gap-4" : "p-4 justify-between"
                    )}>
                        {sidebarFooter ? (
                            <div className="w-full">
                                {sidebarFooter}
                            </div>
                        ) : (
                            !isCollapsed && (
                                <div className="text-[10px] text-gray-400 font-medium truncate flex-1 pr-2">
                                    {footerContent}
                                </div>
                            )
                        )}
                    </div>

                    {/* Floating Toggle Button */}
                    <div className="absolute top-24 -right-3 hidden lg:block z-50">
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={toggleCollapse}
                            className="h-6 w-6 rounded-full border-gray-200 bg-white text-gray-500 shadow-sm hover:text-indigo-600 hover:scale-110 transition-all p-0"
                            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                        >
                            <ChevronLeft size={14} className={cn("transition-transform", isCollapsed && "rotate-180")} />
                        </Button>
                    </div>
                </aside>

                {/* Main Content Wrapper */}
                <div
                    className={cn(
                        "flex-1 flex flex-col min-h-screen transition-all duration-300 ease-in-out",
                        isCollapsed ? "lg:ml-20" : "lg:ml-72"
                    )}
                >
                    {/* Header */}
                    <header className="h-16 bg-white/80 backdrop-blur-md border-b border-gray-100 sticky top-0 z-40 px-4 sm:px-8 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="lg:hidden text-gray-500"
                                onClick={() => setIsMobileOpen(true)}
                                aria-label="Open main menu"
                            >
                                <Menu size={20} />
                            </Button>

                            <div className="flex items-center gap-2">
                                {headerTitle}
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            {notificationBell}
                            {userMenu}
                        </div>
                    </header>

                    {/* Page Content */}
                    <main className="flex-1">
                        {children}
                    </main>
                </div>
            </div>
        </SidebarContext.Provider>
    );
}
