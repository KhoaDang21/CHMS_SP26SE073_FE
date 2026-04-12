/**
 * Example: How to use the refactored AI Service and useChat hook
 * 
 * This file demonstrates the production-ready chat implementation
 */

import React, { useState } from "react";
import { View, TextInput, FlatList, Text, TouchableOpacity } from "react-native";
import { useChat } from "../hooks/useChat";

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
        <View style={{ flex: 1, backgroundColor: "#fff" }}>
            {/* Header */}
            <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: "#eee" }}>
                <Text style={{ fontSize: 18, fontWeight: "600" }}>AI Chat</Text>
            </View>

            {/* Error message */}
            {error && (
                <View style={{ backgroundColor: "#ffebee", padding: 12, margin: 8 }}>
                    <Text style={{ color: "#c62828" }}>{error}</Text>
                </View>
            )}

            {/* Messages list */}
            <FlatList
                data={messages}
                keyExtractor={(_, index) => index.toString()}
                renderItem={({ item }) => (
                    <View
                        style={{
                            marginVertical: 8,
                            marginHorizontal: 12,
                            flexDirection: item.sender === "User" ? "row-reverse" : "row",
                        }}
                    >
                        <View
                            style={{
                                backgroundColor: item.sender === "User" ? "#1976d2" : "#f5f5f5",
                                padding: 12,
                                borderRadius: 8,
                                maxWidth: "80%",
                            }}
                        >
                            <Text
                                style={{
                                    color: item.sender === "User" ? "#fff" : "#000",
                                    fontSize: 14,
                                }}
                            >
                                {item.message}
                            </Text>
                        </View>
                    </View>
                )}
                contentContainerStyle={{ flexGrow: 1, justifyContent: "flex-end" }}
            />

            {/* Input area */}
            <View style={{ padding: 12, borderTopWidth: 1, borderTopColor: "#eee" }}>
                <View style={{ flexDirection: "row", gap: 8 }}>
                    <TextInput
                        style={{
                            flex: 1,
                            borderWidth: 1,
                            borderColor: "#ddd",
                            borderRadius: 8,
                            paddingHorizontal: 12,
                            paddingVertical: 8,
                        }}
                        placeholder="Ask me anything..."
                        value={input}
                        onChangeText={setInput}
                        editable={!loading}
                    />
                    <TouchableOpacity
                        onPress={handleSendMessage}
                        disabled={loading || !input.trim()}
                        style={{
                            backgroundColor: "#1976d2",
                            paddingHorizontal: 16,
                            borderRadius: 8,
                            justifyContent: "center",
                            opacity: loading || !input.trim() ? 0.5 : 1,
                        }}
                    >
                        <Text style={{ color: "#fff", fontWeight: "600" }}>Send</Text>
                    </TouchableOpacity>
                </View>

                {/* Clear button */}
                <TouchableOpacity
                    onPress={handleClear}
                    style={{ marginTop: 12, paddingVertical: 8 }}
                >
                    <Text style={{ color: "#d32f2f", textAlign: "center", fontSize: 14 }}>
                        Clear Chat
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
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
