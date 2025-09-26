export interface ColumnReference {
  schema?: string;
  table: string;
  column: string;
  onDelete?:
    | "NO ACTION"
    | "RESTRICT"
    | "CASCADE"
    | "SET NULL"
    | "SET DEFAULT";
  onUpdate?:
    | "NO ACTION"
    | "RESTRICT"
    | "CASCADE"
    | "SET NULL"
    | "SET DEFAULT";
}

export interface ColumnDefinition {
  name: string;
  type: string;
  nullable?: boolean;
  default?: string;
  identity?: "always" | "by default";
  generatedExpression?: string;
  unique?: boolean;
  check?: string;
  references?: ColumnReference;
  comment?: string;
}

export interface PrimaryKeyDefinition {
  name?: string;
  columns: string[];
}

export interface CheckConstraint {
  name: string;
  expression: string;
}

export interface IndexDefinition {
  name: string;
  expression: string;
  method?: string;
  unique?: boolean;
  predicate?: string;
  concurrently?: boolean;
}

export interface RowLevelSecurityConfig {
  enable: boolean;
  force?: boolean;
}

export interface PolicyDefinition {
  name: string;
  command?: "ALL" | "SELECT" | "INSERT" | "UPDATE" | "DELETE";
  roles?: string[];
  using?: string;
  withCheck?: string;
  comment?: string;
}

export interface TableDefinition {
  schema?: string;
  name: string;
  comment?: string;
  columns: ColumnDefinition[];
  primaryKey?: PrimaryKeyDefinition;
  checks?: CheckConstraint[];
  indexes?: IndexDefinition[];
  rowLevelSecurity?: RowLevelSecurityConfig;
  policies?: PolicyDefinition[];
  postDeploymentSql?: string[];
}

export interface StorageBucketDefinition {
  name: string;
  public?: boolean;
  fileSizeLimit?: number;
  allowedMimeTypes?: string[];
  avifAutodetection?: boolean;
  comment?: string;
}

export interface StoragePolicyDefinition {
  name: string;
  bucket: string;
  command?: "ALL" | "SELECT" | "INSERT" | "UPDATE" | "DELETE";
  roles?: string[];
  using?: string;
  withCheck?: string;
  comment?: string;
}

export interface StoragePlan {
  enableRowLevelSecurity?: boolean;
  forceRowLevelSecurity?: boolean;
}

export interface RawSqlStatement {
  name?: string;
  statement: string;
}

export interface ResourcePlan {
  tables?: TableDefinition[];
  storageBuckets?: StorageBucketDefinition[];
  storagePolicies?: StoragePolicyDefinition[];
  storage?: StoragePlan;
  sql?: RawSqlStatement[];
}
