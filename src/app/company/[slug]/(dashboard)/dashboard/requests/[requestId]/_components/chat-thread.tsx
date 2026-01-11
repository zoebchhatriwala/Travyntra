"use client";

import ReactMarkdown from 'react-markdown';

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, User as UserIcon, Loader2, Paperclip, X, Image as ImageIcon, Download, File, Maximize2, Minimize2 } from "lucide-react";
import { postTripMessage, uploadMessageAttachment } from "../../../actions";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface Message {
    id: string;
    content: string;
    createdAt: Date;
    sender: {
        name: string | null;
        avatarUrl: string | null;
        role: string;
    };
    senderId: string;
}

interface ChatThreadProps {
    requestId: string;
    initialMessages: Message[];
    currentUserId: string;
    availableUsers: Array<{ id: string; name: string | null; role: string; avatarUrl: string | null }>;
}

export function ChatThread({ requestId, initialMessages, currentUserId, availableUsers }: ChatThreadProps) {
    const [messages, setMessages] = useState<Message[]>(initialMessages);
    const [newMessage, setNewMessage] = useState("");
    const [isSending, setIsSending] = useState(false);
    const [attachments, setAttachments] = useState<File[]>([]);
    const [showMentions, setShowMentions] = useState(false);
    const [mentionSearch, setMentionSearch] = useState("");
    const [cursorPosition, setCursorPosition] = useState(0);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Auto-scroll to bottom
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    // Handle @ mentions
    useEffect(() => {
        const lastAtIndex = newMessage.lastIndexOf('@', cursorPosition);
        if (lastAtIndex !== -1 && lastAtIndex === cursorPosition - 1) {
            setShowMentions(true);
            setMentionSearch("");
        } else if (lastAtIndex !== -1) {
            const searchText = newMessage.substring(lastAtIndex + 1, cursorPosition);
            if (!searchText.includes(' ')) {
                setShowMentions(true);
                setMentionSearch(searchText.toLowerCase());
            } else {
                setShowMentions(false);
            }
        } else {
            setShowMentions(false);
        }
    }, [newMessage, cursorPosition]);

    const filteredUsers = availableUsers.filter(user =>
        user.name?.toLowerCase().includes(mentionSearch) && user.id !== currentUserId
    );

    function handleMention(userName: string) {
        const lastAtIndex = newMessage.lastIndexOf('@', cursorPosition);
        const before = newMessage.substring(0, lastAtIndex);
        const after = newMessage.substring(cursorPosition);
        const newText = `${before}@${userName} ${after}`;
        setNewMessage(newText);
        setShowMentions(false);
        textareaRef.current?.focus();
    }

    function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
        const files = Array.from(e.target.files || []);
        if (files.length + attachments.length > 5) {
            toast.error("Maximum 5 files allowed");
            return;
        }
        setAttachments(prev => [...prev, ...files]);
    }

    function removeAttachment(index: number) {
        setAttachments(prev => prev.filter((_, i) => i !== index));
    }

    async function handleSend() {
        if (!newMessage.trim() && attachments.length === 0) return;

        const content = newMessage;
        const files = attachments;
        setNewMessage("");
        setAttachments([]);
        setIsSending(true);

        try {
            // Upload attachments first if any
            let attachmentData: Array<{ url: string; name: string }> = [];
            if (files.length > 0) {
                const formData = new FormData();
                files.forEach(file => formData.append('files', file));
                formData.append('requestId', requestId);

                const uploadResult = await uploadMessageAttachment(formData);
                if (uploadResult.error) {
                    toast.error(uploadResult.error);
                    setNewMessage(content);
                    setAttachments(files);
                    setIsSending(false);
                    return;
                }

                // Create attachment data with URLs and original filenames
                attachmentData = (uploadResult.urls || []).map((url, index) => ({
                    url,
                    name: files[index]?.name || 'file'
                }));
            }

            // Store attachments as JSON in message content with special marker
            const messageContent = content + (attachmentData.length > 0
                ? `\n\n__ATTACHMENTS__${JSON.stringify(attachmentData)}`
                : '');

            // Optimistic update
            const optimisticMsg: Message = {
                id: `temp-${Date.now()}`,
                content: messageContent,
                createdAt: new Date(),
                sender: {
                    name: "You",
                    avatarUrl: null,
                    role: "EMPLOYEE"
                },
                senderId: currentUserId
            };

            setMessages(prev => [...prev, optimisticMsg]);

            const result = await postTripMessage(requestId, messageContent);

            if (result.error) {
                toast.error(result.error);
                setMessages(prev => prev.filter(m => m.id !== optimisticMsg.id));
                setNewMessage(content);
                setAttachments(files);
            } else {
                toast.success("Message sent!");
            }
        } catch (error) {
            toast.error("Failed to send message");
            setNewMessage(content);
            setAttachments(files);
        } finally {
            setIsSending(false);
        }
    }

    function parseMessageContent(content: string): { text: string; attachments: Array<{ url: string; name: string }> } {
        const attachmentMarker = '__ATTACHMENTS__';
        if (content.includes(attachmentMarker)) {
            const [text, attachmentsJson] = content.split(attachmentMarker);
            try {
                const attachments = JSON.parse(attachmentsJson);
                return { text: text.trim(), attachments };
            } catch {
                return { text: content, attachments: [] };
            }
        }
        return { text: content, attachments: [] };
    }


    function getFileIcon(filename: string) {
        if (filename.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i)) {
            return <ImageIcon size={16} className="flex-shrink-0" />;
        }
        return <File size={16} className="flex-shrink-0" />;
    }

    return (
        <div className={cn(
            "flex flex-col bg-gradient-to-b from-white to-gray-50/30 border border-gray-200 shadow-xl overflow-hidden transition-all duration-300",
            isFullscreen
                ? "fixed inset-0 z-50 rounded-none w-screen h-screen"
                : "h-[750px] rounded-3xl"
        )}>
            {/* Header */}
            <div className="p-5 border-b border-gray-200 bg-white/80 backdrop-blur-sm flex items-center justify-between">
                <div>
                    <h3 className="font-bold text-gray-900 text-lg">Discussion</h3>
                    <p className="text-xs text-gray-500 mt-0.5">Collaborate with your team in real-time</p>
                </div>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsFullscreen(!isFullscreen)}
                    className="text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl"
                >
                    {isFullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
                </Button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4" ref={scrollRef}>
                {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center py-12">
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center mb-4">
                            <Send size={28} className="text-indigo-600" />
                        </div>
                        <h4 className="font-bold text-gray-900 mb-1">Start the conversation</h4>
                        <p className="text-sm text-gray-500 max-w-xs">
                            Share updates, ask questions, or collaborate with your team
                        </p>
                    </div>
                ) : (
                    messages.map((msg) => {
                        const isMe = msg.senderId === currentUserId;
                        const { text, attachments: msgAttachments } = parseMessageContent(msg.content);

                        return (
                            <div key={msg.id} className={cn("flex gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300", isMe ? "flex-row-reverse" : "flex-row")}>
                                <div className="flex-shrink-0 w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm shadow-md overflow-hidden ring-2 ring-white">
                                    {msg.sender.avatarUrl ? (
                                        <img src={msg.sender.avatarUrl} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        msg.sender.name?.[0] || <UserIcon size={16} />
                                    )}
                                </div>
                                <div className={cn("flex flex-col gap-1.5 max-w-[75%]", isMe && "items-end")}>
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-xs font-bold text-gray-900">{isMe ? "You" : msg.sender.name}</span>
                                        <span className="text-[10px] text-gray-400">{format(new Date(msg.createdAt), "h:mm a")}</span>
                                    </div>
                                    <div className={cn(
                                        "px-4 py-3 text-sm leading-relaxed shadow-md transition-all hover:shadow-lg",
                                        isMe
                                            ? "bg-gradient-to-br from-indigo-600 to-indigo-700 text-white rounded-2xl rounded-tr-md"
                                            : "bg-white text-gray-800 rounded-2xl rounded-tl-md border border-gray-100",
                                        !isMe && (text.startsWith('🚀') || text.startsWith('📝')) && "bg-indigo-50/50 border-indigo-100 italic font-medium"
                                    )}>
                                        {text && (
                                            <div className="break-words markdown-content">
                                                <ReactMarkdown
                                                    components={{
                                                        p: ({ node, ...props }) => <p className="mb-2 last:mb-0 leading-relaxed" {...props} />,
                                                        a: ({ node, ...props }) => <a className="text-indigo-200 underline hover:text-white" {...props} />,
                                                        strong: ({ node, ...props }) => <span className="font-bold" {...props} />,
                                                        ul: ({ node, ...props }) => <ul className="list-disc list-inside my-1 space-y-0.5" {...props} />,
                                                        ol: ({ node, ...props }) => <ol className="list-decimal list-inside my-1 space-y-0.5" {...props} />,
                                                        li: ({ node, ...props }) => <li className="ml-2" {...props} />,
                                                    }}
                                                >
                                                    {text}
                                                </ReactMarkdown>
                                            </div>
                                        )}

                                        {/* Render attachments */}
                                        {msgAttachments.length > 0 && (
                                            <div className={cn("space-y-2", text && "mt-3")}>
                                                {msgAttachments.map((att, idx) => (
                                                    <a
                                                        key={idx}
                                                        href={att.url}
                                                        download={att.name}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className={cn(
                                                            "flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all group",
                                                            isMe
                                                                ? "bg-indigo-500/30 hover:bg-indigo-500/50 backdrop-blur-sm"
                                                                : "bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200"
                                                        )}
                                                    >
                                                        <div className={cn(
                                                            "w-8 h-8 rounded-lg flex items-center justify-center",
                                                            isMe ? "bg-white/20" : "bg-indigo-100"
                                                        )}>
                                                            {getFileIcon(att.name)}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="font-semibold truncate">{att.name}</div>
                                                            <div className={cn("text-[10px]", isMe ? "text-indigo-100" : "text-gray-500")}>
                                                                Click to download
                                                            </div>
                                                        </div>
                                                        <Download size={14} className="opacity-60 group-hover:opacity-100 transition-opacity" />
                                                    </a>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )
                    })
                )}
            </div>

            {/* Input Area */}
            <div className="p-4 bg-white border-t border-gray-200">
                {/* Attachments Preview */}
                {attachments.length > 0 && (
                    <div className="mb-3 flex flex-wrap gap-2 animate-in slide-in-from-bottom-2 duration-200">
                        {attachments.map((file, index) => (
                            <div key={index} className="flex items-center gap-2 bg-indigo-50 border border-indigo-200 rounded-xl px-3 py-2 text-xs group hover:bg-indigo-100 transition-colors">
                                <div className="w-6 h-6 rounded-lg bg-indigo-100 flex items-center justify-center">
                                    {file.type.startsWith('image/') ? <ImageIcon size={12} className="text-indigo-600" /> : <File size={12} className="text-indigo-600" />}
                                </div>
                                <span className="max-w-[140px] truncate font-medium text-gray-700">{file.name}</span>
                                <button
                                    onClick={() => removeAttachment(index)}
                                    className="text-gray-400 hover:text-red-500 transition-colors ml-1"
                                >
                                    <X size={14} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                {/* Mention Suggestions */}
                {showMentions && filteredUsers.length > 0 && (
                    <div className="mb-3 bg-white border border-gray-200 rounded-2xl shadow-xl max-h-48 overflow-y-auto animate-in slide-in-from-bottom-2 duration-200">
                        {filteredUsers.map(user => (
                            <button
                                key={user.id}
                                onClick={() => handleMention(user.name || 'User')}
                                className="w-full px-4 py-3 text-left text-sm hover:bg-indigo-50 flex items-center gap-3 transition-colors first:rounded-t-2xl last:rounded-b-2xl"
                            >
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold overflow-hidden ring-2 ring-white shadow-sm">
                                    {user.avatarUrl ? (
                                        <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        user.name?.[0]
                                    )}
                                </div>
                                <div className="flex-1">
                                    <div className="font-semibold text-gray-900">{user.name}</div>
                                    <div className="text-xs text-gray-500 capitalize">{user.role.toLowerCase()}</div>
                                </div>
                            </button>
                        ))}
                    </div>
                )}

                <div className="flex gap-2 items-end">
                    <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        className="hidden"
                        onChange={handleFileSelect}
                        accept="image/*,.pdf,.doc,.docx"
                    />
                    <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() => fileInputRef.current?.click()}
                        className="flex-shrink-0 h-11 w-11 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                    >
                        <Paperclip size={20} />
                    </Button>
                    <div className="flex-1 relative">
                        <Textarea
                            ref={textareaRef}
                            placeholder="Type your message... Use @ to mention someone"
                            value={newMessage}
                            onChange={(e) => {
                                setNewMessage(e.target.value);
                                setCursorPosition(e.target.selectionStart);
                            }}
                            onSelect={(e) => setCursorPosition((e.target as HTMLTextAreaElement).selectionStart)}
                            className="min-h-[52px] max-h-[120px] pr-16 pl-4 py-4 bg-gray-50 resize-none border-gray-200 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 rounded-2xl text-sm placeholder:text-gray-400 leading-relaxed"
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey && !showMentions) {
                                    e.preventDefault();
                                    handleSend();
                                }
                            }}
                        />
                        <Button
                            size="icon"
                            onClick={handleSend}
                            disabled={(!newMessage.trim() && attachments.length === 0) || isSending}
                            className="absolute right-2 bottom-2 h-10 w-10 bg-gradient-to-br from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white rounded-xl shadow-lg transition-all hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
                        >
                            {isSending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                        </Button>
                    </div>
                </div>
                <p className="text-[10px] text-gray-400 mt-2.5 text-center">
                    <span className="font-medium">Shift+Enter</span> for new line • <span className="font-medium">@</span> to mention • Max 5 files
                </p>
            </div>
        </div>
    );
}
