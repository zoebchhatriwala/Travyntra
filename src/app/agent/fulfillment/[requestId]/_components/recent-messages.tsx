"use client";

import ReactMarkdown from 'react-markdown';
import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";
import Link from "next/link";
import { MessageCircle } from "lucide-react";

interface Message {
    id: string;
    content: string;
    createdAt: Date;
    sender: { name: string | null };
}

interface RecentMessagesProps {
    messages: Message[];
    requestId: string;
}

export function RecentMessages({ messages, requestId }: RecentMessagesProps) {
    // Parse message content to extract text without attachments
    function parseContent(content: string): string {
        const attachmentMarker = '__ATTACHMENTS__';
        if (content.includes(attachmentMarker)) {
            return content.split(attachmentMarker)[0].trim();
        }
        return content;
    }

    return (
        <Card className="border-none shadow-sm ring-1 ring-gray-100 rounded-corner-lg overflow-hidden">
            <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-900">Recent Messages</h3>
                    <div className="w-8 h-8 bg-indigo-100 rounded-corner-sm flex items-center justify-center">
                        <MessageCircle size={16} className="text-indigo-600" />
                    </div>
                </div>

                {messages.length === 0 ? (
                    <div className="py-6 text-center">
                        <p className="text-sm text-gray-500">No messages yet</p>
                        <p className="text-xs text-gray-400 mt-1">Start a conversation</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {messages.map(msg => {
                            const text = parseContent(msg.content);
                            // Truncate long messages for preview
                            const truncatedText = text.length > 150 ? text.slice(0, 150) + '...' : text;

                            return (
                                <div key={msg.id} className="group">
                                    <div className="prose prose-sm prose-gray max-w-none text-gray-700 line-clamp-3">
                                        <ReactMarkdown
                                            components={{
                                                p: ({ children }) => <p className="mb-1 last:mb-0 text-sm leading-relaxed">{children}</p>,
                                                strong: ({ children }) => <span className="font-bold text-gray-900">{children}</span>,
                                                em: ({ children }) => <em className="italic">{children}</em>,
                                                a: ({ href, children }) => (
                                                    <a href={href} className="text-indigo-600 underline hover:text-indigo-700" target="_blank" rel="noopener noreferrer">
                                                        {children}
                                                    </a>
                                                ),
                                                ul: ({ children }) => <ul className="list-disc list-inside my-1 text-xs">{children}</ul>,
                                                ol: ({ children }) => <ol className="list-decimal list-inside my-1 text-xs">{children}</ol>,
                                                li: ({ children }) => <li className="ml-2">{children}</li>,
                                                code: ({ children }) => (
                                                    <code className="bg-gray-100 px-1 py-0.5 rounded text-xs font-mono text-gray-800">{children}</code>
                                                ),
                                                blockquote: ({ children }) => (
                                                    <blockquote className="border-l-2 border-gray-200 pl-3 italic text-gray-500 my-1">{children}</blockquote>
                                                ),
                                            }}
                                        >
                                            {truncatedText}
                                        </ReactMarkdown>
                                    </div>
                                    <p className="text-[10px] text-gray-400 mt-1.5 flex items-center gap-1">
                                        <span className="font-medium text-gray-500">{msg.sender.name || 'Unknown'}</span>
                                        <span>•</span>
                                        <span>{format(new Date(msg.createdAt), "MMM d, h:mm a")}</span>
                                    </p>
                                </div>
                            );
                        })}
                    </div>
                )}

                <Link
                    href={`/agent/fulfillment/${requestId}/discussion`}
                    className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-indigo-600 hover:text-indigo-700 transition-colors"
                >
                    View Full Discussion
                    <span className="text-indigo-400">→</span>
                </Link>
            </CardContent>
        </Card>
    );
}
