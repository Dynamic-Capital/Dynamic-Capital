"use client";
import {
  Fragment as _Fragment,
  jsx as _jsx,
  jsxs as _jsxs,
} from "react/jsx-runtime";
import {
  Column,
  Fade,
  Flex,
  IconButton,
  Media,
  RevealFx,
  Row,
  Scroller,
} from ".";
import { useEffect, useRef, useState } from "react";
import styles from "./Carousel.module.scss";
const Carousel = ({
  items = [],
  fill = false,
  controls = true,
  priority = false,
  indicator = "line",
  translateY,
  aspectRatio = "original",
  sizes,
  revealedByDefault = false,
  thumbnail = { scaling: 1, height: "80", sizes: "120px" },
  play = { auto: false, interval: 3000, controls: true },
  ...rest
}) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(revealedByDefault);
  const [initialTransition, setInitialTransition] = useState(revealedByDefault);
  const [isPlaying, setIsPlaying] = useState(play.auto || false);
  const [progressPercent, setProgressPercent] = useState(0);
  // Initialize auto-play state when props change
  useEffect(() => {
    setIsPlaying(play.auto || false);
  }, [play.auto]);
  const nextImageRef = useRef(null);
  const transitionTimeoutRef = useRef(undefined);
  const autoPlayIntervalRef = useRef(undefined);
  const touchStartXRef = useRef(null);
  const touchEndXRef = useRef(null);
  const preloadNextImage = (nextIndex) => {
    if (nextIndex >= 0 && nextIndex < items.length) {
      const item = items[nextIndex];
      if (typeof item.slide === "string") {
        nextImageRef.current = new Image();
        nextImageRef.current.src = item.slide;
      }
    }
  };
  const handlePrevClick = () => {
    if (items.length > 1 && activeIndex > 0) {
      const prevIndex = activeIndex - 1;
      handleControlClick(prevIndex);
    }
  };
  const handleNextClick = () => {
    if (items.length > 1) {
      // If at the last slide, loop back to the first one
      const nextIndex = activeIndex < items.length - 1 ? activeIndex + 1 : 0;
      handleControlClick(nextIndex);
    }
  };
  const handleControlClick = (nextIndex) => {
    if (nextIndex !== activeIndex && !transitionTimeoutRef.current) {
      preloadNextImage(nextIndex);
      setIsTransitioning(false);
      transitionTimeoutRef.current = setTimeout(() => {
        setActiveIndex(nextIndex);
        setTimeout(() => {
          setIsTransitioning(true);
          transitionTimeoutRef.current = undefined;
        }, 50);
      }, 300);
    }
  };
  // Simple function to handle auto-play
  const handleNextWithLoop = () => {
    const nextIndex = activeIndex < items.length - 1 ? activeIndex + 1 : 0;
    handleControlClick(nextIndex);
  };
  // Progress tracking for animation
  useEffect(() => {
    let progressTimer;
    if (isPlaying && play.progress && items.length > 1) {
      // Reset progress when slide changes
      setProgressPercent(0);
      // Update progress every 50ms
      const updateFrequency = 50; // ms
      const interval = play.interval || 3000; // Default to 3000ms if undefined
      const totalSteps = Math.floor(interval / updateFrequency);
      let currentStep = 0;
      progressTimer = setInterval(() => {
        currentStep++;
        const percent = Math.min((currentStep / totalSteps) * 100, 100);
        setProgressPercent(percent);
      }, updateFrequency);
    }
    return () => {
      if (progressTimer) {
        clearInterval(progressTimer);
      }
    };
  }, [isPlaying, activeIndex, play.interval, play.progress, items.length]);
  // Handle auto-play functionality
  useEffect(() => {
    // Clear any existing interval first
    if (autoPlayIntervalRef.current) {
      clearInterval(autoPlayIntervalRef.current);
      autoPlayIntervalRef.current = undefined;
    }
    // Start auto-play if enabled
    if (isPlaying && items.length > 1) {
      autoPlayIntervalRef.current = setInterval(() => {
        // Simply call the next function which already has looping logic
        handleNextWithLoop();
      }, play.interval);
    }
    // Cleanup function
    return () => {
      if (autoPlayIntervalRef.current) {
        clearInterval(autoPlayIntervalRef.current);
        autoPlayIntervalRef.current = undefined;
      }
    };
  }, [isPlaying, items.length, play.interval, handleNextWithLoop]);
  // Handle initial transition
  useEffect(() => {
    if (!revealedByDefault && !initialTransition) {
      setIsTransitioning(true);
      setInitialTransition(true);
    }
    return () => {
      if (transitionTimeoutRef.current) {
        clearTimeout(transitionTimeoutRef.current);
      }
    };
  }, [revealedByDefault, initialTransition]);
  // Toggle play/pause function
  const togglePlayPause = () => {
    setIsPlaying((prev) => !prev);
  };
  if (items.length === 0) {
    return null;
  }
  return (_jsxs(Column, {
    fillWidth: true,
    fillHeight: fill,
    gap: "12",
    ...rest,
    aspectRatio: undefined,
    style: { isolation: "isolate" },
    children: [
      items.length > 1 && play.controls && play.auto &&
      (_jsx(Flex, {
        position: "absolute",
        top: "16",
        right: "16",
        zIndex: 1,
        children: _jsx(Flex, {
          radius: "m",
          background: "surface",
          children: _jsx(IconButton, {
            onClick: (e) => {
              e.stopPropagation();
              togglePlayPause();
            },
            variant: "secondary",
            icon: isPlaying ? "pause" : "play",
          }),
        }),
      })),
      _jsxs(RevealFx, {
        fillWidth: true,
        fillHeight: fill,
        trigger: isTransitioning,
        translateY: translateY,
        aspectRatio: aspectRatio === "original" ? undefined : aspectRatio,
        speed: 300,
        onTouchStart: (e) => {
          touchStartXRef.current = e.touches[0].clientX;
        },
        onTouchEnd: (e) => {
          if (touchStartXRef.current === null) {
            return;
          }
          const touchEndX = e.changedTouches[0].clientX;
          touchEndXRef.current = touchEndX;
          const diffX = touchStartXRef.current - touchEndX;
          // Detect swipe (more than 50px movement is considered a swipe)
          if (Math.abs(diffX) > 50) {
            if (diffX > 0) {
              handleNextClick();
            } else {
              handlePrevClick();
            }
          }
          touchStartXRef.current = null;
          touchEndXRef.current = null;
        },
        children: [
          typeof items[activeIndex]?.slide === "string"
            ? (_jsx(Media, {
              fill: fill,
              sizes: sizes,
              priority: priority,
              radius: rest.radius || "l",
              border: rest.border || "neutral-alpha-weak",
              overflow: "hidden",
              aspectRatio: fill
                ? undefined
                : aspectRatio === "auto"
                ? undefined
                : aspectRatio,
              src: items[activeIndex]?.slide,
              alt: items[activeIndex]?.alt || "",
            }))
            : (_jsx(Flex, {
              fill: true,
              overflow: "hidden",
              radius: rest.radius || "l",
              border: rest.border || "neutral-alpha-weak",
              aspectRatio: fill
                ? undefined
                : aspectRatio === "auto"
                ? undefined
                : aspectRatio,
              children: items[activeIndex]?.slide,
            })),
          _jsxs(Row, {
            fill: true,
            className: styles.controls,
            radius: rest.radius || "l",
            position: "absolute",
            top: "0",
            left: "0",
            overflow: "hidden",
            horizontal: "between",
            children: [
              activeIndex > 0
                ? (_jsx(Row, {
                  className: styles.left,
                  cursor: "interactive",
                  maxWidth: 12,
                  fill: true,
                  vertical: "center",
                  onClick: handlePrevClick,
                  children: controls && (_jsxs(_Fragment, {
                    children: [
                      _jsx(Fade, {
                        m: { hide: true },
                        transition: "micro-medium",
                        className: styles.fade,
                        position: "absolute",
                        left: "0",
                        top: "0",
                        to: "right",
                        fillHeight: true,
                        maxWidth: 6,
                      }),
                      _jsx(Flex, {
                        m: { hide: true },
                        transition: "micro-medium",
                        className: styles.button,
                        marginLeft: "m",
                        radius: "l",
                        overflow: "hidden",
                        background: "surface",
                        children: _jsx(IconButton, {
                          tabIndex: 0,
                          onClick: handlePrevClick,
                          variant: "secondary",
                          icon: "chevronLeft",
                        }),
                      }),
                    ],
                  })),
                }))
                : (_jsx(Flex, { maxWidth: 12 })),
              activeIndex < items.length - 1
                ? (_jsx(Row, {
                  className: styles.right,
                  cursor: "interactive",
                  maxWidth: 12,
                  fill: true,
                  vertical: "center",
                  horizontal: "end",
                  onClick: handleNextClick,
                  children: controls && (_jsxs(_Fragment, {
                    children: [
                      _jsx(Fade, {
                        m: { hide: true },
                        transition: "micro-medium",
                        className: styles.fade,
                        position: "absolute",
                        right: "0",
                        top: "0",
                        to: "left",
                        fillHeight: true,
                        maxWidth: 6,
                      }),
                      _jsx(Flex, {
                        m: { hide: true },
                        transition: "micro-medium",
                        className: styles.button,
                        marginRight: "m",
                        radius: "l",
                        overflow: "hidden",
                        background: "surface",
                        children: _jsx(IconButton, {
                          tabIndex: 0,
                          onClick: handleNextClick,
                          variant: "secondary",
                          icon: "chevronRight",
                        }),
                      }),
                    ],
                  })),
                }))
                : (_jsx(Flex, { maxWidth: 12 })),
            ],
          }),
          play.progress && (_jsx(Row, {
            fillWidth: true,
            paddingBottom: "12",
            paddingX: "24",
            position: "absolute",
            bottom: "0",
            left: "0",
            zIndex: 1,
            children: _jsx(Row, {
              radius: "full",
              background: "neutral-alpha-weak",
              height: "2",
              fillWidth: true,
              children: _jsx(Row, {
                radius: "full",
                solid: "brand-strong",
                style: {
                  width: `${progressPercent}%`,
                  transition: `width 0.05s linear`,
                },
                fillHeight: true,
              }),
            }),
          })),
        ],
      }),
      items.length > 1 && indicator !== false && (_jsx(_Fragment, {
        children: indicator === "line"
          ? (_jsx(Flex, {
            gap: "4",
            paddingX: "s",
            fillWidth: true,
            horizontal: "center",
            children: items.map((
              _,
              index,
            ) => (_jsx(Flex, {
              radius: "full",
              onClick: () => handleControlClick(index),
              style: {
                background: activeIndex === index
                  ? "var(--neutral-on-background-strong)"
                  : "var(--neutral-alpha-medium)",
                transition: "background 0.3s ease",
              },
              cursor: "interactive",
              fillWidth: true,
              height: "2",
            }, index))),
          }))
          : (_jsx(Scroller, {
            gap: "4",
            onItemClick: handleControlClick,
            children: items.map((item, index) => (_jsx(Flex, {
              style: {
                border: activeIndex === index
                  ? "2px solid var(--brand-solid-strong)"
                  : "2px solid var(--static-transparent)",
              },
              radius: "m-8",
              padding: "4",
              aspectRatio: aspectRatio,
              cursor: "interactive",
              minHeight: thumbnail.height,
              maxHeight: thumbnail.height,
              children: typeof item.slide === "string"
                ? (_jsx(Media, {
                  alt: item.alt || "",
                  aspectRatio: aspectRatio,
                  sizes: thumbnail.sizes,
                  src: item.slide,
                  cursor: "interactive",
                  radius: "m",
                  transition: "macro-medium",
                }))
                : (_jsx(Flex, {
                  aspectRatio: aspectRatio,
                  cursor: "interactive",
                  radius: "m",
                  transition: "macro-medium",
                  overflow: "hidden",
                  fill: true,
                  children: _jsx(Flex, {
                    fill: true,
                    style: { transform: `scale(${thumbnail.scaling})` },
                    children: item.slide,
                  }),
                })),
            }, index))),
          })),
      })),
    ],
  }));
};
Carousel.displayName = "Carousel";
export { Carousel };
//# sourceMappingURL=Carousel.js.map
