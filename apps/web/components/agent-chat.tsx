'use client';

import { httpsCallable } from 'firebase/functions';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { Bot, Image as ImageIcon, Send, User, Video, X } from 'lucide-react';
import Image from 'next/image';
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
import { functions, storage } from '@/lib/firebase';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  imageUrls?: string[];
  videoUrls?: string[];
}

interface AgentChatProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AgentChat({ open, onOpenChange }: AgentChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string>(`conv_${Date.now()}`);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [uploadedVideos, setUploadedVideos] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll when messages change
  // biome-ignore lint/correctness/useExhaustiveDependencies: We want to scroll when messages OR loading state changes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);

    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        // Convert file to data URL for immediate preview and upload
        const reader = new FileReader();
        return new Promise<{ url: string; type: 'image' | 'video' }>((resolve, reject) => {
          reader.onload = async (event) => {
            const dataUrl = event.target?.result as string;

            // Upload to Firebase Storage for permanent URL
            if (!storage) {
              // Fallback to data URL if storage not available
              resolve({
                url: dataUrl,
                type: file.type.startsWith('image/') ? 'image' : 'video',
              });
              return;
            }

            try {
              const timestamp = Date.now();
              const fileName = `temp-uploads/${timestamp}_${file.name}`;
              const storageRef = ref(storage, fileName);
              await uploadBytes(storageRef, file);
              const downloadUrl = await getDownloadURL(storageRef);

              resolve({
                url: downloadUrl,
                type: file.type.startsWith('image/') ? 'image' : 'video',
              });
            } catch (error) {
              console.error('Upload error:', error);
              // Fallback to data URL
              resolve({
                url: dataUrl,
                type: file.type.startsWith('image/') ? 'image' : 'video',
              });
            }
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      });

      const uploads = await Promise.all(uploadPromises);

      const newImages = uploads.filter((u) => u.type === 'image').map((u) => u.url);
      const newVideos = uploads.filter((u) => u.type === 'video').map((u) => u.url);

      setUploadedImages((prev) => [...prev, ...newImages]);
      setUploadedVideos((prev) => [...prev, ...newVideos]);
    } catch (error) {
      console.error('File upload error:', error);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const removeImage = (index: number) => {
    setUploadedImages((prev) => prev.filter((_, i) => i !== index));
  };

  const removeVideo = (index: number) => {
    setUploadedVideos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
      imageUrls: uploadedImages.length > 0 ? [...uploadedImages] : undefined,
      videoUrls: uploadedVideos.length > 0 ? [...uploadedVideos] : undefined,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');

    // Clear uploaded media after sending
    const currentImages = [...uploadedImages];
    const currentVideos = [...uploadedVideos];
    setUploadedImages([]);
    setUploadedVideos([]);

    setIsLoading(true);

    try {
      // Call the flipAgent function
      if (!functions) {
        throw new Error('Firebase functions not initialized');
      }

      const callAgent = httpsCallable<
        { request: string; imageUrls?: string[]; videoUrls?: string[]; conversationId?: string },
        { success: boolean; message: string; data?: { conversationId?: string } }
      >(functions, 'flipAgent');

      const result = await callAgent({
        request: userMessage.content,
        imageUrls: currentImages.length > 0 ? currentImages : [],
        videoUrls: currentVideos.length > 0 ? currentVideos : [],
        conversationId,
      });

      // Update conversation ID if returned
      if (result.data.data?.conversationId && result.data.data.conversationId !== conversationId) {
        setConversationId(result.data.data.conversationId);
      }

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
                        {/* Show attached images */}
                        {message.imageUrls && message.imageUrls.length > 0 && (
                          <div className="grid grid-cols-2 gap-2 mb-2">
                            {message.imageUrls.map((url) => (
                              <div key={url} className="relative w-full h-40">
                                <Image
                                  src={url}
                                  alt="Uploaded content"
                                  fill
                                  className="rounded-md object-cover"
                                />
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Show attached videos */}
                        {message.videoUrls && message.videoUrls.length > 0 && (
                          <div className="space-y-2 mb-2">
                            {message.videoUrls.map((url) => (
                              // biome-ignore lint/a11y/useMediaCaption: User uploaded videos
                              <video
                                key={url}
                                src={url}
                                controls
                                className="rounded-md w-full max-h-60"
                              />
                            ))}
                          </div>
                        )}

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
          {/* Media Preview Area */}
          {(uploadedImages.length > 0 || uploadedVideos.length > 0) && (
            <div className="mb-3 p-2 bg-muted rounded-md">
              <div className="flex flex-wrap gap-2">
                {uploadedImages.map((url, idx) => (
                  <div key={url} className="relative group">
                    <div className="relative w-20 h-20">
                      <Image
                        src={url}
                        alt="Upload preview"
                        fill
                        className="rounded-md object-cover"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeImage(idx)}
                      className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="size-3" />
                    </button>
                  </div>
                ))}
                {uploadedVideos.map((url, idx) => (
                  <div key={url} className="relative group">
                    <div className="relative w-20 h-20 flex items-center justify-center bg-muted-foreground/10 rounded-md">
                      <Video className="size-8 text-muted-foreground" />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeVideo(idx)}
                      className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="size-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              multiple
              className="hidden"
              onChange={handleFileUpload}
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading || isUploading}
              className="shrink-0"
            >
              <ImageIcon className="size-4" />
            </Button>
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your message..."
              disabled={isLoading || isUploading}
              className="flex-1"
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim() || isLoading || isUploading}
              size="icon"
              className="shrink-0"
            >
              <Send className="size-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {isUploading
              ? 'Uploading files...'
              : 'Press Enter to send, Shift+Enter for new line. Click the image icon to attach photos/videos.'}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
