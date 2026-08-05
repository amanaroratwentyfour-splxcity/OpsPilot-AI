"use client";

import { useState } from "react";
import { Menu, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { NavLinks } from "./sidebar";

/** Hamburger-triggered Sheet drawer exposing the same navigation as the
 *  desktop Sidebar. The Sidebar is hidden below the `md` breakpoint with no
 *  fallback, so this is the only way to reach any page other than the
 *  current one on a phone-width viewport. */
export function MobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" className="md:hidden" aria-label="Open navigation menu">
          <Menu className="h-4 w-4" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="flex w-64 flex-col p-0 sm:max-w-xs">
        <SheetTitle className="flex h-16 items-center gap-2 border-b px-6 text-left text-app-title tracking-tight">
          <Sparkles className="h-5 w-5 text-primary" />
          <span>OpsPilot AI</span>
        </SheetTitle>
        <NavLinks onNavigate={() => setOpen(false)} />
        <div className="border-t p-4 text-caption text-muted-foreground">
          OpsPilot AI
          <br />
          Operations Decision Hub
        </div>
      </SheetContent>
    </Sheet>
  );
}
