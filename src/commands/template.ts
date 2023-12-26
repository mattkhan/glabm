import { CommandModule, Argv } from "yargs";
import client from "../lib/apollo";
import { ProjectDocument, ProjectQueryVariables } from "../graphql/graphql";
import {
  getCurrentBranchName,
  getRemoteOriginURL,
  pathFromRemoteURL,
} from "../lib/git";
import { compile, registerPartials } from "../lib/templates";
import { branches } from "../db/schema";
import { db } from "../db";
import { sql } from "drizzle-orm";
import { promises } from "fs";
import { TEMPLATES_DIR } from "../lib/directories";
import path from "path";

type TemplateOptions = {
  template: HandlebarsTemplateDelegate;
  branchName: string;
  remoteOriginURL: string;
  issue?: string;
  mergeRequest?: string;
  data?: Record<string, any>;
};

class Template {
  template: HandlebarsTemplateDelegate;
  branchName: string;
  remoteOriginURL: string;
  issue?: string;
  mergeRequest?: string;
  data?: Record<string, any>;

  constructor({
    template,
    branchName,
    remoteOriginURL,
    issue,
    mergeRequest,
    data,
  }: TemplateOptions) {
    this.template = template;
    this.branchName = branchName;
    this.remoteOriginURL = remoteOriginURL;
    this.issue = issue;
    this.mergeRequest = mergeRequest;
    this.data = data;
  }

  async handler() {
    const input = await this.projectQueryInput();
    if (!input?.mergeRequestID) return;
    const data = await this.projectData({ ...input, fullPath: this.fullPath });
    if (!data) return;

    console.log(
      this.template({
        issue: data.issue,
        mergeRequest: data.mergeRequest,
        ...this.data,
      })
    );
  }

  private async projectQueryInput() {
    const { issue, mergeRequest, branchName, remoteOriginURL } = this;

    const results = await db
      .select()
      .from(branches)
      .where(
        sql`${branches.name} = ${branchName} AND ${branches.remoteOriginURL} = ${remoteOriginURL}`
      );

    const issueID = issue ?? results[0]?.issueID ?? undefined;
    const mergeRequestID =
      mergeRequest ?? results[0]?.mergeRequestID ?? undefined;

    if (!mergeRequestID) {
      console.error("A valid merge request ID is required.");
      return;
    }

    return {
      issueID,
      mergeRequestID,
      includeIssue: !!issueID,
    };
  }

  private get fullPath() {
    return pathFromRemoteURL(this.remoteOriginURL);
  }

  private async projectData({
    issueID,
    mergeRequestID,
    fullPath,
    includeIssue,
  }: ProjectQueryVariables) {
    const result = await client.query({
      query: ProjectDocument,
      variables: {
        fullPath,
        issueID,
        mergeRequestID,
        includeIssue,
      },
    });

    if (!result.data.project) return;
    if (!result.data.project.mergeRequest?.webUrl) return;

    return {
      issue: result.data.project.issue,
      mergeRequest: result.data.project.mergeRequest,
    };
  }
}

type TemplateCommandOptions = Pick<
  TemplateOptions,
  "issue" | "mergeRequest"
> & { name: string; data?: string; dataFile?: string };
export default class
  implements CommandModule<TemplateCommandOptions, TemplateCommandOptions>
{
  command = "template <name>";
  describe =
    "Prints out a template defined in ~/.config/glabm/templates/<name>.hbs";

  handler = async ({
    name,
    mergeRequest,
    issue,
    data,
    dataFile,
  }: TemplateCommandOptions) => {
    const [_, branchName, remoteOriginURL, jsonData] = await Promise.all([
      registerPartials(),
      getCurrentBranchName(),
      getRemoteOriginURL(),
      dataFile &&
        dataFile !== "" &&
        promises.readFile(path.join(TEMPLATES_DIR, dataFile), {
          encoding: "utf-8",
        }),
    ]);

    new Template({
      template: compile(name),
      mergeRequest,
      issue,
      branchName,
      remoteOriginURL,
      data: this.deserializeData(jsonData || data),
    }).handler();
  };

  builder(yargs: Argv) {
    return yargs
      .positional("name", { type: "string", demandOption: true })
      .positional("data", {
        type: "string",
        description:
          'JSON of values to pass to templates in the format { "variables": { "key": "value" } }.',
        conflicts: "dataFile",
      })
      .positional("dataFile", {
        type: "string",
        description:
          'Relative path to file under ~/.config/glabm/templates/ containing JSON of values to pass to templates in the format { "variables": { "key": "value" } }.',
        conflicts: "data",
      })
      .options({
        issue: { type: "string" },
        mergeRequest: { type: "string" },
      });
  }

  private deserializeData(data?: string): Record<string, any> | undefined {
    if (!data) return undefined;
    const parsed = JSON.parse(data);
    if (typeof parsed["variables"] !== "object") return undefined;

    return parsed["variables"] ?? undefined;
  }
}
