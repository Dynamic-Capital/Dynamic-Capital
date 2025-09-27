"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { forwardRef, useCallback, useEffect, useRef, useState } from "react";
import { Column, Flex, Row, SmartLink, Text, useHeadingLinks } from "../../";
const HeadingNav = forwardRef(({ className, style, ...rest }, ref) => {
  const [activeHeadingId, setActiveHeadingId] = useState(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const indicatorRef = useRef(null);
  const headings = useHeadingLinks();
  const observerRef = useRef(null);
  const lastUpdateTimeRef = useRef(0);
  const pendingUpdateRef = useRef(null);
  const scrollTimeoutRef = useRef(null);
  const isUpdatingRef = useRef(false);
  const updateActiveHeadingInternal = useCallback((id) => {
    const index = headings.findIndex((h) => h.id === id);
    if (index !== -1) {
      setActiveHeadingId(id);
      setActiveIndex(index);
      if (indicatorRef.current) {
        indicatorRef.current.style.top =
          `calc(${index} * var(--static-space-32))`;
      }
      lastUpdateTimeRef.current = Date.now();
      isUpdatingRef.current = false;
    }
  }, [headings]);
  useEffect(() => {
    if (headings.length === 0) {
      return;
    }
    setActiveHeadingId(headings[0]?.id || null);
    const headingElements = headings
      .map((heading) => document.getElementById(heading.id))
      .filter(Boolean);
    const headingPositions = new Map();
    const calculateHeadingPositions = () => {
      headingElements.forEach((el) => {
        if (el) {
          headingPositions.set(
            el.id,
            el.getBoundingClientRect().top + window.scrollY - 150,
          );
        }
      });
    };
    calculateHeadingPositions();
    const debouncedUpdateActiveHeading = (id) => {
      const now = Date.now();
      if (isUpdatingRef.current) {
        pendingUpdateRef.current = id;
        return;
      }
      if (now - lastUpdateTimeRef.current < 200) {
        pendingUpdateRef.current = id;
        if (scrollTimeoutRef.current) {
          clearTimeout(scrollTimeoutRef.current);
        }
        scrollTimeoutRef.current = setTimeout(() => {
          if (pendingUpdateRef.current) {
            isUpdatingRef.current = true;
            updateActiveHeadingInternal(pendingUpdateRef.current);
            pendingUpdateRef.current = null;
          }
        }, 200);
        return;
      }
      isUpdatingRef.current = true;
      updateActiveHeadingInternal(id);
    };
    const findActiveHeading = () => {
      const scrollPosition = window.scrollY;
      let activeId = headings[0]?.id;
      let closestPosition = -Infinity;
      headingPositions.forEach((position, id) => {
        if (position <= scrollPosition && position > closestPosition) {
          closestPosition = position;
          activeId = id;
        }
      });
      if (activeId) {
        debouncedUpdateActiveHeading(activeId);
      }
    };
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          findActiveHeading();
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    observerRef.current = new IntersectionObserver((entries) => {
      if (Date.now() - lastUpdateTimeRef.current > 400) {
        const enteringEntries = entries.filter((entry) => entry.isIntersecting);
        if (enteringEntries.length > 0) {
          enteringEntries.sort((a, b) => {
            const aRect = a.boundingClientRect;
            const bRect = b.boundingClientRect;
            return aRect.top - bRect.top;
          });
          debouncedUpdateActiveHeading(enteringEntries[0].target.id);
        }
      }
    }, {
      rootMargin: "-150px 0px -30% 0px",
      threshold: [0, 0.1, 0.5, 1],
    });
    headingElements.forEach((element) => {
      if (element && observerRef.current) {
        observerRef.current.observe(element);
      }
    });
    window.addEventListener("resize", calculateHeadingPositions);
    findActiveHeading();
    return () => {
      if (observerRef.current) {
        headingElements.forEach((element) => {
          if (element) {
            observerRef.current?.unobserve(element);
          }
        });
      }
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", calculateHeadingPositions);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [headings, updateActiveHeadingInternal]);
  const handleHeadingClick = (id, index) => {
    setActiveHeadingId(id);
    setActiveIndex(index);
    if (indicatorRef.current) {
      indicatorRef.current.style.top =
        `calc(${index} * var(--static-space-32))`;
    }
    lastUpdateTimeRef.current = Date.now();
  };
  return (_jsxs(Row, {
    paddingLeft: "8",
    gap: "12",
    className: className,
    style: style,
    ref: ref,
    ...rest,
    children: [
      _jsx(Row, {
        width: "2",
        background: "neutral-alpha-medium",
        radius: "full",
        overflow: "hidden",
        children: _jsx(Row, {
          ref: indicatorRef,
          height: "32",
          paddingY: "4",
          fillWidth: true,
          position: "absolute",
          style: {
            top: `calc(${activeIndex} * var(--static-space-32))`,
            transition: "top 0.3s ease",
          },
          children: _jsx(Row, {
            fillWidth: true,
            solid: "brand-strong",
            radius: "full",
          }),
        }),
      }),
      _jsx(Column, {
        fillWidth: true,
        children: headings.map((heading, index) => {
          const indent = heading.level - 2;
          const isActive = heading.id === activeHeadingId;
          return (_jsx(Flex, {
            fillWidth: true,
            height: "32",
            paddingX: "4",
            children: _jsx(SmartLink, {
              fillWidth: true,
              href: "#" + heading.id,
              onClick: (e) => {
                e.preventDefault();
                const target = document.getElementById(heading.id);
                if (target) {
                  const targetPosition = target.getBoundingClientRect().top +
                    window.scrollY - 150;
                  window.scrollTo({
                    top: targetPosition,
                    behavior: "smooth",
                  });
                  handleHeadingClick(heading.id, index);
                }
              },
              style: {
                paddingLeft: `calc(${indent} * var(--static-space-8))`,
                color: isActive
                  ? "var(--neutral-on-background-strong)"
                  : "var(--neutral-on-background-weak)",
                transition: "color 0.2s ease",
              },
              children: _jsx(Text, {
                variant: isActive ? "body-strong-s" : "body-default-s",
                truncate: true,
                style: {
                  transition: "font-weight 0.2s ease",
                },
                children: heading.text,
              }),
            }),
          }, heading.id));
        }),
      }),
    ],
  }));
});
HeadingNav.displayName = "HeadingNav";
export { HeadingNav };
//# sourceMappingURL=HeadingNav.js.map
