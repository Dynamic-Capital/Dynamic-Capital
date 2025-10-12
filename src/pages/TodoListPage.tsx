import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Circle, Loader2, RefreshCw } from "lucide-react";

interface RawTodo {
  id: number;
  title: string;
  is_complete: boolean | null;
  created_at?: string | null;
  inserted_at?: string | null;
}

interface TodoListItem {
  id: number;
  title: string;
  isComplete: boolean;
  createdAtLabel?: string;
}

const DATE_FORMATTER = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
});

export default function TodoListPage() {
  const [todos, setTodos] = useState<TodoListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const loadTodos = useCallback(async () => {
    if (!isMountedRef.current) {
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const { data, error } = await supabase
        .from<RawTodo>("todos")
        .select("*");

      if (!isMountedRef.current) {
        return;
      }

      if (error) {
        setTodos([]);
        setErrorMessage(error.message ?? "Unable to load todos.");
        return;
      }

      const items: TodoListItem[] = (data ?? []).map((todo) => {
        const timestamp = todo.created_at ?? todo.inserted_at ?? undefined;
        let createdAtLabel: string | undefined;

        if (timestamp) {
          const parsed = new Date(timestamp);
          if (!Number.isNaN(parsed.getTime())) {
            createdAtLabel = DATE_FORMATTER.format(parsed);
          }
        }

        return {
          id: todo.id,
          title: todo.title,
          isComplete: Boolean(todo.is_complete),
          createdAtLabel,
        } satisfies TodoListItem;
      });

      setTodos(items);
    } catch (error) {
      if (!isMountedRef.current) {
        return;
      }

      const message =
        error instanceof Error ? error.message : "Unexpected error fetching todos.";

      setTodos([]);
      setErrorMessage(message);
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void loadTodos();
  }, [loadTodos]);

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <Card className="shadow-lg">
          <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="space-y-1">
              <CardTitle>Todo List</CardTitle>
              <CardDescription>Realtime tasks synced directly from Supabase.</CardDescription>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => void loadTodos()}
              disabled={isLoading}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : errorMessage ? (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
                <p className="font-medium">Unable to load todos</p>
                <p className="mt-1 text-xs text-destructive/80">{errorMessage}</p>
              </div>
            ) : todos.length === 0 ? (
              <div className="rounded-lg border border-dashed p-6 text-center">
                <p className="text-sm font-medium">No todos found</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Start adding tasks in Supabase to see them appear here instantly.
                </p>
              </div>
            ) : (
              <ul className="space-y-3">
                {todos.map((todo) => (
                  <li
                    key={todo.id}
                    className="flex items-start justify-between gap-4 rounded-lg border bg-card/60 p-4 shadow-sm"
                  >
                    <div className="space-y-1">
                      <p className="text-sm font-medium leading-none">{todo.title}</p>
                      {todo.createdAtLabel && (
                        <p className="text-xs text-muted-foreground">Added {todo.createdAtLabel}</p>
                      )}
                    </div>
                    <div
                      className={`flex items-center gap-2 text-sm font-medium ${
                        todo.isComplete ? "text-emerald-600" : "text-muted-foreground"
                      }`}
                    >
                      {todo.isComplete ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : (
                        <Circle className="h-4 w-4" />
                      )}
                      {todo.isComplete ? "Completed" : "Pending"}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
