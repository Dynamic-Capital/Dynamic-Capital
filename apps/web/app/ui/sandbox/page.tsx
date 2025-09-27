"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ChevronDown, Play, Settings2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DynamicTable } from "@/components/ui/dynamic-table";
import { MotionPlayButton } from "@/components/ui/motion-play-button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function UISandbox() {
  const [loading, setLoading] = useState(false);

  return (
    <motion.div
      className="space-y-6 p-6 md:p-10"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg font-semibold">
            <Play className="h-4 w-4" />
            Interactive Patterns

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Quick actions"
                >
                  <Settings2 className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem
                  onSelect={() => {
                    setLoading(true);
                    setTimeout(() => setLoading(false), 900);
                  }}
                >
                  Trigger loading state
                </DropdownMenuItem>
                <DropdownMenuItem>Share sandbox</DropdownMenuItem>
                <DropdownMenuItem>Duplicate preset</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs defaultValue="a" className="w-full">
            <TabsList className="mb-2">
              <TabsTrigger value="a">Async demo</TabsTrigger>
              <TabsTrigger value="b">Command center</TabsTrigger>
              <TabsTrigger value="c">Quick actions</TabsTrigger>
              <TabsTrigger value="motion">Motion CTA</TabsTrigger>
            </TabsList>
            <TabsContent value="a" className="space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  onClick={() => {
                    setLoading(true);
                    setTimeout(() => setLoading(false), 900);
                  }}
                  className="inline-flex items-center gap-2"
                >
                  Fetch data
                  <Play className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  className="inline-flex items-center gap-2"
                >
                  Secondary
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </div>
              <div className="rounded-lg border bg-muted/40 p-4">
                {loading ? <Skeleton className="h-12 w-full" /> : (
                  <motion.div
                    key="loaded"
                    className="rounded-md bg-background p-4 shadow-sm"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25 }}
                  >
                    Data synced ✨
                  </motion.div>
                )}
              </div>
            </TabsContent>
            <TabsContent value="b">
              <Sheet>
                <SheetTrigger asChild>
                  <Button
                    variant="secondary"
                    className="inline-flex items-center gap-2"
                  >
                    Open sheet
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </SheetTrigger>
                <SheetContent className="space-y-4">
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold">Quick setup</h3>
                    <p className="text-sm text-muted-foreground">
                      Toggle actions to preview responsive menus and motion.
                    </p>
                  </div>
                  <div className="grid gap-2">
                    <Button className="justify-between">
                      Launch flow
                      <Play className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" className="justify-between">
                      Duplicate flow
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </div>
                </SheetContent>
              </Sheet>
            </TabsContent>
            <TabsContent value="c">
              <div className="flex flex-wrap gap-3">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      className="inline-flex items-center gap-2"
                    >
                      Status
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-44">
                    <DropdownMenuItem>On track</DropdownMenuItem>
                    <DropdownMenuItem>Needs review</DropdownMenuItem>
                    <DropdownMenuItem>Blocked</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button variant="ghost" size="icon">
                  <Settings2 className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon">
                  <Play className="h-4 w-4" />
                </Button>
              </div>
            </TabsContent>
            <TabsContent value="motion">
              <div className="flex flex-col items-center justify-center gap-6 rounded-2xl border border-white/10 bg-slate-950/60 p-6 text-center shadow-[0_12px_40px_rgba(15,23,42,0.55)]">
                <div className="max-w-sm text-sm text-muted-foreground">
                  High-fidelity call-to-action with layered motion, pointer
                  tracking, and spring physics powered by Framer Motion.
                </div>
                <MotionPlayButton aria-label="Preview motion call to action" />
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      <DynamicTable />
    </motion.div>
  );
}
