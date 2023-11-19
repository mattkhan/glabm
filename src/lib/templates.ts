import fs from "fs";
import path from "path";
import { glob } from "glob";
import handlebars from "handlebars";
import { TEMPLATES_DIR } from "./directories";

export async function registerPartials(): Promise<void> {
  const pattern = path.join(TEMPLATES_DIR, "**/*.partial.hbs");
  const files = await glob(pattern);

  for (let filePath of files) {
    const fileName = path.basename(filePath, ".partial.hbs");
    const fileContent = fs.readFileSync(filePath, "utf-8");
    handlebars.registerPartial(fileName, fileContent);
  }
}

export function compile(name: string) {
  const filePath = path.join(TEMPLATES_DIR, `${name}.hbs`);
  const fileContent = fs.readFileSync(filePath, "utf-8");

  return handlebars.compile(fileContent);
}
