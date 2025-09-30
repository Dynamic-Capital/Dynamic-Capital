export const CHECKBOX_PATTERN = /^\s*-\s*\[(?<state>[ xX])\]\s*(?<text>.*)$/;

function createSection(title) {
  return {
    title,
    items: [],
    subsections: [],
  };
}

function createSubsection(title) {
  return {
    title,
    items: [],
  };
}

function normalizeItemText(parts) {
  if (parts.length === 0) {
    return "";
  }

  const [first, ...rest] = parts;
  let result = first.trim();

  rest.forEach((part) => {
    const trimmed = part.trim();
    if (trimmed === "") {
      return;
    }

    if (/^-/u.test(trimmed)) {
      result += `\n   ${trimmed}`;
    } else {
      result += ` ${trimmed}`;
    }
  });

  return result.trim();
}

function commitItem(state) {
  const { currentItem, currentSection, currentSubsection } = state;
  if (!currentItem) {
    return;
  }

  const target = currentSubsection ?? currentSection;
  if (!target) {
    throw new Error("Encountered checklist item without an active section.");
  }

  const text = normalizeItemText(currentItem.parts);
  if (text.length === 0) {
    state.currentItem = null;
    return;
  }

  target.items.push({
    status: currentItem.status,
    text,
  });
  state.currentItem = null;
}

function pushSection(state) {
  const { currentSection, sections } = state;
  if (!currentSection) {
    return;
  }

  sections.push(currentSection);
  state.currentSection = null;
  state.currentSubsection = null;
}

export function parseHierarchicalChecklist(content) {
  const lines = content.split(/\r?\n/);

  const state = {
    sections: [],
    currentSection: null,
    currentSubsection: null,
    currentItem: null,
  };

  lines.forEach((rawLine) => {
    const line = rawLine.trimEnd();

    const sectionMatch = line.match(/^##\s+(?<title>.+)$/);
    if (sectionMatch) {
      commitItem(state);
      pushSection(state);
      state.currentSection = createSection(sectionMatch.groups.title.trim());
      return;
    }

    const subsectionMatch = line.match(/^###\s+(?<title>.+)$/);
    if (subsectionMatch) {
      if (!state.currentSection) {
        throw new Error(
          `Encountered subsection "${subsectionMatch.groups.title.trim()}" before any section heading.`,
        );
      }

      commitItem(state);
      state.currentSubsection = createSubsection(
        subsectionMatch.groups.title.trim(),
      );
      state.currentSection.subsections.push(state.currentSubsection);
      return;
    }

    const checkboxMatch = line.match(CHECKBOX_PATTERN);
    if (checkboxMatch) {
      if (!state.currentSection) {
        throw new Error(
          `Encountered checklist item "${checkboxMatch.groups.text.trim()}" before any section heading.`,
        );
      }

      commitItem(state);
      state.currentItem = {
        status: checkboxMatch.groups.state.toLowerCase() === "x"
          ? "complete"
          : "open",
        parts: [checkboxMatch.groups.text.trim()],
      };
      return;
    }

    if (state.currentItem && line.trim() !== "") {
      state.currentItem.parts.push(line.trim());
    }
  });

  commitItem(state);
  pushSection(state);

  return state.sections;
}

export function summarizeItems(items) {
  const total = items.length;
  const complete = items.filter((item) => item.status === "complete").length;
  return {
    total,
    complete,
    pending: total - complete,
  };
}

export function summarizeSection(section) {
  const subsectionItems = section.subsections.flatMap((subsection) =>
    subsection.items
  );
  return summarizeItems([...section.items, ...subsectionItems]);
}

export function summarizeSections(sections) {
  return sections.reduce((accumulator, section) => {
    const summary = summarizeSection(section);
    accumulator.total += summary.total;
    accumulator.complete += summary.complete;
    accumulator.pending += summary.pending;
    return accumulator;
  }, { total: 0, complete: 0, pending: 0 });
}

export function formatStatusLabel(status) {
  return status === "complete" ? "DONE" : "OPEN";
}

export function hasItems(section) {
  return section.items.length > 0 ||
    section.subsections.some((subsection) => subsection.items.length > 0);
}
