import {
  type SupabaseFilterRPCCall,
  SupabaseVectorStore,
} from "@langchain/community/vectorstores/supabase";
import { OpenAIEmbeddings } from "@langchain/openai";
import { createClient } from "@supabase/supabase-js";

interface SampleDocument {
  id: string;
  pageContent: string;
  metadata: Record<string, unknown>;
}

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Expected env var ${key}`);
  }
  return value;
}

export async function run(): Promise<void> {
  const serviceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
  const supabaseUrl = requireEnv("SUPABASE_URL");
  const openAIApiKey = requireEnv("OPENAI_API_KEY");

  const client = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const embeddings = new OpenAIEmbeddings({
    apiKey: openAIApiKey,
    model: "text-embedding-3-small",
    stripNewLines: true,
  });

  const documents: SampleDocument[] = [
    {
      id: "demo:quantum-fluff",
      pageContent:
        "This is a long text, but it actually means something because vector database does not understand Lorem Ipsum. So I would need to expand upon the notion of quantum fluff, a theoretical concept where subatomic particles coalesce to form transient multidimensional spaces. Yet, this abstraction holds no real-world application or comprehensible meaning, reflecting a cosmic puzzle.",
      metadata: { b: 1, c: 10, stuff: "right" },
    },
    {
      id: "demo:binary-corridors",
      pageContent:
        "This is a long text, but it actually means something because vector database does not understand Lorem Ipsum. So I would need to proceed by discussing the echo of virtual tweets in the binary corridors of the digital universe. Each tweet, like a pixelated canary, hums in an unseen frequency, a fascinatingly perplexing phenomenon that, while conjuring vivid imagery, lacks any concrete implication or real-world relevance, portraying a paradox of multidimensional spaces in the age of cyber folklore.",
      metadata: { b: 2, c: 9, stuff: "right" },
    },
    {
      id: "demo:hello-1",
      pageContent: "hello",
      metadata: { b: 1, c: 9, stuff: "right" },
    },
    {
      id: "demo:hello-2",
      pageContent: "hello",
      metadata: { b: 1, c: 9, stuff: "wrong" },
    },
    {
      id: "demo:hi",
      pageContent: "hi",
      metadata: { b: 2, c: 8, stuff: "right" },
    },
    {
      id: "demo:bye",
      pageContent: "bye",
      metadata: { b: 3, c: 7, stuff: "right" },
    },
    {
      id: "demo:whats-this",
      pageContent: "what's this",
      metadata: { b: 4, c: 6, stuff: "right" },
    },
  ];

  const ids = documents.map((doc) => doc.id);
  const payload = documents.map((doc) => ({
    pageContent: doc.pageContent,
    metadata: doc.metadata,
  }));

  try {
    if (ids.length > 0) {
      const { error } = await client.from("documents").delete().in("id", ids);
      if (error) {
        console.warn(
          "[vector-search] Failed to delete existing demo documents",
          error,
        );
      }
    }
  } catch (error) {
    console.warn(
      "[vector-search] Failed to delete existing demo documents",
      error,
    );
  }

  const store = new SupabaseVectorStore(embeddings, {
    client,
    tableName: "documents",
  });

  await store.addDocuments(payload, { ids });

  const filterMultidimensional: SupabaseFilterRPCCall = (rpc) =>
    rpc
      .filter("metadata->b::int", "lt", 3)
      .filter("metadata->c::int", "gt", 7)
      .textSearch("content", "'multidimensional' & 'spaces'", {
        config: "english",
      });

  const filterRightStuff: SupabaseFilterRPCCall = (rpc) =>
    rpc
      .filter("metadata->b::int", "lt", 3)
      .filter("metadata->c::int", "gt", 7)
      .filter("metadata->>stuff", "eq", "right");

  const [resultA, resultB] = await Promise.all([
    store.similaritySearch("quantum", 4, filterMultidimensional),
    store.similaritySearch("hello", 2, filterRightStuff),
  ]);

  console.log(
    "[vector-search] Quantum query",
    JSON.stringify(resultA, null, 2),
  );
  console.log("[vector-search] Hello query", JSON.stringify(resultB, null, 2));
}

run().catch((error) => {
  console.error("[vector-search] Supabase vector search demo failed");
  console.error(error);
  process.exitCode = 1;
});
