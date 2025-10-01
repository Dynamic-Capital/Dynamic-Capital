export interface PrefixDefinition {
  readonly code: string;
  readonly name: string;
  readonly description: string;
}

export interface FunctionDefinition {
  readonly code: string;
  readonly name: string;
  readonly description: string;
}

export interface ScopeDefinition {
  readonly code: string;
  readonly name: string;
  readonly description: string;
}

export interface NamingConfig {
  readonly prefixes?: readonly PrefixDefinition[];
  readonly functions?: readonly FunctionDefinition[];
  readonly scopes?: readonly ScopeDefinition[];
}

export interface NamingRequest {
  readonly prefix: string;
  readonly func: string;
  readonly scopes?: readonly string[];
  readonly metaphor?: string | readonly string[];
}

export interface NamingSegments {
  readonly prefix: PrefixDefinition;
  readonly func: FunctionDefinition;
  readonly scopes: readonly ScopeDefinition[];
  readonly metaphor?: string;
}

export interface NamingResult extends NamingSegments {
  readonly code: string;
  readonly label: string;
}

const DEFAULT_PREFIXES: readonly PrefixDefinition[] = [
  {
    code: "DC",
    name: "Dynamic Capital",
    description: "Dynamic Capital core protocol and shared libraries.",
  },
  {
    code: "AGI",
    name: "Intelligence Oracle",
    description:
      "Analytical, forecasting, or inference services powered by the AGI Oracle.",
  },
  {
    code: "TT",
    name: "Telegram & TON integration",
    description:
      "Bots, bridges, and onboarding flows tied to Telegram or TON services.",
  },
  {
    code: "DCT",
    name: "Token layer",
    description:
      "Tokenomics, mint/burn logic, treasury automations, and supply telemetry.",
  },
] as const;

const DEFAULT_FUNCTIONS: readonly FunctionDefinition[] = [
  {
    code: "CM",
    name: "Core Module",
    description: "Foundational orchestration or service logic.",
  },
  {
    code: "TK",
    name: "Token",
    description: "Fungible or non-fungible token artifacts.",
  },
  {
    code: "OR",
    name: "Oracle",
    description: "Data feeds, inference engines, and pricing oracles.",
  },
  {
    code: "SG",
    name: "Signal",
    description: "Alerting, strategy signals, or telemetry dispatchers.",
  },
  {
    code: "GV",
    name: "Governance",
    description: "Voting, policy, or treasury oversight modules.",
  },
  {
    code: "ON",
    name: "Onboarding",
    description: "User activation and setup flows.",
  },
  {
    code: "VR",
    name: "Verification",
    description: "Identity, compliance, or proof-of-humanity logic.",
  },
  {
    code: "PR",
    name: "Pricing",
    description: "Market data valuation and pricing strategies.",
  },
  {
    code: "BL",
    name: "Burn Logic",
    description: "Supply contraction mechanics and retirement events.",
  },
] as const;

const DEFAULT_SCOPES: readonly ScopeDefinition[] = [
  {
    code: "FE",
    name: "Frontend",
    description: "Interfaces, dashboards, or mini-app UI packages.",
  },
  {
    code: "SC",
    name: "Smart Contract",
    description: "On-chain programs, jettons, and treasury logic.",
  },
  {
    code: "API",
    name: "API Layer",
    description: "REST, GraphQL, or webhook surfaces.",
  },
  {
    code: "DB",
    name: "Database",
    description:
      "Schema, migrations, analytical warehouses, or Supabase projects.",
  },
  {
    code: "CFG",
    name: "Config",
    description: "Shared configuration, manifests, or infrastructure settings.",
  },
] as const;

type SegmentMap<T extends { readonly code: string }> = Map<string, T>;

type SegmentKind = "prefix" | "function" | "scope";

function buildSegmentMap<T extends { readonly code: string }>(
  values: readonly T[] | undefined,
): SegmentMap<T> {
  const map = new Map<string, T>();
  if (!values) {
    return map;
  }
  for (const value of values) {
    const key = value.code.trim().toUpperCase();
    if (!key) {
      throw new Error("segment codes cannot be empty");
    }
    if (map.has(key)) {
      throw new Error(`duplicate segment code detected: ${key}`);
    }
    map.set(key, { ...value, code: key });
  }
  return map;
}

function normaliseSegment(value: string, kind: SegmentKind): string {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error(`${kind} code cannot be empty`);
  }
  return trimmed.toUpperCase();
}

