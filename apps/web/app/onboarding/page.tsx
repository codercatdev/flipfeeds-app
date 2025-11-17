"use client";

import { useChat } from "ai/react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function OnboardingPage() {
  const { messages, input, handleInputChange, handleSubmit } = useChat({
    api: "/api/onboarding",
  });

  return (
    <div className="flex flex-col w-full min-h-screen items-center justify-center">
      <Card className="w-[350px]">
        <CardHeader>
          <CardTitle>Onboarding</CardTitle>
          <CardDescription>
            Welcome! Let's get you set up.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <div className="grid w-full items-center gap-4">
              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  placeholder="Your name"
                  value={input}
                  onChange={handleInputChange}
                />
              </div>
            </div>
          </form>
          <div>
            {messages.map((m) => (
              <div key={m.id}>
                {m.role === "user" ? "User: " : "AI: "}
                {m.content}
              </div>
            ))}
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline">Cancel</Button>
          <Button onClick={handleSubmit}>Continue</Button>
        </CardFooter>
      </Card>
    </div>
  );
}
