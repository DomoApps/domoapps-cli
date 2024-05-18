export interface manifest {
  id?: string;
  name: string;
  description?: string;
  version: string;
  draft: boolean;
  publicAssetsEnabled: boolean;
  scopes?: string[];
  // deprecated
  mapping?: DataPoint[];
  datasetsMapping?: DataPoint[];
  // deprecated
  collections: Collection[];
  collectionsMapping: Collection[];
  accountsMapping: Account[];
  actionsMapping: Action[];
  workflowsMapping: Workflow[];
  packagesMapping: FunctionPackage[];
  size: any;
  fullpage: boolean;
  //the following are used only with the CLI
  fileName?: string;
  //deprecated
  oAuthEnabled?: boolean;
  //deprecated
  cardId: string;
  //deprecated
  appContextId: string;
  proxyId: string;
  ignore: any;
}

export interface DataPoint {
  dataSetId: string;
  alias: string;
  fields: Fields[];
}
interface Fields {
  alias: string;
  columnName: string;
}

export interface Collection {
  name: string;
  id?: string;
  defaultPermission?: string[];
  requiredAuthorities?: Map<CollectionOperation, Set<String>>;
  schema?: SchemaDefinition;
  filters?: DocumentLevelFilter[];
  syncEnabled?: Boolean;
}

export interface DocumentLevelFilter {
  name: string;
  applyOn: DocumentFilterMethod[];
  applyTo: DocumentFilterCondition[];
  applyToAll: boolean;
  limitToOwner: boolean;
  query: unknown;
  wildcardGroups?: string[];
  maxWildcardGroups?: number;
}

export enum DocumentFilterMethod {
  READ,
  UPDATE,
  DELETE,
}

export interface DocumentFilterCondition {
  type: DocumentFilterEntity;
  values: string[];
}

export enum DocumentFilterEntity {
  USER_ID,
  GROUP_ID,
  GROUP_NAME,
}

export enum CollectionOperation {
  CREATE,
  READ,
  UPDATE,
  DELETE,
  CREATE_CONTENT,
  READ_CONTENT,
  UPDATE_CONTENT,
  DELETE_CONTENT,
}

export interface SchemaDefinition {
  columns: SchemaColumn[];
}

export interface SchemaColumn {
  type: string;
  name: string;
}

export interface Account {
  alias: string;
  accountId?: number;
  dataProviderKey: string;
}

export interface Action {
  alias: string;
  actionId?: string;
  tag: string;
}
export interface Workflow {
  alias: string;
  modelId?: string;
  version?: string;
  startName?: string;
  parameters?: WorkflowParameter[];
}
export interface WorkflowParameter {
  name?: string; // keeping this optional so when a user is on the wiring screen it can be undefined while they map -jkm
  aliasedName: String;
  type: any; //Use ryuu commons instead
  list: boolean;
  children?: WorkflowParameter[];
}

export interface FunctionPackage {
  alias?: string;
  packageId?: string;
  name?: string;
  functionName?: string;
  version?: string;
  parameters: FunctionParameter[];
  output: FunctionParameter;
}
export interface FunctionParameter {
  alias: string;
  name: string;
  type: DataType;
  nullable: boolean;
  isList: boolean;
  children: FunctionParameter[];
}

export enum DataType {
  EMPTY = '',
  ACCOUNT = 'ACCOUNT',
  BOOLEAN = 'boolean',
  DATASET = 'dataset',
  DATE = 'date',
  DATETIME = 'dateTime',
  DECIMAL = 'decimal',
  DURATION = 'duration',
  GROUP = 'group',
  JSON = 'json',
  LIST = 'list',
  NUMBER = 'number',
  OBJECT = 'object',
  PERSON = 'person',
  /** @deprecated */
  STRING_BUILDER = 'STRING',
  TEXT = 'text',
  TIME = 'time',
}
