import { useEffect, useRef } from "react";
import { List, ListItem } from "@once-ui-system/core";

/**
 * Example usage to document the ref behaviour for List and ListItem.
 */
export function OnceUIListRefExample() {
  const listRef = useRef<HTMLUListElement | null>(null);
  const firstItemRef = useRef<HTMLLIElement | null>(null);

  useEffect(() => {
    if (listRef.current && firstItemRef.current) {
      console.assert(firstItemRef.current.tagName === "LI");
      console.assert(listRef.current.contains(firstItemRef.current));
    }
  }, []);

  return (
    <List ref={listRef} as="ul" gap="4">
      <ListItem ref={firstItemRef}>Tracked Item</ListItem>
      <ListItem>Supporting Item</ListItem>
    </List>
  );
}
