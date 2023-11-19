import fs from "fs";
import path from "path";
import { CONFIG_DIR } from "./directories";

export function getToken() {
  const filePath = path.join(CONFIG_DIR, "token.txt");
  const token = fs.readFileSync(filePath, "utf-8").trim();
  return token;
}
