export type AccessContext = Readonly<Record<string, unknown>>;

const EMPTY_CONTEXT: AccessContext = Object.freeze({});
const EMPTY_STRING_ARRAY: readonly string[] = Object.freeze([]);

function normalizeText(value: unknown, fieldName: string): string {
  const text = typeof value === "string" ? value : String(value ?? "");
  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error(`${fieldName} must not be empty`);
  }
  return trimmed;
}

function normalizeOptionalText(value: unknown): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }
  const text = String(value).trim();
  return text || undefined;
}

function normalizeStringArray(
  values: Iterable<string> | undefined,
  fieldName: string,
): readonly string[] {
  if (!values) {
    return EMPTY_STRING_ARRAY;
  }
  const unique = new Set<string>();
  for (const value of values) {
    const normalised = normalizeText(value, fieldName);
    unique.add(normalised);
  }
  return Object.freeze(Array.from(unique));
}

function normalizeTags(tags: Iterable<string> | undefined): readonly string[] {
  if (!tags) {
    return EMPTY_STRING_ARRAY;
  }
  const unique = new Set<string>();
  for (const tag of tags) {
    const cleaned = tag.trim().toLowerCase();
    if (cleaned) {
      unique.add(cleaned);
    }
  }
  return Object.freeze(Array.from(unique));
}

function freezeContext(
  context: Record<string, unknown> | undefined,
): AccessContext {
  if (!context || Object.keys(context).length === 0) {
    return EMPTY_CONTEXT;
  }
  return Object.freeze({ ...context });
}

