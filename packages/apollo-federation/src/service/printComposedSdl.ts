import {
  GraphQLSchema,
  isSpecifiedDirective,
  isIntrospectionType,
  isSpecifiedScalarType,
  GraphQLNamedType,
  GraphQLDirective,
  isScalarType,
  isObjectType,
  isInterfaceType,
  isUnionType,
  isEnumType,
  isInputObjectType,
  GraphQLScalarType,
  GraphQLObjectType,
  GraphQLInterfaceType,
  GraphQLUnionType,
  GraphQLEnumType,
  GraphQLInputObjectType,
  GraphQLArgument,
  GraphQLInputField,
  astFromValue,
  print,
  GraphQLField,
  GraphQLEnumValue,
  GraphQLString,
  DEFAULT_DEPRECATION_REASON,
  FieldDefinitionNode,
  ASTNode,
} from 'graphql';
import { Maybe, ServiceDefinition } from '../composition';
import { isFederationType } from '../types';
import { isFederationDirective } from '../composition/utils';

type Options = {
  /**
   * Descriptions are defined as preceding string literals, however an older
   * experimental version of the SDL supported preceding comments as
   * descriptions. Set to true to enable this deprecated behavior.
   * This option is provided to ease adoption and will be removed in v16.
   *
   * Default: false
   */
  commentDescriptions?: boolean;
};

/**
 * Accepts options as a second argument:
 *
 *    - commentDescriptions:
 *        Provide true to use preceding comments as the description.
 *
 */
export function printComposedSdl(
  schema: GraphQLSchema,
  serviceList: ServiceDefinition[],
  options?: Options,
): string {
  return printFilteredSchema(
    schema,
    // Federation change: we need service and url information for the @graph directives
    serviceList,
    // Federation change: treat the directives defined by the federation spec
    // similarly to the directives defined by the GraphQL spec (ie, don't print
    // their definitions).
    (n) => !isSpecifiedDirective(n) && !isFederationDirective(n),
    isDefinedType,
    options,
  );
}

export function printIntrospectionSchema(
  schema: GraphQLSchema,
  options?: Options,
): string {
  return printFilteredSchema(
    schema,
    [],
    isSpecifiedDirective,
    isIntrospectionType,
    options,
  );
}

// Federation change: treat the types defined by the federation spec
// similarly to the directives defined by the GraphQL spec (ie, don't print
// their definitions).
function isDefinedType(type: GraphQLNamedType): boolean {
  return (
    !isSpecifiedScalarType(type) &&
    !isIntrospectionType(type) &&
    !isFederationType(type)
  );
}

function printFilteredSchema(
  schema: GraphQLSchema,
  // Federation change: we need service and url information for the @graph directives
  serviceList: ServiceDefinition[],
  directiveFilter: (type: GraphQLDirective) => boolean,
  typeFilter: (type: GraphQLNamedType) => boolean,
  options?: Options,
): string {
  const directives = schema.getDirectives().filter(directiveFilter);
  const types = Object.values(schema.getTypeMap()).filter(typeFilter);

  return (
    [printSchemaDefinition(schema, serviceList)]
      .concat(
        directives.map((directive) => printDirective(directive, options)),
        types.map((type) => printType(type, options)),
      )
      .filter(Boolean)
      .join('\n\n') + '\n'
  );
}

function printSchemaDefinition(
  schema: GraphQLSchema,
  serviceList: ServiceDefinition[],
): string | undefined {
  const operationTypes = [];

  const queryType = schema.getQueryType();
  if (queryType) {
    operationTypes.push(`  query: ${queryType.name}`);
  }

  const mutationType = schema.getMutationType();
  if (mutationType) {
    operationTypes.push(`  mutation: ${mutationType.name}`);
  }

  const subscriptionType = schema.getSubscriptionType();
  if (subscriptionType) {
    operationTypes.push(`  subscription: ${subscriptionType.name}`);
  }

  return (
    // Federation change: graphql@14 doesn't support schema descriptions
    // printDescription({}, schema) +
    'schema' +
    printGraphDirectives(serviceList) +
    printComposedGraphDirective() +
    `\n{\n${operationTypes.join('\n')}\n}`
  );
}

function printGraphDirectives(serviceList: ServiceDefinition[]) {
  return serviceList.map(service => `\n  @graph(name: "${service.name}", url: "${service.url}")`).join("")
}

function printComposedGraphDirective() {
  return `\n  @composedGraph(version: 1)`;
}

export function printType(type: GraphQLNamedType, options?: Options): string {
  if (isScalarType(type)) {
    return printScalar(type, options);
  }
  if (isObjectType(type)) {
    return printObject(type, options);
  }
  if (isInterfaceType(type)) {
    return printInterface(type, options);
  }
  if (isUnionType(type)) {
    return printUnion(type, options);
  }
  if (isEnumType(type)) {
    return printEnum(type, options);
  }
  // istanbul ignore else (See: 'https://github.com/graphql/graphql-js/issues/2618')
  if (isInputObjectType(type)) {
    return printInputObject(type, options);
  }

  throw Error('Unexpected type: ' + (type as GraphQLNamedType).toString());
}

