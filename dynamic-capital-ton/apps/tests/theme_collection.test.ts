import {
  assertEquals,
  assertThrows,
} from "https://deno.land/std@0.224.0/assert/mod.ts";

interface ContentEvent {
  op: string;
  itemId: number;
  priority: number;
  contentUri: string;
}

interface FreezeEvent {
  op: string;
  itemId: number;
  frozen: boolean;
}

type ThemeEvent = ContentEvent | FreezeEvent;

class ThemeCollectionMock {
  #dao: string;
  #content = new Map<number, string>();
  #priority = new Map<number, number>();
  #frozen = new Set<number>();
  #events: ThemeEvent[] = [];

  constructor(dao: string) {
    this.#dao = dao;
  }

  get events(): ThemeEvent[] {
    return this.#events;
  }

  getContent(id: number): string | undefined {
    return this.#content.get(id);
  }

  getPriority(id: number): number {
    return this.#priority.get(id) ?? 0;
  }

  isFrozen(id: number): boolean {
    return this.#frozen.has(id);
  }

  setContent({ sender, itemId, uri, priority }: {
    sender: string;
    itemId: number;
    uri: string;
    priority: number;
  }): void {
    if (sender !== this.#dao) {
      throw new Error("theme: unauthorized");
    }
    if (this.#frozen.has(itemId)) {
      throw new Error("theme: frozen");
    }
    this.#content.set(itemId, uri);
    this.#priority.set(itemId, priority);
    this.#events.push({
      op: "0x544d4531",
      itemId,
      priority,
      contentUri: uri,
    });
  }

  freeze({ sender, itemId }: { sender: string; itemId: number }): void {
    if (sender !== this.#dao) {
      throw new Error("theme: unauthorized");
    }
    this.#frozen.add(itemId);
    this.#events.push({
      op: "0x544d4532",
      itemId,
      frozen: true,
    });
  }
}

Deno.test("setContent only allows DAO multisig", () => {
  const collection = new ThemeCollectionMock("DAO");
  assertThrows(
    () =>
      collection.setContent({
        sender: "intruder",
        itemId: 0,
        uri: "ipfs://intruder",
        priority: 10,
      }),
    Error,
    "unauthorized",
  );

  collection.setContent({
    sender: "DAO",
    itemId: 0,
    uri: "ipfs://valid",
    priority: 42,
  });

  assertEquals(collection.getContent(0), "ipfs://valid");
  assertEquals(collection.getPriority(0), 42);
});

Deno.test("setContent emits content and freeze events", () => {
  const collection = new ThemeCollectionMock("DAO");
  collection.setContent({
    sender: "DAO",
    itemId: 1,
    uri: "ipfs://theme/1",
    priority: 90,
  });
  collection.freeze({ sender: "DAO", itemId: 1 });

  assertEquals(collection.events, [
    {
      op: "0x544d4531",
      itemId: 1,
      priority: 90,
      contentUri: "ipfs://theme/1",
    },
    {
      op: "0x544d4532",
      itemId: 1,
      frozen: true,
    },
  ]);

  assertThrows(
    () =>
      collection.setContent({
        sender: "DAO",
        itemId: 1,
        uri: "ipfs://theme/1b",
        priority: 10,
      }),
    Error,
    "frozen",
  );
});
