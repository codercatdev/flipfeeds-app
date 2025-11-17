"use client";

import { useChat } from "ai/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function Chat() {
  const { messages, input, handleInputChange, handleSubmit } = useChat();

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Create a New Feed</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col h-[60vh]">
          <ScrollArea className="flex-grow mb-4 pr-4">
            {messages.map((m) => (
              <div key={m.id} className="whitespace-pre-wrap mb-2">
                <b>{m.role === "user" ? "You: " : "AI: "}</b>
                {m.content}
              </div>
            ))}
          </ScrollArea>

          <form onSubmit={handleSubmit} className="flex items-center gap-2">
            <Input
              value={input}
              placeholder="Describe the feed you want to create..."
              onChange={handleInputChange}
            />
            <Button type="submit">Send</Button>
          </form>
        </div>
      </CardContent>
    </Card>
  );
}
