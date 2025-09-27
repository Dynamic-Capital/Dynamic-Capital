"use client";
import {
  Fragment as _Fragment,
  jsx as _jsx,
  jsxs as _jsxs,
} from "react/jsx-runtime";
import React, { useEffect, useRef, useState } from "react";
import { Column, Row, Spinner } from ".";
function InfiniteScroll(
  { items, renderItem, loadMore, loading = false, threshold = 200, ...flex },
) {
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(loading);
  const observerRef = useRef(null);
  const sentinelRef = useRef(null);
  // Keep internal loading in sync with prop
  useEffect(() => {
    setIsLoading(loading);
  }, [loading]);
  const handleLoadMore = async () => {
    if (isLoading || !hasMore) {
      return;
    }
    setIsLoading(true);
    try {
      const more = await loadMore();
      setHasMore(more);
    } catch (error) {
      console.error("Error loading more items:", error);
      setHasMore(false);
    } finally {
      setIsLoading(false);
    }
  };
  useEffect(() => {
    if (!hasMore || isLoading) {
      return;
    }
    observerRef.current?.disconnect();
    observerRef.current = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        handleLoadMore();
      }
    }, {
      root: null,
      rootMargin: `0px 0px ${threshold}px 0px`,
      threshold: 0,
    });
    if (sentinelRef.current) {
      observerRef.current.observe(sentinelRef.current);
    }
    return () => observerRef.current?.disconnect();
  }, [items.length, hasMore, isLoading, threshold]);
  return (_jsxs(_Fragment, {
    children: [
      items.map((
        item,
        index,
      ) => (_jsx(
        React.Fragment,
        { children: renderItem(item, index) },
        index,
      ))),
      _jsx(Row, {
        ...flex,
        children: _jsx("div", {
          ref: sentinelRef,
          style: { height: 1, width: 1 },
        }),
      }),
      isLoading &&
      (_jsx(Column, {
        fillWidth: true,
        horizontal: "center",
        padding: "24",
        children: _jsx(Spinner, { size: "m" }),
      })),
    ],
  }));
}
InfiniteScroll.displayName = "InfiniteScroll";
export { InfiniteScroll };
//# sourceMappingURL=InfiniteScroll.js.map
