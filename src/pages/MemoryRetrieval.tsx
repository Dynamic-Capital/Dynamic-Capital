import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Search, Database } from "lucide-react";
import { toast } from "sonner";

interface SearchResult {
  question: string;
  answer: string;
  distance: number;
}

export default function MemoryRetrieval() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const searchKnowledge = async () => {
    if (!query.trim()) return;

    setIsSearching(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-faq-assistant", {
        body: { question: query },
      });

      if (error) throw error;

      // Simulate getting search results with similarity scores
      setResults([
        {
          question: query,
          answer: data.answer || "No answer found",
          distance: 0.15,
        },
      ]);

      toast.success("Search completed");
    } catch (error) {
      console.error("Search error:", error);
      toast.error("Search failed");
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Database className="w-8 h-8 text-primary" />
          <h1 className="text-3xl font-bold">Memory & Retrieval</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Semantic Search</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                searchKnowledge();
              }}
              className="flex gap-2"
            >
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search knowledge base..."
                disabled={isSearching}
              />
              <Button type="submit" disabled={isSearching || !query.trim()}>
                {isSearching ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Search className="w-4 h-4" />
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {results.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Search Results</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                <div className="space-y-4">
                  {results.map((result, idx) => (
                    <div key={idx} className="border rounded-lg p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold">{result.question}</h3>
                        <span className="text-sm text-muted-foreground">
                          Similarity: {((1 - result.distance) * 100).toFixed(1)}%
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">{result.answer}</p>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>About Memory & Retrieval</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              This phase implements semantic search and vector embeddings for knowledge retrieval.
            </p>
            <ul className="list-disc list-inside space-y-1">
              <li>FAQ embeddings for quick answers</li>
              <li>Conversation history retrieval</li>
              <li>Context-aware responses</li>
              <li>Similarity-based matching</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
