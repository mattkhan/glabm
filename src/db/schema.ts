import {
  sqliteTable,
  text,
  integer,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const branches = sqliteTable(
  "branches",
  {
    id: integer("id").primaryKey(),
    remoteOriginURL: text("remote_origin_url").notNull(),
    name: text("name").notNull(),
    issueID: text("issue_id"),
    mergeRequestID: text("merge_request_id"),
  },
  (branches) => ({
    remote_origin_path_and_name_index: uniqueIndex(
      "remote_origin_url_and_name_index"
    ).on(branches.name, branches.remoteOriginURL),
  })
);
