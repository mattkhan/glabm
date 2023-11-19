import { CodegenConfig } from "@graphql-codegen/cli";

const config: CodegenConfig = {
  schema: [{ "./schema.json": { loader: "./build/loader.js" } }],
  documents: ["./src/queries/*.graphql"],
  generates: { "./src/graphql/": { preset: "client" } },
};

export default config;
