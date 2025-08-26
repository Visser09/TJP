import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Minimize2, Maximize2 } from "lucide-react";
import Sidebar from "@/components/sidebar";
import Header from "@/components/header";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { isUnauthorizedError } from "@/lib/authUtils";
import { cn } from "@/lib/utils";

interface ChatMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
}

export default function AICoach() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      content: "Hi! I'm your AI trading coach specialized in prop firm trading. I can help you with:\n\n• Risk management and position sizing\n• Prop firm compliance (Apex, TopStep, Take Profit Trader)\n• Trading psychology and discipline\n• Setup development and backtesting\n• Performance analysis and improvement\n• Market timing and execution quality\n\nWhat would you like to discuss about your trading today?",
      role: 'assistant',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      content: input.trim(),
      role: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await apiRequest('POST', '/api/ai-chat', {
        message: userMessage.content,
        conversationHistory: messages.slice(-10) // Send last 10 messages for context
      });

      const data = await response.json();
      
      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: data.response,
        role: 'assistant',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error: any) {
      console.error('AI Chat error:', error);
      
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      
      toast({
        title: "Chat Error",
        description: "Failed to get AI response. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        
        {/* Main Chat Interface */}
        <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full p-6">
          {/* Header */}
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-3 rounded-xl bg-apple-blue/20">
              <Bot className="w-8 h-8 text-apple-blue" />
            </div>
            <div>
              <h1 className="text-2xl font-bold" data-testid="text-page-title">
                AI Trading Coach
              </h1>
              <p className="text-gray-400" data-testid="text-page-description">
                Get personalized coaching and insights for prop firm trading
              </p>
            </div>
          </div>

          {/* Messages Container */}
          <div className="flex-1 bg-gray-900/30 backdrop-blur-md border border-white/10 rounded-xl flex flex-col">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6" data-testid="chat-messages">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex items-start space-x-3",
                    message.role === 'user' ? "flex-row-reverse space-x-reverse" : ""
                  )}
                  data-testid={`message-${message.role}-${message.id}`}
                >
                  {/* Avatar */}
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                    message.role === 'user' 
                      ? "bg-apple-blue text-white" 
                      : "bg-gray-700 text-gray-300"
                  )}>
                    {message.role === 'user' ? (
                      <User className="w-4 h-4" />
                    ) : (
                      <Bot className="w-4 h-4" />
                    )}
                  </div>

                  {/* Message Content */}
                  <div className={cn(
                    "flex-1 max-w-[80%]",
                    message.role === 'user' ? "text-right" : ""
                  )}>
                    <div className={cn(
                      "rounded-2xl px-4 py-3 text-sm",
                      message.role === 'user' 
                        ? "bg-apple-blue text-white" 
                        : "bg-gray-800 text-gray-100"
                    )}>
                      <div className="whitespace-pre-wrap" data-testid={`text-message-content-${message.id}`}>
                        {message.content}
                      </div>
                    </div>
                    <div className={cn(
                      "text-xs text-gray-500 mt-1",
                      message.role === 'user' ? "text-right" : "text-left"
                    )}>
                      {message.timestamp.toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </div>
                </div>
              ))}

              {/* Loading indicator */}
              {isLoading && (
                <div className="flex items-start space-x-3" data-testid="loading-indicator">
                  <div className="w-8 h-8 rounded-full bg-gray-700 text-gray-300 flex items-center justify-center flex-shrink-0">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div className="bg-gray-800 rounded-2xl px-4 py-3">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="border-t border-white/10 p-4">
              <div className="flex space-x-3">
                <Textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask about trading strategies, risk management, prop firm requirements..."
                  className="flex-1 min-h-[60px] max-h-[120px] bg-gray-800/50 border-gray-700 text-white placeholder-gray-400 resize-none"
                  disabled={isLoading}
                  data-testid="input-message"
                />
                <Button
                  onClick={sendMessage}
                  disabled={!input.trim() || isLoading}
                  className="bg-apple-blue hover:bg-apple-blue/80 self-end h-[60px] px-4"
                  data-testid="button-send"
                >
                  <Send className="w-5 h-5" />
                </Button>
              </div>
              <div className="text-xs text-gray-500 mt-2">
                Press Enter to send, Shift+Enter for new line
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}