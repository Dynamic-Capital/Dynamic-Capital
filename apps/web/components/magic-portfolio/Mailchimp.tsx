"use client";

import { dynamicUI, newsletter } from "@/resources";
import {
  Background,
  Button,
  Column,
  Heading,
  Input,
  Row,
  Text,
} from "@dynamic-ui-system/core";
import { opacity, SpacingToken } from "@dynamic-ui-system/core";
import { useState } from "react";

const {
  formControls: { newsletter: newsletterFormConfig },
  effects: { newsletter: newsletterEffects },
} = dynamicUI;

function debounce<T extends (...args: any[]) => void>(
  func: T,
  delay: number,
): T {
  let timeout: ReturnType<typeof setTimeout>;
  return ((...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), delay);
  }) as T;
}

export const Mailchimp: React.FC<React.ComponentProps<typeof Column>> = (
  { ...flex },
) => {
  const [email, setEmail] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [touched, setTouched] = useState<boolean>(false);

  const validateEmail = (email: string): boolean => {
    if (email === "") {
      return true;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailPattern.test(email);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEmail(value);

    if (!validateEmail(value)) {
      setError("Please enter a valid email address.");
    } else {
      setError("");
    }
  };

  const debouncedHandleChange = debounce(handleChange, 2000);

  const handleBlur = () => {
    setTouched(true);
    if (!validateEmail(email)) {
      setError("Please enter a valid email address.");
    }
  };

  if (newsletter.display === false) return null;

  return (
    <Column
      overflow="hidden"
      fillWidth
      padding="xl"
      radius="l"
      marginBottom="m"
      horizontal="center"
      align="center"
      background="surface"
      border="neutral-alpha-weak"
      {...flex}
    >
      <Background
        top="0"
        position="absolute"
        mask={{
          x: newsletterEffects.mask.x,
          y: newsletterEffects.mask.y,
          radius: newsletterEffects.mask.radius,
          cursor: newsletterEffects.mask.cursor,
        }}
        gradient={{
          display: newsletterEffects.gradient.display,
          opacity: newsletterEffects.gradient.opacity as opacity,
          x: newsletterEffects.gradient.x,
          y: newsletterEffects.gradient.y,
          width: newsletterEffects.gradient.width,
          height: newsletterEffects.gradient.height,
          tilt: newsletterEffects.gradient.tilt,
          colorStart: newsletterEffects.gradient.colorStart,
          colorEnd: newsletterEffects.gradient.colorEnd,
        }}
        dots={{
          display: newsletterEffects.dots.display,
          opacity: newsletterEffects.dots.opacity as opacity,
          size: newsletterEffects.dots.size as SpacingToken,
          color: newsletterEffects.dots.color,
        }}
        grid={{
          display: newsletterEffects.grid.display,
          opacity: newsletterEffects.grid.opacity as opacity,
          color: newsletterEffects.grid.color,
          width: newsletterEffects.grid.width,
          height: newsletterEffects.grid.height,
        }}
        lines={{
          display: newsletterEffects.lines.display,
          opacity: newsletterEffects.lines.opacity as opacity,
          size: newsletterEffects.lines.size as SpacingToken,
          thickness: newsletterEffects.lines.thickness,
          angle: newsletterEffects.lines.angle,
          color: newsletterEffects.lines.color,
        }}
      />
      <Column maxWidth="xs" horizontal="center">
        <Heading marginBottom="s" variant="display-strong-xs">
          {newsletter.title}
        </Heading>
        <Text
          wrap="balance"
          marginBottom="l"
          variant="body-default-l"
          onBackground="neutral-weak"
        >
          {newsletter.description}
        </Text>
      </Column>
      <form
        style={{
          width: "100%",
          display: "flex",
          justifyContent: "center",
        }}
        action={newsletterFormConfig.action}
        method="post"
        id="mc-embedded-subscribe-form"
        name="mc-embedded-subscribe-form"
      >
        <Row
          id="mc_embed_signup_scroll"
          fillWidth
          maxWidth={24}
          s={{ direction: "column" }}
          gap="8"
        >
          <Input
            formNoValidate
            id="mce-EMAIL"
            name="EMAIL"
            type="email"
            placeholder="Email"
            required
            onChange={(e) => {
              if (error) {
                handleChange(e);
              } else {
                debouncedHandleChange(e);
              }
            }}
            onBlur={handleBlur}
            errorMessage={error}
          />
          <div style={{ display: "none" }}>
            <input
              type="checkbox"
              readOnly
              name="group[3492][1]"
              id="mce-group[3492]-3492-0"
              value=""
              checked
            />
          </div>
          <div id="mce-responses" className="clearfalse">
            <div
              className="response"
              id="mce-error-response"
              style={{ display: "none" }}
            >
            </div>
            <div
              className="response"
              id="mce-success-response"
              style={{ display: "none" }}
            >
            </div>
          </div>
          <div
            aria-hidden="true"
            style={{ position: "absolute", left: "-5000px" }}
          >
            <input
              type="text"
              readOnly
              name="b_c1a5a210340eb6c7bff33b2ba_0462d244aa"
              tabIndex={-1}
              value=""
            />
          </div>
          <div className="clear">
            <Row height="48" vertical="center">
              <Button
                id="mc-embedded-subscribe"
                value="Subscribe"
                size="m"
                fillWidth
              >
                Subscribe
              </Button>
            </Row>
          </div>
        </Row>
      </form>
    </Column>
  );
};
