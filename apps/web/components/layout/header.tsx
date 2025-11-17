"use client"

import { Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Drawer,
  DrawerContent,
  DrawerTrigger,
} from "@/components/ui/drawer"
import { Sidebar } from "./sidebar"
import { FilterBar } from "./filter-bar"
import { AiAssistant } from "../ai/ai-assistant"

export function Header() {
  return (
    <header className="bg-card text-card-foreground p-4 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <div className="md:hidden">
          <Drawer>
            <DrawerTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Open menu">
                <Menu />
              </Button>
            </DrawerTrigger>
            <DrawerContent>
              <Sidebar />
            </DrawerContent>
          </Drawer>
        </div>
        <h1 className="text-xl font-bold">FlipFeeds</h1>
      </div>
      <div className="flex items-center gap-4">
        <FilterBar />
        <AiAssistant />
      </div>
    </header>
  )
}
