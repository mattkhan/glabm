import { Argv, CommandModule } from "yargs";
import { db } from "../db";
import { branches } from "../db/schema";
import { getCurrentBranchName, getRemoteOriginURL } from "../lib/git";
import { sql } from "drizzle-orm";

type BranchKey = "issueID" | "mergeRequestID";

type ConfigOptions = {
  branchName: string;
  remoteOriginURL: string;
  key?: BranchKey;
  value?: string;
  unset?: boolean;
};

class Config {
  key?: BranchKey;
  value?: string;
  unset?: boolean;
  branchName: string;
  remoteOriginURL: string;

  constructor({
    key,
    value,
    unset,
    branchName,
    remoteOriginURL,
  }: ConfigOptions) {
    this.key = key;
    this.value = value;
    this.unset = unset;
    this.branchName = branchName;
    this.remoteOriginURL = remoteOriginURL;
  }

  handler() {
    const { key, value, unset } = this;
    if (unset) {
      if (key && !value) {
        return this.unsetKey(key);
      } else {
        console.error("Can't give a value with --unset");
      }

      return;
    }

    if (!key && !value) return this.getAll();
    if (key && !value) return this.get({ key });
    if (key && value) return this.set({ key, value });
  }

  private unsetKey(key: string) {
    const { branchName, remoteOriginURL } = this;

    return db
      .insert(branches)
      .values({
        name: branchName,
        remoteOriginURL,
        [key]: null,
      })
      .onConflictDoUpdate({
        target: [branches.name, branches.remoteOriginURL],
        set: { name: branchName, remoteOriginURL, [key]: null },
      });
  }

  private async getAll() {
    const { branchName, remoteOriginURL } = this;

    const results = await db
      .select()
      .from(branches)
      .where(
        sql`${branches.name} = ${branchName} AND ${branches.remoteOriginURL} = ${remoteOriginURL}`
      );

    const { issueID, mergeRequestID } = results[0] ?? {
      issueID: null,
      mergeRequestID: null,
    };

    console.log(`issue: ${issueID}\nmergeRequest: ${mergeRequestID}`);
  }

  private async get({ key }: Pick<Required<ConfigOptions>, "key">) {
    const { branchName, remoteOriginURL } = this;

    const results = await db
      .select()
      .from(branches)
      .where(
        sql`${branches.name} = ${branchName} AND ${branches.remoteOriginURL} = ${remoteOriginURL}`
      );

    console.log(results[0][key]);
  }

  private set({ key, value }: Pick<Required<ConfigOptions>, "key" | "value">) {
    const { branchName, remoteOriginURL } = this;

    return db
      .insert(branches)
      .values({
        name: branchName,
        remoteOriginURL,
        [key]: value,
      })
      .onConflictDoUpdate({
        target: [branches.name, branches.remoteOriginURL],
        set: { name: branchName, remoteOriginURL, [key]: value },
      });
  }
}

type ConfigCommandOptions = Pick<ConfigOptions, "value" | "unset"> & {
  key?: string;
};

export default class
  implements CommandModule<ConfigCommandOptions, ConfigCommandOptions>
{
  command = "config [key] [value]";
  describe =
    "Set and get repo and branch specific issue and merge request IDs.";

  async handler(options: ConfigCommandOptions) {
    const { key } = options;
    if (key && !["issue", "mergeRequest"].includes(key)) return;

    const branchKey = (() => {
      if (!key) return;
      return key === "issue" ? "issueID" : "mergeRequestID";
    })();

    const [branchName, remoteOriginURL] = await Promise.all([
      getCurrentBranchName(),
      getRemoteOriginURL(),
    ]);

    await new Config({
      ...options,
      key: branchKey,
      branchName,
      remoteOriginURL,
    }).handler();
  }

  builder(yargs: Argv) {
    return yargs
      .positional("key", { type: "string", choices: ["issue", "mergeRequest"] })
      .positional("value", { type: "string" })
      .option("unset", { type: "boolean" });
  }
}
