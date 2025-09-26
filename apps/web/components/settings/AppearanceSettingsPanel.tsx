"use client";

import { useCallback } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useTheme } from "@/hooks/useTheme";
import { useThemePass } from "@/hooks/useThemePass";

export function AppearanceSettingsPanel() {
  const { theme, setTheme } = useTheme();
  const {
    unlocked,
    selected,
    selectTheme,
    clearTheme,
    status,
    isFetching,
    error,
  } = useThemePass();

  const handleApply = useCallback(
    async (themeId: string) => {
      await selectTheme(themeId);
    },
    [selectTheme],
  );

  const handleClear = useCallback(async () => {
    await clearTheme();
  }, [clearTheme]);

  const handleSetTheme = useCallback(
    async (mode: "light" | "dark" | "system") => {
      await setTheme(mode);
    },
    [setTheme],
  );

  const hasThemePasses = unlocked.length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Appearance</CardTitle>
        <CardDescription>
          Choose your base theme and apply Theme Pass palettes when available.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium">Theme preference</h3>
              <p className="text-sm text-muted-foreground">
                Current mode: <span className="font-semibold">{theme}</span>
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant={theme === "light" ? "default" : "outline"}
                size="sm"
                onClick={() => handleSetTheme("light")}
              >
                Light
              </Button>
              <Button
                variant={theme === "dark" ? "default" : "outline"}
                size="sm"
                onClick={() => handleSetTheme("dark")}
              >
                Dark
              </Button>
              <Button
                variant={theme === "system" ? "default" : "outline"}
                size="sm"
                onClick={() => handleSetTheme("system")}
              >
                System
              </Button>
            </div>
          </div>
        </section>

        <Separator />

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium">Theme Passes</h3>
              <p className="text-sm text-muted-foreground">
                Unlock partner palettes by connecting a supported TON wallet.
              </p>
            </div>
            {selected
              ? (
                <Badge variant="outline" className="text-xs">
                  Active: {selected.name}
                </Badge>
              )
              : (
                <Badge variant="secondary" className="text-xs">
                  Default styling
                </Badge>
              )}
          </div>

          {!hasThemePasses && (
            <p className="text-sm text-muted-foreground">
              {status === "loading"
                ? "Checking your wallet for Theme Passes…"
                : "Connect a wallet with an eligible Theme Pass to unlock additional palettes."}
            </p>
          )}

          {error && (
            <p className="text-sm text-destructive">
              {error}
            </p>
          )}

          <div className="grid gap-3">
            {unlocked.map((themeOption) => (
              <div
                key={themeOption.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/60 bg-muted/10 p-3"
              >
                <div>
                  <p className="text-sm font-medium">{themeOption.name}</p>
                  {themeOption.description && (
                    <p className="text-xs text-muted-foreground">
                      {themeOption.description}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {selected?.id === themeOption.id
                    ? <Badge className="text-xs">Active</Badge>
                    : null}
                  <Button
                    size="sm"
                    variant={selected?.id === themeOption.id
                      ? "default"
                      : "outline"}
                    onClick={() => handleApply(themeOption.id)}
                    disabled={isFetching}
                  >
                    {selected?.id === themeOption.id ? "Reapply" : "Activate"}
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {hasThemePasses && (
            <div className="flex items-center justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClear}
                disabled={!selected || isFetching}
              >
                Remove Theme Pass styling
              </Button>
            </div>
          )}
        </section>
      </CardContent>
    </Card>
  );
}
