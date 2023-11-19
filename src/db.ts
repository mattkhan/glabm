import fs from "fs";
import path from "path";
import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { DATABASE_DIR } from "./lib/directories";

fs.mkdirSync(DATABASE_DIR, { recursive: true });
export const sqlite = new Database(path.join(DATABASE_DIR, "sqlite.db"), {
  fileMustExist: false,
});

export const db = drizzle(sqlite);
