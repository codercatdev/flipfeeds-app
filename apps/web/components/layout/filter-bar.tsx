"use client"

import { Button } from "@/components/ui/button"
import { useState } from "react"

type Filter = "all" | "unread"

export function FilterBar() {
  const [activeFilter, setActiveFilter] = useState<Filter>("all")

  return (
    <div className="flex gap-2">
      <Button
        variant={activeFilter === "all" ? "secondary" : "ghost"}
        onClick={() => setActiveFilter("all")}
      >
        All
      </Button>
      <Button
        variant={activeFilter === "unread" ? "secondary" : "ghost"}
        onClick={() => setActiveFilter("unread")}
      >
        Unread
      </Button>
    </div>
  )
}
