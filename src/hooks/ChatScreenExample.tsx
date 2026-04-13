/**
 * Example: How to use the refactored AI Service and useChat hook
 * 
 * This file demonstrates the production-ready chat implementation
 */

import React, { useState } from "react";
import { useChat } from "./useChat";

/**
 * Chat Screen Component
 * Simple, clean implementation using the useChat hook
 */
export const ChatScreen: React.FC = () => {
    const [input, setInput] = useState("");
    const { messages, loading, error, sendMessage, clearHistory } = useChat();

    /**
     * Handle send message
     */
    const handleSendMessage = () => {
        if (input.trim()) {
            sendMessage(input);
            setInput("");
        }
    };

    /**
     * Handle clear chat
     */
    const handleClear = async () => {
        if (confirm("Clear all chat history?")) {
            await clearHistory();
        }
    };

    return (
        <div style={{ flex: 1, backgroundColor: "#fff", display: "flex", flexDirection: "column", height: "100vh" }}>
            {/* Header */}
            <div style={{ padding: 16, borderBottom: "1px solid #eee" }}>
                <h2 style={{ fontSize: 18, fontWeight: "600", margin: 0 }}>AI Chat</h2>
            </div>

            {/* Error message */}
            {error && (
                <div style={{ backgroundColor: "#ffebee", padding: 12, margin: 8, color: "#c62828" }}>
                    {error}
                </div>
            )}

            {/* Messages list */}
            <div style={{ flex: 1, overflowY: "auto", padding: "12px 8px", display: "flex", flexDirection: "column", gap: "8px" }}>
                {messages.map((msg: any) => (
                    <div
                        key={msg.timestamp}
                        style={{
                            display: "flex",
                            flexDirection: msg.sender === "User" ? "row-reverse" : "row" as const,
                            gap: "8px",
                            margin: "8px 12px",
                        }}
                    >
                        <div
                            style={{
                                backgroundColor: msg.sender === "User" ? "#1976d2" : "#f5f5f5",
                                padding: 12,
                                borderRadius: 8,
                                maxWidth: "80%",
                                wordBreak: "break-word",
                            }}
                        >
                            <p
                                style={{
                                    color: msg.sender === "User" ? "#fff" : "#000",
                                    fontSize: 14,
                                    margin: 0,
                                }}
                            >
                                {msg.message}
                            </p>
                        </div>
                    </div>
                ))}
                {loading && <div style={{ padding: "12px", color: "#999" }}>Loading...</div>}
            </div>

            {/* Input area */}
            <div style={{ padding: 12, borderTop: "1px solid #eee" }}>
                <div style={{ display: "flex", gap: 8 }}>
                    <input
                        style={{
                            flex: 1,
                            border: "1px solid #ddd",
                            borderRadius: 8,
                            paddingLeft: 12,
                            paddingRight: 12,
                            paddingTop: 8,
                            paddingBottom: 8,
                        }}
                        placeholder="Ask me anything..."
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        disabled={loading}
                    />
                    <button
                        onClick={handleSendMessage}
                        disabled={loading || !input.trim()}
                        style={{
                            backgroundColor: "#1976d2",
                            paddingLeft: 16,
                            paddingRight: 16,
                            borderRadius: 8,
                            color: "#fff",
                            fontWeight: "600",
                            cursor: loading || !input.trim() ? "not-allowed" : "pointer",
                            opacity: loading || !input.trim() ? 0.5 : 1,
                            border: "none",
                        }}
                    >
                        Send
                    </button>
                </div>

                {/* Clear button */}
                <button
                    onClick={handleClear}
                    style={{
                        marginTop: 12,
                        paddingTop: 8,
                        paddingBottom: 8,
                        color: "#d32f2f",
                        textAlign: "center",
                        fontSize: 14,
                        width: "100%",
                        border: "none",
                        backgroundColor: "transparent",
                        cursor: "pointer",
                    }}
                >
                    Clear Chat
                </button>
            </div>
        </div>
    );
};

/**
 * ============================================
 * ARCHITECTURE NOTES
 * ============================================
 *
 * OLD (Complex, Frontend AI Logic):
 * - User sends message
 * - Frontend detects intent (recommendation, FAQ, chat)
 * - Frontend extracts parameters (location, price, amenities)
 * - Frontend calls different endpoints based on intent
 * - Hard to maintain, easy to break
 *
 * NEW (Simple, Backend AI Logic):
 * - User sends message
 * - Frontend calls POST /api/ai/chat with message
 * - Backend handles ALL logic:
 *   - Intent detection
 *   - Parameter extraction
 *   - FAQ routing
 *   - Recommendation filtering
 * - Frontend is just UI + state management
 * - Easier to maintain, backend can improve AI without touching frontend
 *
 * ============================================
 * API ENDPOINTS
 * ============================================
 *
 * Chat:
 *   POST /api/ai/chat → all messages (intent detection handled by backend)
 *   GET /api/ai/chat/history → load chat history
 *   DELETE /api/ai/chat/history → clear all messages
 *
 * Recommendations (for filter UI):
 *   POST /api/ai/recommendations → get recommendations for search/filter
 *   (NOT used in chat flow anymore)
 *
 * FAQs (for FAQ screen):
 *   GET /api/ai/faq → get FAQ list
 *   (NOT used in chat flow anymore)
 *
 * ============================================
 * useChat HOOK
 * ============================================
 *
 * const { messages, loading, error, sendMessage, fetchHistory, clearHistory } = useChat();
 *
 * - messages: ChatMessage[] — array of messages
 * - loading: boolean — whether sending message
 * - error: string | null — error message if failed
 * - sendMessage(message: string) — send message (optimistic UI)
 * - fetchHistory() — load chat history
 * - clearHistory() — delete all messages
 *
 * ============================================
 * BENEFITS
 * ============================================
 *
 * 1. Simpler frontend code
 *    - No intent detection logic
 *    - No parameter extraction regex
 *    - No routing based on message type
 *
 * 2. Better separation of concerns
 *    - Frontend: UI + state management
 *    - Backend: AI logic + routing
 *
 * 3. Easier to improve AI
 *    - Backend can change intent detection
 *    - Backend can change parameter extraction
 *    - No frontend changes needed
 *
 * 4. Consistent API
 *    - All chat goes through same endpoint
 *    - Easier to add features (e.g., analytics)
 *    - Easier to add middleware (e.g., rate limiting)
 *
 * 5. Optimistic UI
 *    - User message shows immediately
 *    - Better perceived performance
 *    - Error rollback if needed
 *
 * ============================================
 */
