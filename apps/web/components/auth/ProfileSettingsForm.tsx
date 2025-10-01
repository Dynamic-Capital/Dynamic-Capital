"use client";

import { type ChangeEvent, useEffect, useState } from "react";

import {
  Button,
  Column,
  Heading,
  Input,
  Row,
  Text,
} from "@/components/dynamic-ui-system";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";

interface ProfileFormState {
  firstName: string;
  lastName: string;
  displayName: string;
}

const INITIAL_STATE: ProfileFormState = {
  firstName: "",
  lastName: "",
  displayName: "",
};

export function ProfileSettingsForm() {
  const { user, updateUser } = useAuth();
  const { toast } = useToast();
  const [formState, setFormState] = useState<ProfileFormState>(INITIAL_STATE);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setFormState(INITIAL_STATE);
      return;
    }

    const metadata = user.user_metadata as Record<string, unknown> | undefined;
    setFormState({
      firstName: typeof metadata?.first_name === "string"
        ? metadata.first_name
        : "",
      lastName: typeof metadata?.last_name === "string"
        ? metadata.last_name
        : "",
      displayName: typeof metadata?.display_name === "string"
        ? metadata.display_name
        : "",
    });
  }, [user]);

  const handleChange =
    (key: keyof ProfileFormState) => (event: ChangeEvent<HTMLInputElement>) => {
      setFormState((previous) => ({
        ...previous,
        [key]: event.target.value,
      }));
      setError(null);
    };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const { error: updateError } = await updateUser({
        data: {
          first_name: formState.firstName || null,
          last_name: formState.lastName || null,
          display_name: formState.displayName || null,
        },
      });

      if (updateError) {
        setError(updateError.message);
      } else {
        toast({
          title: "Profile updated",
          description: "Your profile details were saved successfully.",
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Column
      fillWidth
      gap="16"
      background="surface"
      border="neutral-alpha-medium"
      radius="l"
      padding="xl"
      shadow="xl"
    >
      <Column gap="8">
        <Heading variant="heading-strong-s">Profile details</Heading>
        <Text variant="body-default-s" onBackground="neutral-weak">
          Update the name information shared with your Dynamic Capital
          workspaces.
        </Text>
      </Column>
      <form onSubmit={handleSubmit}>
        <Column gap="16">
          <Row gap="12" wrap>
            <Column flex={1} minWidth={12} gap="4">
              <Text variant="body-default-s" onBackground="neutral-weak">
                First name
              </Text>
              <Input
                id="profile-first-name"
                name="profile-first-name"
                value={formState.firstName}
                onChange={handleChange("firstName")}
                placeholder="Jordan"
              />
            </Column>
            <Column flex={1} minWidth={12} gap="4">
              <Text variant="body-default-s" onBackground="neutral-weak">
                Last name
              </Text>
              <Input
                id="profile-last-name"
                name="profile-last-name"
                value={formState.lastName}
                onChange={handleChange("lastName")}
                placeholder="Rivera"
              />
            </Column>
          </Row>
          <Column gap="4">
            <Text variant="body-default-s" onBackground="neutral-weak">
              Display name
            </Text>
            <Input
              id="profile-display-name"
              name="profile-display-name"
              value={formState.displayName}
              onChange={handleChange("displayName")}
              placeholder="Jordan R."
            />
          </Column>
          {error
            ? (
              <Text variant="body-default-s" onBackground="brand-weak">
                {error}
              </Text>
            )
            : null}
          <Button
            type="submit"
            size="m"
            variant="secondary"
            data-border="rounded"
            disabled={isSubmitting}
            loading={isSubmitting}
          >
            {isSubmitting ? "Saving…" : "Save changes"}
          </Button>
        </Column>
      </form>
    </Column>
  );
}

export default ProfileSettingsForm;
