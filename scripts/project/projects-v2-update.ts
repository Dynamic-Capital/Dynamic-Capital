import { spawnSync } from "node:child_process";
import { loadCommitPayload, loadReleaseMeta } from "./shared.ts";

interface ProjectFieldOption {
  id: string;
  name: string;
}

interface ProjectField {
  id: string;
  name: string;
  dataType: "TEXT" | "SINGLE_SELECT" | string;
  options?: ProjectFieldOption[];
}

interface ProjectItem {
  id: string;
  title?: string;
  type?: "ISSUE" | "PULL_REQUEST";
  number?: number;
  updatedAt?: string;
}

interface ProjectData {
  id: string;
  title: string;
  fields: ProjectField[];
  items: ProjectItem[];
}

function runGh(args: string[]): string {
  const result = spawnSync("gh", args, { encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error(
      result.stderr || `gh ${args.join(" ")} exited with ${result.status}`,
    );
  }
  return result.stdout.trim();
}

function ghGraphql(query: string, variables: Record<string, unknown>): any {
  const cleanedQuery = query.replace(/\s+/g, " ").trim();
  const args = ["api", "graphql", "-f", `query=${cleanedQuery}`];
  if (Object.keys(variables).length) {
    args.push("-f", `variables=${JSON.stringify(variables)}`);
  }
  const output = runGh(args);
  return JSON.parse(output);
}

function ensureGhAvailable(): boolean {
  try {
    runGh(["--version"]);
    return true;
  } catch (error) {
    console.warn(
      "[projects-v2-update] gh CLI not available; skipping project sync.",
    );
    return false;
  }
}

function resolveProject(
  owner: string,
  number: number,
  ownerType: "organization" | "user",
): ProjectData {
  const query = ownerType === "user"
    ? `query($login: String!, $number: Int!) { user(login: $login) { projectV2(number: $number) { id title fields(first: 50) { nodes { ... on ProjectV2SingleSelectField { id name dataType options { id name } } ... on ProjectV2FieldCommon { id name dataType } } } items(first: 200) { nodes { id title updatedAt content { __typename ... on PullRequest { number } ... on Issue { number } } } } } } }`
    : `query($login: String!, $number: Int!) { organization(login: $login) { projectV2(number: $number) { id title fields(first: 50) { nodes { ... on ProjectV2SingleSelectField { id name dataType options { id name } } ... on ProjectV2FieldCommon { id name dataType } } } items(first: 200) { nodes { id title updatedAt content { __typename ... on PullRequest { number } ... on Issue { number } } } } } } }`;
  const data = ghGraphql(query, { login: owner, number });
  const container = ownerType === "user" ? data.user : data.organization;
  if (!container?.projectV2) {
    throw new Error(
      `Project number ${number} not found for ${ownerType} ${owner}.`,
    );
  }
  const project = container.projectV2;
  const fields: ProjectField[] = (project.fields?.nodes ?? []).map((
    node: any,
  ) => ({
    id: node.id,
    name: node.name,
    dataType: node.dataType,
    options: node.options,
  }));
  const items: ProjectItem[] = (project.items?.nodes ?? []).map((
    node: any,
  ) => ({
    id: node.id,
    title: node.title ?? undefined,
    updatedAt: node.updatedAt ?? undefined,
    type: node.content?.__typename === "PullRequest"
      ? "PULL_REQUEST"
      : node.content?.__typename === "Issue"
      ? "ISSUE"
      : undefined,
    number: node.content?.number,
  }));
  return {
    id: project.id,
    title: project.title,
    fields,
    items,
  };
}

function getProject(owner: string, number: number): ProjectData {
  try {
    return resolveProject(owner, number, "organization");
  } catch (error) {
    return resolveProject(owner, number, "user");
  }
}

function uniqueNumbers(numbers: Array<number | undefined>): number[] {
  const unique = new Set<number>();
  for (const value of numbers) {
    if (typeof value === "number") {
      unique.add(value);
    }
  }
  return Array.from(unique);
}

function fetchContentNodeIds(
  repo: string,
  pullNumbers: number[],
  issueNumbers: number[],
): Map<number, string> {
  if (!repo) {
    return new Map();
  }
  const [owner, name] = repo.split("/");
  const ids = new Map<number, string>();
  if (!pullNumbers.length && !issueNumbers.length) {
    return ids;
  }
  const queries: string[] = [];
  const variables: Record<string, unknown> = { owner, name };
  pullNumbers.forEach((num, index) => {
    const key = `pr${index}`;
    queries.push(`${key}: pullRequest(number: ${num}) { id number }`);
  });
  issueNumbers.forEach((num, index) => {
    const key = `issue${index}`;
    queries.push(`${key}: issue(number: ${num}) { id number }`);
  });
  const query =
    `query($owner: String!, $name: String!) { repository(owner: $owner, name: $name) { ${
      queries.join(" ")
    } } }`;
  const data = ghGraphql(query, variables);
  const repository = data.repository;
  if (repository) {
    Object.values(repository).forEach((node: any) => {
      if (node?.id && typeof node.number === "number") {
        ids.set(node.number, node.id);
      }
    });
  }
  return ids;
}

function ensureProjectItem(
  project: ProjectData,
  projectId: string,
  contentId: string,
  expectedNumber?: number,
): string {
  const existing = project.items.find((item) =>
    typeof expectedNumber === "number" && item.number === expectedNumber
  );
  if (existing) {
    return existing.id;
  }
  const mutation =
    `mutation($projectId: ID!, $contentId: ID!) { addProjectV2ItemById(input: { projectId: $projectId, contentId: $contentId }) { item { id } } }`;
  const data = ghGraphql(mutation, { projectId, contentId });
  const newId = data.addProjectV2ItemById?.item?.id;
  if (!newId) {
    throw new Error("Failed to add project item.");
  }
  project.items.push({ id: newId, number: expectedNumber });
  return newId;
}

function findField(
  project: ProjectData,
  name: string,
): ProjectField | undefined {
  return project.fields.find((field) =>
    field.name.toLowerCase() === name.toLowerCase()
  );
}

function updateSingleSelect(
  projectId: string,
  itemId: string,
  field: ProjectField,
  optionName: string,
): void {
  if (!field.options?.length) return;
  const option = field.options.find((opt) =>
    opt.name.toLowerCase() === optionName.toLowerCase()
  );
  if (!option) return;
  const mutation =
    `mutation($projectId: ID!, $itemId: ID!, $fieldId: ID!, $optionId: String!) { updateProjectV2ItemFieldValue(input: { projectId: $projectId, itemId: $itemId, fieldId: $fieldId, value: { singleSelectOptionId: $optionId } }) { projectV2Item { id } } }`;
  ghGraphql(mutation, {
    projectId,
    itemId,
    fieldId: field.id,
    optionId: option.id,
  });
}

function updateTextField(
  projectId: string,
  itemId: string,
  field: ProjectField,
  text: string,
): void {
  const mutation =
    `mutation($projectId: ID!, $itemId: ID!, $fieldId: ID!, $text: String!) { updateProjectV2ItemFieldValue(input: { projectId: $projectId, itemId: $itemId, fieldId: $fieldId, value: { text: $text } }) { projectV2Item { id } } }`;
  ghGraphql(mutation, { projectId, itemId, fieldId: field.id, text });
}

async function main(): Promise<void> {
  if (!process.env.GH_TOKEN) {
    console.warn(
      "[projects-v2-update] GH_TOKEN missing; skipping project sync.",
    );
    return;
  }
  if (!ensureGhAvailable()) {
    return;
  }
  const projectOwner = process.env.PROJECT_OWNER;
  const projectNumber = process.env.PROJECT_NUMBER
    ? Number.parseInt(process.env.PROJECT_NUMBER, 10)
    : NaN;
  if (!projectOwner || Number.isNaN(projectNumber)) {
    console.warn(
      "[projects-v2-update] PROJECT_OWNER or PROJECT_NUMBER not configured; skipping project sync.",
    );
    return;
  }

  const cwd = process.cwd();
  const payload = loadCommitPayload(cwd);
  const meta = loadReleaseMeta(cwd);
  const repo = process.env.GITHUB_REPOSITORY ?? "";

  const project = getProject(projectOwner, projectNumber);

  const prNumbers = uniqueNumbers(
    payload.commits.map((commit) => commit.prNumber),
  );
  const issueNumbers = uniqueNumbers(
    payload.commits.flatMap((commit) => commit.issues),
  );
  const nodeIds = fetchContentNodeIds(repo, prNumbers, issueNumbers);

  const statusField = findField(
    project,
    process.env.PROJECT_STATUS_FIELD ?? "Status",
  );
  const releaseField = findField(
    project,
    process.env.PROJECT_RELEASE_FIELD ?? "Released in",
  );
  const doneOption = process.env.PROJECT_DONE_OPTION ?? "Done";
  for (const prNumber of prNumbers) {
    const nodeId = nodeIds.get(prNumber);
    if (!nodeId) continue;
    const itemId = ensureProjectItem(project, project.id, nodeId, prNumber);
    if (statusField?.dataType === "SINGLE_SELECT") {
      updateSingleSelect(project.id, itemId, statusField, doneOption);
    }
    if (releaseField) {
      const value = meta?.version ?? "unreleased";
      if (releaseField.dataType === "SINGLE_SELECT") {
        updateSingleSelect(project.id, itemId, releaseField, value);
      } else {
        updateTextField(project.id, itemId, releaseField, value);
      }
    }
  }

  for (const issueNumber of issueNumbers) {
    const nodeId = nodeIds.get(issueNumber);
    if (!nodeId) continue;
    const itemId = ensureProjectItem(project, project.id, nodeId, issueNumber);
    if (statusField?.dataType === "SINGLE_SELECT") {
      updateSingleSelect(project.id, itemId, statusField, doneOption);
    }
    if (releaseField) {
      const value = meta?.version ?? "unreleased";
      if (releaseField.dataType === "SINGLE_SELECT") {
        updateSingleSelect(project.id, itemId, releaseField, value);
      } else {
        updateTextField(project.id, itemId, releaseField, value);
      }
    }
  }

  if (meta?.version) {
    const releaseTitle = `Release ${meta.version}`;
    const existing = project.items.find((item) =>
      item.title?.toLowerCase() === releaseTitle.toLowerCase()
    );
    if (!existing) {
      const noteMutation =
        `mutation($projectId: ID!, $title: String!, $body: String!) { createProjectV2Item(input: { projectId: $projectId, content: { title: $title, body: $body } }) { item { id } } }`;
      const bodyParts: string[] = [];
      if (repo) {
        bodyParts.push(`Repository: https://github.com/${repo}`);
      }
      bodyParts.push(`Release notes: docs/RELEASE_NOTES/${meta.version}.md`);
      ghGraphql(noteMutation, {
        projectId: project.id,
        title: releaseTitle,
        body: bodyParts.join("\n"),
      });
    }
  }
}

main().catch((error) => {
  console.error("[projects-v2-update] Failed to update GitHub project");
  console.error(error);
  process.exitCode = 1;
});
