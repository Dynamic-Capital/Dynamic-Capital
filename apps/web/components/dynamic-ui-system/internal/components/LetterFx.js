"use client";
import { jsx as _jsx } from "react/jsx-runtime";
import { forwardRef, useCallback, useEffect, useRef, useState } from "react";
import classNames from "classnames";
const defaultCharset = [
  "X",
  "$",
  "@",
  "a",
  "H",
  "z",
  "o",
  "0",
  "y",
  "#",
  "?",
  "*",
  "0",
  "1",
  "+",
];
function getRandomCharacter(charset) {
  const randomIndex = Math.floor(Math.random() * charset.length);
  return charset[randomIndex];
}
function createEventHandler(
  originalText,
  setText,
  inProgress,
  setInProgress,
  speed,
  charset,
  setHasAnimated,
) {
  const speedSettings = {
    fast: {
      BASE_DELAY: 10,
      REVEAL_DELAY: 10,
      INITIAL_RANDOM_DURATION: 100,
    },
    medium: {
      BASE_DELAY: 30,
      REVEAL_DELAY: 30,
      INITIAL_RANDOM_DURATION: 300,
    },
    slow: {
      BASE_DELAY: 60,
      REVEAL_DELAY: 60,
      INITIAL_RANDOM_DURATION: 600,
    },
  };
  const { BASE_DELAY, REVEAL_DELAY, INITIAL_RANDOM_DURATION } =
    speedSettings[speed];
  const generateRandomText = () =>
    originalText
      .split("")
      .map((char) => (char === " " ? " " : getRandomCharacter(charset)))
      .join("");
  return async () => {
    if (inProgress) {
      return;
    }
    setInProgress(true);
    let randomizedText = generateRandomText();
    const endTime = Date.now() + INITIAL_RANDOM_DURATION;
    while (Date.now() < endTime) {
      setText(randomizedText);
      await new Promise((resolve) => setTimeout(resolve, BASE_DELAY));
      randomizedText = generateRandomText();
    }
    for (let i = 0; i < originalText.length; i++) {
      await new Promise((resolve) => setTimeout(resolve, REVEAL_DELAY));
      setText(
        `${originalText.substring(0, i + 1)}${randomizedText.substring(i + 1)}`,
      );
    }
    setInProgress(false);
    if (setHasAnimated) {
      setHasAnimated(true);
    }
  };
}
const LetterFx = forwardRef(
  (
    {
      children,
      trigger = "hover",
      speed = "medium",
      charset = defaultCharset,
      onTrigger,
      className,
      style,
    },
    ref,
  ) => {
    const [text, setText] = useState(
      typeof children === "string" ? children : "",
    );
    const [inProgress, setInProgress] = useState(false);
    const [hasAnimated, setHasAnimated] = useState(false);
    const originalText = useRef(typeof children === "string" ? children : "");
    const eventHandler = useCallback(() => {
      createEventHandler(
        originalText.current,
        setText,
        inProgress,
        setInProgress,
        speed,
        charset,
        trigger === "instant" ? setHasAnimated : undefined,
      )();
    }, [inProgress, speed, charset, trigger, setHasAnimated]);
    useEffect(() => {
      if (typeof children === "string") {
        setText(children);
        originalText.current = children;
        if (trigger === "instant" && !hasAnimated) {
          eventHandler();
        }
      }
    }, [children, trigger, eventHandler, hasAnimated]);
    useEffect(() => {
      if (trigger === "custom" && onTrigger) {
        onTrigger(eventHandler);
      }
    }, [trigger, onTrigger, eventHandler]);
    return (_jsx("span", {
      ref: ref,
      className: classNames(className),
      style: style,
      onMouseOver: trigger === "hover" ? eventHandler : undefined,
      children: text,
    }));
  },
);
LetterFx.displayName = "LetterFx";
export { LetterFx };
//# sourceMappingURL=LetterFx.js.map
