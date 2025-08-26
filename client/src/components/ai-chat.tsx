import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Minimize2, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";

interface ChatMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
}

interface AIChatProps {
  currentAccount?: any;
  isMinimized?: boolean;
  onToggleMinimize?: () => void;
}

export default function AIChat({ currentAccount, isMinimized = false, onToggleMinimize }: AIChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      content: "Hi! I'm your AI trading coach. I can help you analyze your trading performance, discuss strategies, and answer questions about your trades. What would you like to talk about today?",
      role: 'assistant',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

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
        accountId: currentAccount?.id,
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

  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50">
        <Button
          onClick={onToggleMinimize}
          className="bg-apple-blue hover:bg-apple-blue/80 rounded-full w-10 h-10 sm:w-12 sm:h-12 p-0"
          data-testid="button-expand-chat"
        >
          <Bot className="w-6 h-6" />
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 w-80 sm:w-96 h-[500px] sm:h-[600px] bg-gray-900/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <div className="flex items-center space-x-2">
          <Bot className="w-5 h-5 text-apple-blue" />
          <h3 className="font-semibold text-white" data-testid="text-chat-title">
            AI Trading Coach
          </h3>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleMinimize}
          className="text-gray-400 hover:text-white p-1"
          data-testid="button-minimize-chat"
        >
          <Minimize2 className="w-4 h-4" />
        </Button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4" data-testid="chat-messages">
        {messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              "flex items-start space-x-3",
              message.role === 'user' ? "justify-end" : "justify-start"
            )}
            data-testid={`message-${message.role}-${message.id}`}
          >
            {message.role === 'assistant' && (
              <div className="w-8 h-8 bg-apple-blue/20 rounded-full flex items-center justify-center flex-shrink-0">
                <Bot className="w-4 h-4 text-apple-blue" />
              </div>
            )}
            <div
              className={cn(
                "max-w-[280px] rounded-lg px-3 py-2 text-sm",
                message.role === 'user'
                  ? "bg-apple-blue text-white"
                  : "bg-gray-800 text-gray-100"
              )}
            >
              <p className="whitespace-pre-wrap">{message.content}</p>
              <p className="text-xs opacity-60 mt-1">
                {message.timestamp.toLocaleTimeString([], { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </p>
            </div>
            {message.role === 'user' && (
              <div className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center flex-shrink-0">
                <User className="w-4 h-4 text-gray-300" />
              </div>
            )}
          </div>
        ))}
        {isLoading && (
          <div className="flex items-start space-x-3" data-testid="chat-loading">
            <div className="w-8 h-8 bg-apple-blue/20 rounded-full flex items-center justify-center">
              <Bot className="w-4 h-4 text-apple-blue" />
            </div>
            <div className="bg-gray-800 rounded-lg px-3 py-2 text-sm">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-white/10">
        <div className="flex space-x-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask about your trading, strategies, risk management..."
            className="flex-1 bg-gray-800 border-gray-700 text-white resize-none min-h-[40px] max-h-[120px]"
            disabled={isLoading}
            data-testid="textarea-chat-input"
          />
          <Button
            onClick={sendMessage}
            disabled={!input.trim() || isLoading}
            className="bg-apple-blue hover:bg-apple-blue/80 px-3"
            data-testid="button-send-message"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
        <p className="text-xs text-gray-400 mt-2">
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}