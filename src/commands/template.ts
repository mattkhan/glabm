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

type TemplateOptions = {
  template: HandlebarsTemplateDelegate;
  branchName: string;
  remoteOriginURL: string;
  issue?: string;
  mergeRequest?: string;
};

class Template {
  template: HandlebarsTemplateDelegate;
  branchName: string;
  remoteOriginURL: string;
  issue?: string;
  mergeRequest?: string;

  constructor({
    template,
    branchName,
    remoteOriginURL,
    issue,
    mergeRequest,
  }: TemplateOptions) {
    this.template = template;
    this.branchName = branchName;
    this.remoteOriginURL = remoteOriginURL;
    this.issue = issue;
    this.mergeRequest = mergeRequest;
  }

  async handler() {
    const input = await this.projectQueryInput();
    if (!input?.mergeRequestID) return;
    const data = await this.data({ ...input, fullPath: this.fullPath });
    if (!data) return;

    console.log(
      this.template({
        issue: data.issue,
        mergeRequest: data.mergeRequest,
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

  private async data({
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
> & { name: string };
export default class
  implements CommandModule<TemplateCommandOptions, TemplateCommandOptions>
{
  command = "template <name>";
  describe =
    "Prints out a template defined in ~/.config/glabm/templates/<name>.hbs";

  async handler({ name, mergeRequest, issue }: TemplateCommandOptions) {
    const [_, branchName, remoteOriginURL] = await Promise.all([
      registerPartials(),
      getCurrentBranchName(),
      getRemoteOriginURL(),
    ]);

    new Template({
      template: compile(name),
      mergeRequest,
      issue,
      branchName,
      remoteOriginURL,
    }).handler();
  }

  builder(yargs: Argv) {
    return yargs
      .positional("name", { type: "string", demandOption: true })
      .options({
        issue: { type: "string" },
        mergeRequest: { type: "string" },
      });
  }
}