function printScalar(type: GraphQLScalarType, options?: Options): string {
  return (
    printDescription(options, type) +
    `scalar ${type.name}` +
    printSpecifiedByUrl(type)
  );
}

function printImplementedInterfaces(
  type: GraphQLObjectType
  // Federation change: interfaces implementing interfaces isn't supported in
  // graphql@^14. This change follows the former implementation as it was in `graphql@14.7.0`
  // | GraphQLInterfaceType,
): string {
  const interfaces = type.getInterfaces();
  return interfaces.length
    ? ' implements ' + interfaces.map((i) => i.name).join(' & ')
    : '';
}

function printObject(type: GraphQLObjectType, options?: Options): string {
  // Federation change: print `extend` keyword on type extensions.
  //
  // The implementation assumes that an owned type will have fields defined
  // since that is required for a valid schema. Types that are *only*
  // extensions will not have fields on the astNode since that ast doesn't
  // exist.
  //
  // XXX revist extension checking
  const isExtension =
    type.extensionASTNodes && type.astNode && !type.astNode.fields;

  return (
    printDescription(options, type) +
    (isExtension ? 'extend ' : '') +
    `type ${type.name}` +
    printImplementedInterfaces(type) +
    // Federation addition for printing @owner and @key usages
    printEntityDirectives(type) +
    printFields(options, type)
  );
}

// Federation change: print usages of the @owner and @key directives.
function printEntityDirectives(type: GraphQLObjectType): string {
  const metadata = type.extensions?.federation;
  if (!metadata) return '';

  const { serviceName, keys } = metadata;
  if (!keys) return '';

  return `\n  @owner(graph: "${serviceName}")` + keys[serviceName].map(
    (key: FieldDefinitionNode[]) => `\n  @key(fields: "${key.map(print)}", graph: "${serviceName}")`,
  ).join("");
}

function printInterface(type: GraphQLInterfaceType, options?: Options): string {
  // Federation change: print `extend` keyword on type extensions.
  // See printObject for assumptions made.
  //
  // XXX revist extension checking
  const isExtension =
    type.extensionASTNodes && type.astNode && !type.astNode.fields;

  return (
    printDescription(options, type) +
    (isExtension ? 'extend ' : '') +
    `interface ${type.name}` +
    // Federation change: graphql@14 doesn't support interfaces implementing interfaces
    // printImplementedInterfaces(type) +
    printFields(options, type)
  );
}

function printUnion(type: GraphQLUnionType, options?: Options): string {
  const types = type.getTypes();
  const possibleTypes = types.length ? ' = ' + types.join(' | ') : '';
  return printDescription(options, type) + 'union ' + type.name + possibleTypes;
}

function printEnum(type: GraphQLEnumType, options?: Options): string {
  const values = type
    .getValues()
    .map(
      (value, i) =>
        printDescription(options, value, '  ', !i) +
        '  ' +
        value.name +
        printDeprecated(value),
    );

  return (
    printDescription(options, type) + `enum ${type.name}` + printBlock(values)
  );
}

function printInputObject(
  type: GraphQLInputObjectType,
  options?: Options,
): string {
  const fields = Object.values(type.getFields()).map(
    (f, i) =>
      printDescription(options, f, '  ', !i) + '  ' + printInputValue(f),
  );
  return (
    printDescription(options, type) + `input ${type.name}` + printBlock(fields)
  );
}

function printFields(
  options: Options | undefined,
  type: GraphQLObjectType | GraphQLInterfaceType,
) {

  const fields = Object.values(type.getFields()).map(
    (f, i) =>
      printDescription(options, f, '  ', !i) +
      '  ' +
      f.name +
      printArgs(options, f.args, '  ') +
      ': ' +
      String(f.type) +
      printDeprecated(f) +
      printFederationFieldDirectives(f, type),
  );

  // Federation change: for entities, we want to print the block on a new line.
  // This is just a formatting nice-to-have.
  const isEntity = Boolean(type.extensions?.federation?.keys);

  return printBlock(fields, isEntity);
}

