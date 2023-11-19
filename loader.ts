import { readFileSync } from "fs";
import {
  buildClientSchema,
  IntrospectionEnumType,
  IntrospectionType,
} from "graphql";

/**
 * Make all properties in T writeable, recursively.
 */
type WriteableR<T> = {
  -readonly [k in keyof T]: T[k] extends object ? WriteableR<T[k]> : T[k];
};

export default (schemaString: string, _config: any) => {
  const schemaJSON = JSON.parse(readFileSync(schemaString, "utf8")).data;

  const { types } = schemaJSON["__schema"];

  const enums = types.filter(
    (t: IntrospectionType) => t.kind === "ENUM"
  ) as Array<WriteableR<IntrospectionEnumType>>;

  for (let t of enums) {
    if (!t.enumValues) continue;

    t.enumValues = t.enumValues.filter(({ isDeprecated }) => !isDeprecated);
  }

  return buildClientSchema(schemaJSON);
};