function formatMetaphor(
  input: string | readonly string[] | undefined,
): string | undefined {
  if (!input || (Array.isArray(input) && input.length === 0)) {
    return undefined;
  }

  const segments = Array.isArray(input) ? input : [input];
  const formatted = segments
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0)
    .map((segment) =>
      segment.replace(/\s+/g, "-").replace(/[^A-Za-z0-9-]/g, "")
    );

  if (formatted.length === 0) {
    return undefined;
  }

  return formatted.map((segment) => segment.toUpperCase()).join("-");
}

function titleCase(label: string): string {
  return label
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export class DynamicNamingEngine {
  private readonly prefixes: SegmentMap<PrefixDefinition>;
  private readonly functions: SegmentMap<FunctionDefinition>;
  private readonly scopes: SegmentMap<ScopeDefinition>;

  constructor(config: NamingConfig = {}) {
    this.prefixes = buildSegmentMap(config.prefixes ?? DEFAULT_PREFIXES);
    this.functions = buildSegmentMap(config.functions ?? DEFAULT_FUNCTIONS);
    this.scopes = buildSegmentMap(config.scopes ?? DEFAULT_SCOPES);
  }

  listPrefixes(): readonly PrefixDefinition[] {
    return Array.from(this.prefixes.values());
  }

  listFunctions(): readonly FunctionDefinition[] {
    return Array.from(this.functions.values());
  }

  listScopes(): readonly ScopeDefinition[] {
    return Array.from(this.scopes.values());
  }

  generate(request: NamingRequest): NamingResult {
    const prefixCode = normaliseSegment(request.prefix, "prefix");
    const funcCode = normaliseSegment(request.func, "function");
    const prefix = this.prefixes.get(prefixCode);
    const func = this.functions.get(funcCode);

    if (!prefix) {
      throw new Error(`unknown prefix: ${prefixCode}`);
    }
    if (!func) {
      throw new Error(`unknown function: ${funcCode}`);
    }

    const scopes = (request.scopes ?? []).map((scopeCode, index) => {
      const normalised = normaliseSegment(scopeCode, "scope");
      const scope = this.scopes.get(normalised);
      if (!scope) {
        throw new Error(`unknown scope at index ${index}: ${normalised}`);
      }
      return scope;
    });

    const metaphor = formatMetaphor(request.metaphor);
    const code = this.composeCode(
      prefix.code,
      func.code,
      scopes.map((scope) => scope.code),
      metaphor,
    );
    const label = this.composeLabel(prefix, func, scopes, metaphor);

    return { code, label, prefix, func, scopes, metaphor };
  }

  parse(code: string): NamingResult {
    const segments = code.split("-").map((segment) => segment.trim()).filter(
      Boolean,
    );
    if (segments.length < 2) {
      throw new Error(
        "a valid code requires at least a prefix and function segment",
      );
    }

    const [prefixCode, funcCode, ...rest] = segments;
    const prefix = this.prefixes.get(prefixCode.toUpperCase());
    const func = this.functions.get(funcCode.toUpperCase());

    if (!prefix) {
      throw new Error(`unknown prefix: ${prefixCode}`);
    }
    if (!func) {
      throw new Error(`unknown function: ${funcCode}`);
    }

    const scopes: ScopeDefinition[] = [];
    const metaphorSegments: string[] = [];

    for (const segment of rest) {
      const scope = this.scopes.get(segment.toUpperCase());
      if (scope) {
        scopes.push(scope);
      } else {
        metaphorSegments.push(segment.toUpperCase());
      }
    }

    const metaphor = metaphorSegments.length > 0
      ? metaphorSegments.join("-")
      : undefined;
    const label = this.composeLabel(prefix, func, scopes, metaphor);

    return {
      code: this.composeCode(
        prefix.code,
        func.code,
        scopes.map((scope) => scope.code),
        metaphor,
      ),
      label,
      prefix,
      func,
      scopes,
      metaphor,
    };
  }

  private composeCode(
    prefix: string,
    func: string,
    scopes: readonly string[],
    metaphor: string | undefined,
  ): string {
    const segments = [prefix, func, ...scopes];
    if (metaphor) {
      segments.push(metaphor);
    }
    return segments.join("-");
  }

  private composeLabel(
    prefix: PrefixDefinition,
    func: FunctionDefinition,
    scopes: readonly ScopeDefinition[],
    metaphor: string | undefined,
  ): string {
    const parts = [prefix.name, func.name];
    for (const scope of scopes) {
      parts.push(scope.name);
    }
    if (metaphor) {
      parts.push(titleCase(metaphor.replace(/-/g, " ")));
    }
    return parts.join(" ");
  }
}

export const defaultDynamicNamingEngine = new DynamicNamingEngine();