export function printWithReducedWhitespace(ast: ASTNode): string {
  return print(ast)
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Federation change: print @resolve, @requires, and @provides directives
 *
 * @param field
 * @param parentType
 */
function printFederationFieldDirectives(
  field: GraphQLField<any, any>,
  parentType: GraphQLObjectType | GraphQLInterfaceType,
): string {
  if (!field.extensions?.federation) return '';

  const {
    serviceName,
    requires = [],
    provides = [],
  } = field.extensions.federation;

  let printed = '';
  // If a `serviceName` exists, we only want to print a `@resolve` directive
  // if the `serviceName` differs from the `parentType`'s `serviceName`
  if (
    serviceName &&
    serviceName !== parentType.extensions?.federation?.serviceName
  ) {
    printed += ` @resolve(graph: "${serviceName}")`;
  }

  if (requires.length > 0) {
    printed += ` @requires(fields: "${requires.map(printWithReducedWhitespace).join(' ')}")`;
  }

  if (provides.length > 0) {
    printed += ` @provides(fields: "${provides.map(printWithReducedWhitespace).join(' ')}")`;
  }

  return printed;
}

// Federation change: `onNewLine` is a formatting nice-to-have for printing
// types that have a list of directives attached, i.e. an entity.
function printBlock(items: string[], onNewLine?: boolean) {
  return items.length !== 0
    ? onNewLine
      ? '\n{\n' + items.join('\n') + '\n}'
      : ' {\n' + items.join('\n') + '\n}'
    : '';
}

function printArgs(
  options: Options | undefined,
  args: GraphQLArgument[],
  indentation = '',
) {
  if (args.length === 0) {
    return '';
  }

  // If every arg does not have a description, print them on one line.
  if (args.every((arg) => !arg.description)) {
    return '(' + args.map(printInputValue).join(', ') + ')';
  }

  return (
    '(\n' +
    args
      .map(
        (arg, i) =>
          printDescription(options, arg, '  ' + indentation, !i) +
          '  ' +
          indentation +
          printInputValue(arg),
      )
      .join('\n') +
    '\n' +
    indentation +
    ')'
  );
}

function printInputValue(arg: GraphQLInputField) {
  const defaultAST = astFromValue(arg.defaultValue, arg.type);
  let argDecl = arg.name + ': ' + String(arg.type);
  if (defaultAST) {
    argDecl += ` = ${print(defaultAST)}`;
  }
  return argDecl;
}

function printDirective(directive: GraphQLDirective, options?: Options) {
  return (
    printDescription(options, directive) +
    'directive @' +
    directive.name +
    printArgs(options, directive.args) +
    (directive.isRepeatable ? ' repeatable' : '') +
    ' on ' +
    directive.locations.join(' | ')
  );
}

function printDeprecated(
  fieldOrEnumVal: GraphQLField<any, any> | GraphQLEnumValue,
) {
  if (!fieldOrEnumVal.isDeprecated) {
    return '';
  }
  const reason = fieldOrEnumVal.deprecationReason;
  const reasonAST = astFromValue(reason, GraphQLString);
  if (reasonAST && reason !== DEFAULT_DEPRECATION_REASON) {
    return ' @deprecated(reason: ' + print(reasonAST) + ')';
  }
  return ' @deprecated';
}

function printSpecifiedByUrl(scalar: GraphQLScalarType) {
  // Federation change: `scalar.specifiedByUrl` isn't supported in graphql@^14.
  // This change merely works around TypeScript for now until we move to v15.
  if ((scalar as any).specifiedByUrl == null) {
    return '';
  }
  const url = (scalar as any).specifiedByUrl;

  // if (scalar.specifiedByUrl == null) {
  //   return '';
  // }
  // const url = scalar.specifiedByUrl;
  const urlAST = astFromValue(url, GraphQLString);

  if (!urlAST) {
    throw new Error(
      'Unexpected null value returned from `astFromValue` for specifiedByUrl',
    );
  }

  return ' @specifiedBy(url: ' + print(urlAST) + ')';
}

function printDescription<T extends { description?: Maybe<string> }>(
  options: Options | undefined,
  def: T,
  indentation = '',
  firstInBlock = true,
): string {
  const { description } = def;
  if (description == null) {
    return '';
  }

  if (options?.commentDescriptions === true) {
    return printDescriptionWithComments(description, indentation, firstInBlock);
  }

  const preferMultipleLines = description.length > 70;
  const blockString = printBlockString(description, '', preferMultipleLines);
  const prefix =
    indentation && !firstInBlock ? '\n' + indentation : indentation;

  return prefix + blockString.replace(/\n/g, '\n' + indentation) + '\n';
}

function printDescriptionWithComments(
  description: string,
  indentation: string,
  firstInBlock: boolean,
) {
  const prefix = indentation && !firstInBlock ? '\n' : '';
  const comment = description
    .split('\n')
    .map((line) => indentation + (line !== '' ? '# ' + line : '#'))
    .join('\n');

  return prefix + comment + '\n';
}

/**
 * Print a block string in the indented block form by adding a leading and
 * trailing blank line. However, if a block string starts with whitespace and is
 * a single-line, adding a leading blank line would strip that whitespace.
 *
 * @internal
 */
export function printBlockString(
  value: string,
  indentation: string = '',
  preferMultipleLines: boolean = false,
): string {
  const isSingleLine = value.indexOf('\n') === -1;
  const hasLeadingSpace = value[0] === ' ' || value[0] === '\t';
  const hasTrailingQuote = value[value.length - 1] === '"';
  const hasTrailingSlash = value[value.length - 1] === '\\';
  const printAsMultipleLines =
    !isSingleLine ||
    hasTrailingQuote ||
    hasTrailingSlash ||
    preferMultipleLines;

  let result = '';
  // Format a multi-line block quote to account for leading space.
  if (printAsMultipleLines && !(isSingleLine && hasLeadingSpace)) {
    result += '\n' + indentation;
  }
  result += indentation ? value.replace(/\n/g, '\n' + indentation) : value;
  if (printAsMultipleLines) {
    result += '\n';
  }

  return '"""' + result.replace(/"""/g, '\\"""') + '"""';
}
