"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef, useState } from "react";
import { Row, Text } from ".";
const CountFx = (
  {
    value,
    speed = 1000,
    easing = "ease-out",
    format,
    separator,
    effect = "simple",
    children,
    ...text
  },
) => {
  const [displayValue, setDisplayValue] = useState(value);
  const [animationProgress, setAnimationProgress] = useState(1);
  const animationRef = useRef(undefined);
  const previousValueRef = useRef(value);
  // Default format function with separator support
  const defaultFormat = (val) => {
    if (separator) {
      return val.toString().replace(/\B(?=(\d{3})+(?!\d))/g, separator);
    }
    return val.toString();
  };
  const formatValue = format || defaultFormat;
  // Easing functions
  const getEasing = (progress) => {
    switch (easing) {
      case "linear":
        return progress;
      case "ease-out":
        return 1 - Math.pow(1 - progress, 3);
      case "ease-in-out":
        return progress < 0.5
          ? 2 * progress * progress
          : 1 - Math.pow(-2 * progress + 2, 2) / 2;
      default:
        return 1 - Math.pow(1 - progress, 3);
    }
  };
  // Wheel animation: create digit wheels
  const renderWheelDigits = (currentValue, targetValue) => {
    const currentStr = currentValue.toString().padStart(
      targetValue.toString().length,
      "0",
    );
    const targetStr = targetValue.toString();
    const maxLength = Math.max(currentStr.length, targetStr.length);
    return Array.from({ length: maxLength }, (_, index) => {
      const currentDigit = parseInt(currentStr[maxLength - 1 - index] || "0");
      const targetDigit = parseInt(targetStr[maxLength - 1 - index] || "0");
      // Calculate progress for this specific digit
      const digitDifference = targetDigit - currentDigit;
      const digitProgress = Math.abs(digitDifference) > 0
        ? Math.min(Math.abs(digitDifference) / 10, 1)
        : 1; // Progress based on how close to target
      // Create wheel effect for this digit
      const wheelDigits = [];
      for (let i = 0; i <= 9; i++) {
        const isActive = i === currentDigit;
        // Calculate transition speed based on progress (slower as it approaches target)
        const transitionDuration = 0.1 + digitProgress * 0.2; // 0.1s to 0.3s
        // Calculate position for wheel effect
        let position = 0;
        if (isActive) {
          position = 0; // Current digit is centered
        } else if (i < currentDigit) {
          position = -100; // Digits below current are above
        } else {
          position = 100; // Digits above current are below
        }
        wheelDigits.push(
          _jsx(Row, {
            center: true,
            position: "absolute",
            top: "0",
            left: "0",
            right: "0",
            bottom: "0",
            style: {
              height: "1em",
              width: "100%",
              transform: `translateY(${position * 2}%)`,
              transition: `all ${transitionDuration}s ease-out`,
              pointerEvents: "none",
            },
            children: i,
          }, i),
        );
      }
      return (_jsx(Row, {
        align: "center",
        overflow: "hidden",
        inline: true,
        style: {
          height: "1em",
          width: "0.8em",
          marginLeft: "-0.125em",
          marginRight: "-0.125em",
          position: "relative",
          isolation: "isolate",
        },
        children: wheelDigits,
      }, index));
    }).reverse();
  };
  // Smooth animation: animate each digit independently from start to target
  const renderSmoothDigits = (startValue, targetValue, progress) => {
    const startStr = startValue.toString().padStart(
      targetValue.toString().length,
      "0",
    );
    const targetStr = targetValue.toString();
    const maxLength = Math.max(startStr.length, targetStr.length);
    return Array.from({ length: maxLength }, (_, index) => {
      const startDigit = parseInt(startStr[maxLength - 1 - index] || "0");
      const targetDigit = parseInt(targetStr[maxLength - 1 - index] || "0");
      // Calculate the shortest path between digits (handles wrapping around 0-9)
      let digitDifference = targetDigit - startDigit;
      if (Math.abs(digitDifference) > 5) {
        // Take the shorter path around the wheel
        digitDifference = digitDifference > 0
          ? digitDifference - 10
          : digitDifference + 10;
      }
      // Calculate the current digit position based on progress
      const currentDigitPosition = startDigit + digitDifference * progress;
      // Create wheel effect for this digit
      const wheelDigits = [];
      for (let i = 0; i <= 9; i++) {
        // Calculate the position of each digit in the wheel
        let position = 0;
        // Calculate the relative position of this digit to the current position
        let relativePosition = i - currentDigitPosition;
        // Handle wrapping around the wheel
        if (relativePosition > 5) {
          relativePosition -= 10;
        }
        if (relativePosition < -5) {
          relativePosition += 10;
        }
        // Convert to percentage position
        position = relativePosition * 200; // 200% for full wheel height
        const opacity = Math.max(0, 1 - Math.abs(relativePosition) * 2);
        wheelDigits.push(
          _jsx(Row, {
            center: true,
            position: "absolute",
            top: "0",
            left: "0",
            right: "0",
            bottom: "0",
            pointerEvents: "none",
            fillWidth: true,
            style: {
              height: "1em",
              transform: `translateY(${position}%)`,
              transition: "none",
              opacity: opacity,
            },
            children: i,
          }, i),
        );
      }
      return (_jsx(Row, {
        style: {
          height: "1em",
          marginLeft: "-0.125em",
          marginRight: "-0.125em",
        },
        children: _jsx(Row, {
          align: "center",
          inline: true,
          overflow: "hidden",
          style: {
            opacity: 1,
            height: "2em",
            width: "0.8em",
            isolation: "isolate",
          },
          children: wheelDigits,
        }),
      }, index));
    }).reverse();
  };
  useEffect(() => {
    if (value === previousValueRef.current) {
      return;
    }
    const startValue = previousValueRef.current;
    const endValue = value;
    const difference = endValue - startValue;
    let startTime;
    const animate = (timestamp) => {
      if (!startTime) {
        startTime = timestamp;
      }
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / speed, 1);
      const easedProgress = getEasing(progress);
      if (effect === "wheel") {
        // For wheel animation, we animate each digit independently
        const currentValue = Math.floor(
          startValue + difference * easedProgress,
        );
        setDisplayValue(currentValue);
      } else if (effect === "smooth") {
        // For smooth animation, we track progress and animate digits independently
        setAnimationProgress(easedProgress);
        const currentValue = Math.floor(
          startValue + difference * easedProgress,
        );
        setDisplayValue(currentValue);
      } else {
        // Simple animation
        const currentValue = startValue + difference * easedProgress;
        const currentStepValue = Math.floor(currentValue);
        setDisplayValue(currentStepValue);
      }
      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setDisplayValue(endValue);
        setAnimationProgress(1);
        previousValueRef.current = endValue;
      }
    };
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [value, speed, easing, effect]);
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);
  if (effect === "wheel") {
    return (_jsxs(Text, {
      ...text,
      style: {
        display: "flex",
        alignItems: "center",
        gap: "0.1em",
        ...text.style,
      },
      children: [renderWheelDigits(displayValue, value), children],
    }));
  }
  if (effect === "smooth") {
    return (_jsxs(Text, {
      ...text,
      style: {
        display: "flex",
        alignItems: "center",
        gap: "0.1em",
        ...text.style,
      },
      children: [
        renderSmoothDigits(previousValueRef.current, value, animationProgress),
        children,
      ],
    }));
  }
  return (_jsxs(Text, {
    ...text,
    children: [formatValue(displayValue), children],
  }));
};
CountFx.displayName = "CountFx";
export { CountFx };
//# sourceMappingURL=CountFx.js.map
