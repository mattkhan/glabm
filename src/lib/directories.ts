import os from "os";
import path from "path";

export const CONFIG_DIR = path.join(os.homedir(), ".config/glabm");
export const TEMPLATES_DIR = path.join(CONFIG_DIR, "templates");
export const DATABASE_DIR = path.join(os.homedir(), ".local/share/glabm");
