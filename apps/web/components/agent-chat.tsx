'use client';

import { httpsCallable } from 'firebase/functions';
import { Bot, Send, User } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { functions } from '@/lib/firebase';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface AgentChatProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AgentChat({ open, onOpenChange }: AgentChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll when messages change
  // biome-ignore lint/correctness/useExhaustiveDependencies: We want to scroll when messages OR loading state changes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Call the flipAgent function
      if (!functions) {
        throw new Error('Firebase functions not initialized');
      }

      const callAgent = httpsCallable<
        { request: string },
        { success: boolean; message: string; data?: unknown }
      >(functions, 'flipAgent');

      const result = await callAgent({ request: userMessage.content });

      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: result.data.message || 'Operation completed successfully.',
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error calling flipAgent:', error);

      const errorMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'Sorry, I encountered an error processing your request. Please try again.',
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] h-[80vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="flex items-center gap-2">
            <Bot className="size-5 text-primary" />
            Flip Agent
          </DialogTitle>
          <DialogDescription>
            Ask me anything about creating flips, generating videos, managing feeds, and more.
          </DialogDescription>
        </DialogHeader>

        {/* Messages Area */}
        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full px-6">
            <div ref={scrollRef}>
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center min-h-[400px] text-center text-muted-foreground py-12">
                  <Bot className="size-12 mb-4 opacity-50" />
                  <p className="text-sm font-medium mb-2">Start a conversation</p>
                  <p className="text-xs max-w-sm">
                    Try asking: "Create a flip from my video", "Generate a dragon video", or "Show
                    me my feeds"
                  </p>
                </div>
              ) : (
                <div className="space-y-4 py-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={cn(
                        'flex gap-3 items-start',
                        message.role === 'user' ? 'flex-row-reverse' : ''
                      )}
                    >
                      {/* Avatar */}
                      <div
                        className={cn(
                          'flex items-center justify-center size-8 rounded-full shrink-0',
                          message.role === 'user'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground'
                        )}
                      >
                        {message.role === 'user' ? (
                          <User className="size-4" />
                        ) : (
                          <Bot className="size-4" />
                        )}
                      </div>

                      {/* Message Bubble */}
                      <div
                        className={cn(
                          'flex-1 rounded-lg px-4 py-3 text-sm max-w-[80%]',
                          message.role === 'user'
                            ? 'bg-primary text-primary-foreground ml-auto'
                            : 'bg-muted'
                        )}
                      >
                        <p className="whitespace-pre-wrap wrap-break-word">{message.content}</p>
                        <p
                          className={cn(
                            'text-xs mt-1 opacity-70',
                            message.role === 'user' ? 'text-right' : ''
                          )}
                        >
                          {message.timestamp.toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </div>
                  ))}

                  {/* Loading Indicator */}
                  {isLoading && (
                    <div className="flex gap-3 items-start">
                      <div className="flex items-center justify-center size-8 rounded-full shrink-0 bg-muted text-muted-foreground">
                        <Bot className="size-4" />
                      </div>
                      <div className="flex-1 rounded-lg px-4 py-3 text-sm max-w-[80%] bg-muted">
                        <div className="flex gap-1">
                          <div className="size-2 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:-0.3s]" />
                          <div className="size-2 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:-0.15s]" />
                          <div className="size-2 rounded-full bg-muted-foreground/50 animate-bounce" />
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Input Area */}
        <div className="border-t px-6 py-4 shrink-0">
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your message..."
              disabled={isLoading}
              className="flex-1"
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              size="icon"
              className="shrink-0"
            >
              <Send className="size-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Press Enter to send, Shift+Enter for new line
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
