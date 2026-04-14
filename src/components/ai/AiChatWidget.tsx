import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Bot, X, Send, Trash2, Waves, Loader2, MessageCircle } from 'lucide-react';
import { aiService } from '../../services/aiService';
import type { ChatMessage } from '../../services/aiService';
import { authService } from '../../services/authService';
import AiBubbleContent from './AiBubbleContent';

interface RecommendedHomestay {
  id?: string;
  Id?: string;
  name?: string;
  Name?: string;
  address?: string;
  Address?: string;
  price?: number;
  Price?: number;
  description?: string;
  Description?: string;
  amenities?: string;
  Amenities?: string;
  thumbnailUrl?: string;
  ThumbnailUrl?: string;
}

interface Message {
  id: string;
  sender: 'User' | 'AI';
  message: string;
  timestamp: string;
  recommendedHomestays?: RecommendedHomestay[];
  isRecommendation?: boolean;
}

const QUICK_SUGGESTIONS = [
  'Homestay view biển đẹp?',
  'Giá phòng rẻ nhất?',
  'Chính sách hủy phòng?',
  'Cách đặt phòng?',
];

function TypingDots() {
  return (
    <div className="flex items-end gap-2">
      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center flex-shrink-0 shadow-sm">
        <Bot className="w-3.5 h-3.5 text-white" />
      </div>
      <div className="bg-white border border-gray-100 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
        <div className="flex gap-1 items-center h-4">
          {[0, 150, 300].map((delay) => (
            <span key={delay} className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce"
              style={{ animationDelay: `${delay}ms` }} />
          ))}
        </div>
      </div>
    </div>
  );
}

