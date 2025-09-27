"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import {
  forwardRef,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { Flex } from ".";
const FlipFx = forwardRef((props, ref) => {
  const {
    flipDirection = "horizontal",
    timing = 2000,
    flipped,
    onFlip,
    disableClickFlip = false,
    autoFlipInterval,
    front,
    back,
    className,
    style,
    ...flex
  } = props;
  const [internalFlipped, setInternalFlipped] = useState(false);
  const flippedState = flipped ?? internalFlipped;
  const cardRef = useRef(null);
  const frontRef = useRef(null);
  const backRef = useRef(null);
  useLayoutEffect(() => {
    const updateHeight = () => {
      if (cardRef.current && frontRef.current && backRef.current) {
        const frontH = frontRef.current.scrollHeight;
        const backH = backRef.current.scrollHeight;
        cardRef.current.style.height = `${Math.max(frontH, backH)}px`;
      }
    };
    updateHeight();
    const observer = new ResizeObserver(updateHeight);
    if (frontRef.current) {
      observer.observe(frontRef.current);
    }
    if (backRef.current) {
      observer.observe(backRef.current);
    }
    return () => observer.disconnect();
  }, [flippedState, front, back]);
  useEffect(() => {
    if (autoFlipInterval) {
      const interval = setInterval(() => {
        setInternalFlipped((prev) => !prev);
        onFlip?.(!flippedState);
      }, autoFlipInterval * 1000);
      return () => clearInterval(interval);
    }
  }, [autoFlipInterval, flippedState, onFlip]);
  const handleFlip = useCallback(() => {
    if (disableClickFlip || autoFlipInterval) {
      return;
    }
    setInternalFlipped((v) => !v);
    onFlip?.(!flippedState);
  }, [disableClickFlip, autoFlipInterval, flippedState, onFlip]);
  const handleKeyDown = useCallback((event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleFlip();
    }
  }, [handleFlip]);
  return (_jsxs(Flex, {
    ref: (node) => {
      cardRef.current = node;
      if (typeof ref === "function") {
        ref(node);
      } else if (ref) {
        ref.current = node;
      }
    },
    className: className,
    style: {
      transformStyle: "preserve-3d",
      transition: `transform ${timing}ms cubic-bezier(0.22, 1, 0.36, 1)`,
      transform: flippedState
        ? flipDirection === "vertical" ? "rotateX(180deg)" : "rotateY(180deg)"
        : "none",
      perspective: "1000px",
      ...style,
    },
    onClick: handleFlip,
    onKeyDown: handleKeyDown,
    role: "button",
    "aria-pressed": flippedState,
    tabIndex: 0,
    ...flex,
    children: [
      _jsx(Flex, {
        ref: frontRef,
        fill: true,
        position: "absolute",
        overflow: "hidden",
        "aria-hidden": flippedState,
        style: {
          backfaceVisibility: "hidden",
        },
        children: front,
      }),
      _jsx(Flex, {
        ref: backRef,
        fill: true,
        position: "absolute",
        overflow: "hidden",
        "aria-hidden": !flippedState,
        style: {
          backfaceVisibility: "hidden",
          transform: "rotateY(180deg)",
        },
        children: _jsx(Flex, {
          fill: true,
          style: {
            transform: flipDirection === "vertical"
              ? "rotateY(-180deg) rotateX(180deg)"
              : undefined,
          },
          children: back,
        }),
      }),
    ],
  }));
});
FlipFx.displayName = "FlipFx";
export { FlipFx };
//# sourceMappingURL=FlipFx.js.map