function resolveContextValue(
  context: AccessContext,
  key: string,
): unknown {
  if (Object.prototype.hasOwnProperty.call(context, key)) {
    return context[key];
  }
  if (!key.includes(".")) {
    return context[key];
  }
  const parts = key.split(".");
  let current: unknown = context;
  for (const part of parts) {
    if (
      typeof current === "object" &&
      current !== null &&
      Object.prototype.hasOwnProperty.call(
        current as Record<string, unknown>,
        part,
      )
    ) {
      current = (current as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }
  return current;
}

export const AccessEffect = {
  ALLOW: "allow",
  DENY: "deny",
} as const;

export type AccessEffect = typeof AccessEffect[keyof typeof AccessEffect];

export const ConditionOperator = {
  EQUAL: "eq",
  NOT_EQUAL: "neq",
  CONTAINS: "contains",
  NOT_CONTAINS: "not_contains",
  GREATER_THAN: "gt",
  GREATER_THAN_OR_EQUAL: "gte",
  LESS_THAN: "lt",
  LESS_THAN_OR_EQUAL: "lte",
  IN: "in",
  NOT_IN: "not_in",
  EXISTS: "exists",
  NOT_EXISTS: "not_exists",
} as const;

export type ConditionOperator =
  typeof ConditionOperator[keyof typeof ConditionOperator];

export interface AccessConditionInit {
  readonly attribute: string;
  readonly operator: ConditionOperator;
  readonly value?: unknown;
  readonly caseInsensitive?: boolean;
}

export class AccessCondition {
  public readonly attribute: string;
  public readonly operator: ConditionOperator;
  public readonly value?: unknown;
  public readonly caseInsensitive: boolean;

  constructor(init: AccessConditionInit) {
    this.attribute = normalizeText(init.attribute, "attribute");
    this.operator = init.operator;
    this.caseInsensitive = Boolean(init.caseInsensitive);
    if (
      this.operator === ConditionOperator.EXISTS ||
      this.operator === ConditionOperator.NOT_EXISTS
    ) {
      this.value = undefined;
    } else {
      this.value = init.value;
    }
  }

  evaluate(context: AccessContext): boolean {
    const operand = resolveContextValue(context, this.attribute);

    if (this.operator === ConditionOperator.EXISTS) {
      return operand !== undefined && operand !== null;
    }
    if (this.operator === ConditionOperator.NOT_EXISTS) {
      return operand === undefined || operand === null;
    }

    if (operand === undefined || operand === null) {
      return false;
    }

    let expected = this.value;

    if (
      typeof operand === "string" &&
      typeof expected === "string" &&
      this.caseInsensitive
    ) {
      return this.compareStringsCaseInsensitive(operand, expected);
    }

    switch (this.operator) {
      case ConditionOperator.EQUAL:
        return operand === expected;
      case ConditionOperator.NOT_EQUAL:
        return operand !== expected;
      case ConditionOperator.CONTAINS:
        return this.contains(operand, expected);
      case ConditionOperator.NOT_CONTAINS:
        return !this.contains(operand, expected);
      case ConditionOperator.GREATER_THAN:
        return (operand as number) > (expected as number);
      case ConditionOperator.GREATER_THAN_OR_EQUAL:
        return (operand as number) >= (expected as number);
      case ConditionOperator.LESS_THAN:
        return (operand as number) < (expected as number);
      case ConditionOperator.LESS_THAN_OR_EQUAL:
        return (operand as number) <= (expected as number);
      case ConditionOperator.IN:
        return this.isInCollection(operand, expected);
      case ConditionOperator.NOT_IN:
        return !this.isInCollection(operand, expected);
      default:
        return false;
    }
  }

  private compareStringsCaseInsensitive(
    operand: string,
    expected: string,
  ): boolean {
    return operand.localeCompare(expected, undefined, {
      sensitivity: "accent",
    }) === 0;
  }

  private contains(operand: unknown, expected: unknown): boolean {
    if (expected === undefined || expected === null) {
      return false;
    }
    if (typeof operand === "string" && typeof expected === "string") {
      return operand.includes(expected);
    }
    if (Array.isArray(operand)) {
      return operand.includes(expected);
    }
    if (operand instanceof Set) {
      return operand.has(expected);
    }
    return false;
  }

  private isInCollection(operand: unknown, expected: unknown): boolean {
    if (expected === undefined || expected === null) {
      return false;
    }
    if (Array.isArray(expected)) {
      return expected.includes(operand);
    }
    if (expected instanceof Set) {
      return expected.has(operand);
    }
    return operand === expected;
  }
}

export interface RoleInit {
  readonly name: string;
  readonly description?: string;
  readonly tags?: Iterable<string>;
  readonly attributes?: Record<string, unknown>;
}

export class Role {
  public readonly name: string;
  public readonly description: string;
  public readonly tags: readonly string[];
  public readonly attributes: AccessContext;

  constructor(init: RoleInit) {
    this.name = normalizeText(init.name, "name");
    this.description = normalizeOptionalText(init.description) ?? "";
    this.tags = normalizeTags(init.tags);
    this.attributes = freezeContext(init.attributes);
  }
}

export interface AccessRuleInit {
  readonly name: string;
  readonly effect: AccessEffect;
  readonly actions?: Iterable<string>;
  readonly resources?: Iterable<string>;
  readonly roles?: Iterable<string>;
  readonly conditions?: Iterable<AccessCondition | AccessConditionInit>;
  readonly priority?: number;
  readonly metadata?: Record<string, unknown>;
}

export class AccessRule {
  public readonly name: string;
  public readonly effect: AccessEffect;
  public readonly actions: readonly string[];
  public readonly resources: readonly string[];
  public readonly roles: readonly string[];
  public readonly conditions: readonly AccessCondition[];
  public readonly priority: number;
  public readonly metadata: AccessContext;

  constructor(init: AccessRuleInit) {
    this.name = normalizeText(init.name, "name");
    this.effect = init.effect;
    this.actions = normalizeStringArray(init.actions, "action");
    this.resources = normalizeStringArray(init.resources, "resource");
    this.roles = normalizeStringArray(init.roles, "role");
    const conditions = init.conditions
      ? Array.from(
        init.conditions,
        (condition) =>
          condition instanceof AccessCondition
            ? condition
            : new AccessCondition(condition),
      )
      : [];
    this.conditions = Object.freeze(conditions);
    this.priority = init.priority ?? 0;
    this.metadata = freezeContext(init.metadata);
  }

  matches(
    request: AccessRequest,
    subjectRoles: readonly string[],
    context: AccessContext,
  ): boolean {
    if (this.actions.length > 0 && !this.actions.includes(request.action)) {
      return false;
    }
    if (
      this.resources.length > 0 &&
      !this.resources.includes(request.resource)
    ) {
      return false;
    }
    if (
      this.roles.length > 0 &&
      !this.roles.some((role) => subjectRoles.includes(role))
    ) {
      return false;
    }
    return this.conditions.every((condition) => condition.evaluate(context));
  }
}

export interface AccessRequestInit {
  readonly subjectId: string;
  readonly action: string;
  readonly resource: string;
  readonly context?: Record<string, unknown>;
}

export class AccessRequest {
  public readonly subjectId: string;
  public readonly action: string;
  public readonly resource: string;
  public readonly context: AccessContext;

  constructor(init: AccessRequestInit) {
    this.subjectId = normalizeText(init.subjectId, "subjectId");
    this.action = normalizeText(init.action, "action");
    this.resource = normalizeText(init.resource, "resource");
    this.context = freezeContext(init.context);
  }
}

export interface AccessDecisionInit {
  readonly allowed: boolean;
  readonly rule?: AccessRule;
  readonly reason?: string;
  readonly context?: Record<string, unknown> & {
    readonly roles?: readonly string[];
  };
}

export interface DecisionContext extends AccessContext {
  readonly roles: readonly string[];
}

export class AccessDecision {
  public readonly allowed: boolean;
  public readonly rule?: AccessRule;
  public readonly reason: string;
  public readonly context: DecisionContext;

  constructor(init: AccessDecisionInit) {
    this.allowed = init.allowed;
    this.rule = init.rule;
    this.reason = normalizeOptionalText(init.reason) ?? "";
    const baseContext: Record<string, unknown> = init.context
      ? { ...init.context }
      : {};
    const roles = init.context?.roles ?? EMPTY_STRING_ARRAY;
    baseContext.roles = Object.freeze([...roles]);
    this.context = Object.freeze(baseContext) as DecisionContext;
  }
}

export class DynamicAccessControl {
  private readonly roles = new Map<string, Role>();
  private readonly rules: AccessRule[] = [];
  private readonly subjectRoles = new Map<string, Set<string>>();
  private readonly subjectContext = new Map<string, AccessContext>();

  registerRole(role: Role): void {
    this.roles.set(role.name, role);
  }

  registerRoles(roles: Iterable<Role>): void {
    for (const role of roles) {
      this.registerRole(role);
    }
  }

  assignRole(subjectId: string, roleName: string): void {
    const subject = normalizeText(subjectId, "subjectId");
    const role = normalizeText(roleName, "roleName");
    if (!this.roles.has(role)) {
      throw new Error(`role '${role}' is not registered`);
    }
    const assigned = this.subjectRoles.get(subject);
    if (assigned) {
      assigned.add(role);
    } else {
      this.subjectRoles.set(subject, new Set([role]));
    }
  }

  revokeRole(subjectId: string, roleName: string): void {
    const subject = normalizeText(subjectId, "subjectId");
    const role = normalizeText(roleName, "roleName");
    const assigned = this.subjectRoles.get(subject);
    if (!assigned) {
      return;
    }
    assigned.delete(role);
    if (assigned.size === 0) {
      this.subjectRoles.delete(subject);
    }
  }

  setSubjectContext(
    subjectId: string,
    context: Record<string, unknown>,
  ): void {
    const subject = normalizeText(subjectId, "subjectId");
    this.subjectContext.set(subject, freezeContext(context));
  }

  addRule(rule: AccessRule): void {
    this.rules.push(rule);
    this.rules.sort((a, b) => b.priority - a.priority);
  }

  extendRules(rules: Iterable<AccessRule>): void {
    for (const rule of rules) {
      this.rules.push(rule);
    }
    this.rules.sort((a, b) => b.priority - a.priority);
  }

  evaluate(request: AccessRequest): AccessDecision {
    const subjectRoles = this.subjectRoles.get(request.subjectId);
    const subjectRolesList = subjectRoles
      ? Object.freeze(Array.from(subjectRoles))
      : EMPTY_STRING_ARRAY;

    const roleAttributes: Record<string, unknown> = {};
    for (const roleName of subjectRolesList) {
      const role = this.roles.get(roleName);
      if (role && role.attributes !== EMPTY_CONTEXT) {
        roleAttributes[roleName] = role.attributes;
      }
    }

    const combined: Record<string, unknown> = {};
    const storedContext = this.subjectContext.get(request.subjectId);
    if (storedContext && storedContext !== EMPTY_CONTEXT) {
      Object.assign(combined, storedContext);
    }
    if (request.context !== EMPTY_CONTEXT) {
      Object.assign(combined, request.context);
    }
    if (Object.keys(roleAttributes).length > 0) {
      combined.roles = Object.freeze({ ...roleAttributes });
    }
    const combinedContext = freezeContext(combined);

    for (const rule of this.rules) {
      if (!rule.matches(request, subjectRolesList, combinedContext)) {
        continue;
      }
      if (rule.effect === AccessEffect.DENY) {
        return new AccessDecision({
          allowed: false,
          rule,
          reason: `Denied by rule '${rule.name}'`,
          context: { roles: subjectRolesList },
        });
      }
      return new AccessDecision({
        allowed: true,
        rule,
        reason: `Allowed by rule '${rule.name}'`,
        context: { roles: subjectRolesList },
      });
    }

    return new AccessDecision({
      allowed: false,
      reason: "No matching rule",
      context: { roles: subjectRolesList },
    });
  }

  describeSubject(subjectId: string): Readonly<{
    roles: readonly string[];
    context: AccessContext;
  }> {
    const subject = normalizeText(subjectId, "subjectId");
    const roles = this.subjectRoles.get(subject);
    const sortedRoles = roles ? Array.from(roles).sort() : [];
    return Object.freeze({
      roles: Object.freeze(sortedRoles),
      context: this.subjectContext.get(subject) ?? EMPTY_CONTEXT,
    });
  }

  exportRules(): readonly AccessRule[] {
    return Object.freeze([...this.rules]);
  }

  exportRoles(): readonly Role[] {
    return Object.freeze(Array.from(this.roles.values()));
  }
}