function Bubble({ msg }: { msg: Message }) {
  const isUser = msg.sender === 'User';
  return (
    <div className={`flex items-end gap-2 ${isUser ? 'flex-row-reverse' : ''}`}>
      {!isUser && (
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center flex-shrink-0 shadow-sm">
          <Bot className="w-3.5 h-3.5 text-white" />
        </div>
      )}
      <div className={`max-w-[76%] rounded-2xl text-sm shadow-sm
        ${isUser
          ? 'bg-gradient-to-br from-blue-500 to-cyan-500 text-white rounded-br-sm px-3.5 py-2.5'
          : 'bg-white border border-gray-100 text-gray-800 rounded-bl-sm p-3'}`}>
        {isUser ? (
          <>
            <p className="whitespace-pre-wrap break-words">{msg.message}</p>
            <p className="text-[10px] mt-1 text-blue-100 text-right">
              {new Date(msg.timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
            </p>
          </>
        ) : (
          <>
            <AiBubbleContent
              message={msg.message}
              recommendedHomestays={msg.recommendedHomestays}
              isRecommendation={msg.isRecommendation}
            />
            <p className="text-[10px] mt-3 text-gray-400">
              {new Date(msg.timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
            </p>
          </>
        )}
      </div>
    </div>
  );
}

export default function AiChatWidget() {
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [clearing, setClearing] = useState(false);
  // Track auth state để re-render khi logout
  const [authUser, setAuthUser] = useState(() => authService.getUser());

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const isCustomer = authUser?.role === 'customer';
  // Ẩn trên trang auth (login, register, forgot-password, reset-password)
  const isAuthPage = location.pathname.startsWith('/auth');
  // Chỉ hiện với: chưa login, hoặc role customer — và không phải trang auth
  const shouldShow = !isAuthPage && (!authUser || isCustomer);

  // Lắng nghe event logout từ bất kỳ đâu trong app
  useEffect(() => {
    const onLogout = () => {
      setAuthUser(null);
      setOpen(false);
      setMessages([]);
      setInput('');
      setHistoryLoaded(false);
    };
    const onLogin = () => {
      setAuthUser(authService.getUser());
      setHistoryLoaded(false);
    };
    window.addEventListener('auth-logout', onLogout);
    window.addEventListener('auth-login', onLogin);
    return () => {
      window.removeEventListener('auth-logout', onLogout);
      window.removeEventListener('auth-login', onLogin);
    };
  }, []);

  // Đóng chat khi chuyển sang trang auth
  useEffect(() => {
    if (location.pathname.startsWith('/auth')) {
      setOpen(false);
    }
  }, [location.pathname]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    if (open && !historyLoaded && isCustomer) {
      aiService.getChatHistory()
        .then((history: ChatMessage[]) => {
          if (history.length > 0) {
            setMessages(history.map((h, i) => ({
              id: `hist-${i}`,
              sender: (h.sender === 'User' ? 'User' : 'AI') as 'User' | 'AI',
              message: h.message,
              timestamp: h.timestamp || new Date().toISOString(),
            })));
          }
        })
        .catch(() => {
          // Không load được history — bắt đầu chat mới, không block user
        })
        .finally(() => {
          setHistoryLoaded(true);
        });
    }
    if (open) setTimeout(() => inputRef.current?.focus(), 120);
  }, [open, historyLoaded, isCustomer]);

  const sendMessage = useCallback(async (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;

    // Guest không thể chat — chặn ở đây, UI đã xử lý riêng
    if (!isCustomer) return;

    const userMsg: Message = {
      id: `u-${Date.now()}`, sender: 'User', message: msg, timestamp: new Date().toISOString(),
    };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      // Send to /api/ai/chat - backend handles ALL logic
      // (intent detection, FAQ routing, recommendations, etc.)
      const response = await aiService.chat(msg);

      setMessages(prev => [...prev, {
        id: `ai-${Date.now()}`, sender: 'AI',
        message: response.replyMessage || 'Xin lỗi, tôi chưa có câu trả lời cho câu hỏi này.',
        timestamp: new Date().toISOString(),
        recommendedHomestays: response.recommendedHomestays,
        isRecommendation: response.isRecommendation,
      }]);
    } catch (e: any) {
      // Hiển thị error message cho user
      const errorMessage = e?.message || 'Có lỗi xảy ra, vui lòng thử lại.';
      setMessages(prev => [...prev, {
        id: `err-${Date.now()}`, sender: 'AI',
        message: `❌ ${errorMessage}`,
        timestamp: new Date().toISOString(),
      }]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, isCustomer]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const clearHistory = async () => {
    if (!isCustomer) return;
    setClearing(true);
    try {
      await aiService.deleteChatHistory();
      setMessages([]);
      // Reset historyLoaded để lần mở tiếp theo fetch lại từ BE
      setHistoryLoaded(false);
    } catch {
      // Nếu BE fail thì không xóa UI — giữ nguyên để user biết chưa xóa được
    } finally {
      setClearing(false);
    }
  };

  if (!shouldShow) return null;

  const isEmpty = messages.length === 0 && !loading;

  return (
    <>
      {/* Backdrop — click ngoài để đóng chat */}
      {open && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Floating button — cố định góc dưới phải */}
      <button
        aria-label="Mở trợ lý AI"
        onClick={() => setOpen(v => !v)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-lg
          bg-gradient-to-br from-blue-500 to-cyan-500 text-white
          flex items-center justify-center
          transition-all duration-200 hover:shadow-xl hover:scale-105 active:scale-95"
      >
        <div className={`transition-transform duration-300 ${open ? 'rotate-90 scale-90' : 'rotate-0 scale-100'}`}>
          {open ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
        </div>
        {!open && (
          <span className="absolute inset-0 rounded-full bg-blue-400 opacity-30 animate-ping pointer-events-none" />
        )}
      </button>

      {/* Chat panel */}
      <div
        className={`fixed bottom-24 right-6 z-50 w-[360px] max-w-[calc(100vw-2rem)]
          bg-gray-50 rounded-2xl shadow-2xl border border-gray-200
          flex flex-col overflow-hidden
          transition-all duration-300 origin-bottom-right
          ${open ? 'scale-100 opacity-100 pointer-events-auto' : 'scale-90 opacity-0 pointer-events-none'}`}
        style={{ height: 520 }}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-cyan-500 px-4 py-3 flex items-center gap-3 flex-shrink-0">
          <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
            <Waves className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-semibold text-sm leading-tight">Trợ lý CHMS</p>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-green-300 rounded-full" />
              <p className="text-blue-100 text-xs">Luôn sẵn sàng hỗ trợ</p>
            </div>
          </div>
          {isCustomer && messages.length > 0 && (
            <button onClick={clearHistory} disabled={clearing} title="Xóa lịch sử"
              className="text-white/60 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/10">
              {clearing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            </button>
          )}
          <button onClick={() => setOpen(false)}
            className="text-white/60 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/10">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 scroll-smooth">
          {isEmpty && (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-2">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-100 flex items-center justify-center">
                <Bot className="w-8 h-8 text-blue-400" />
              </div>
              {authUser ? (
                <>
                  <div>
                    <p className="text-gray-800 font-semibold text-sm">Xin chào! Tôi có thể giúp gì?</p>
                    <p className="text-gray-400 text-xs mt-1">Hỏi về homestay, đặt phòng, giá cả...</p>
                  </div>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {QUICK_SUGGESTIONS.map(s => (
                      <button key={s} onClick={() => sendMessage(s)}
                        className="text-xs bg-white border border-blue-200 text-blue-600 rounded-full px-3 py-1.5
                          hover:bg-blue-50 hover:border-blue-400 transition-colors shadow-sm font-medium">
                        {s}
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <div>
                  <p className="text-gray-800 font-semibold text-sm">Xin chào!</p>
                  <p className="text-gray-500 text-xs mt-1 leading-relaxed">
                    Đăng nhập để trò chuyện với trợ lý AI và nhận tư vấn homestay cá nhân hoá.
                  </p>
                </div>
              )}
            </div>
          )}
          {messages.map(msg => <Bubble key={msg.id} msg={msg} />)}
          {loading && <TypingDots />}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="px-3 py-3 bg-white border-t border-gray-100 flex-shrink-0">
          {!authUser ? (
            /* Guest — yêu cầu đăng nhập */
            <div className="flex flex-col items-center gap-2.5 py-1">
              <p className="text-xs text-gray-500 text-center">
                Đăng nhập để chat với trợ lý AI của chúng tôi
              </p>
              <div className="flex gap-2 w-full">
                <button
                  onClick={() => navigate('/auth/login')}
                  className="flex-1 py-2 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500
                    text-white text-sm font-medium hover:opacity-90 transition-opacity"
                >
                  Đăng nhập
                </button>
                <button
                  onClick={() => navigate('/auth/register')}
                  className="flex-1 py-2 rounded-lg border border-blue-300 text-blue-600
                    text-sm font-medium hover:bg-blue-50 transition-colors"
                >
                  Đăng ký
                </button>
              </div>
            </div>
          ) : (
            /* Customer — input bình thường */
            <>
              <div className="flex items-end gap-2 bg-gray-50 rounded-xl border border-gray-200
                px-3 py-2 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
                <textarea
                  ref={inputRef}
                  rows={1}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Nhập tin nhắn..."
                  className="flex-1 bg-transparent text-sm text-gray-800 placeholder-gray-400
                    resize-none outline-none max-h-24 leading-relaxed"
                  style={{ minHeight: 24 }}
                />
                <button
                  onClick={() => sendMessage()}
                  disabled={!input.trim() || loading}
                  className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 text-white
                    flex items-center justify-center flex-shrink-0
                    disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity">
                  {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                </button>
              </div>
              <p className="text-[10px] text-gray-400 text-center mt-1.5">
                Enter gửi · Shift+Enter xuống dòng
              </p>
            </>
          )}
        </div>
      </div>
    </>
  );
}
