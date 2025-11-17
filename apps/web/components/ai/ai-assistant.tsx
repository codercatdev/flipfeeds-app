"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Paperclip } from "lucide-react"

export function AiAssistant() {
  return (
    <div className="flex items-center gap-2">
      <Input type="text" placeholder="Ask AI..." />
      <Button variant="ghost" size="icon">
        <Paperclip />
      </Button>
    </div>
  )
}
