CREATE TABLE `branches` (
	`id` integer PRIMARY KEY NOT NULL,
	`remote_origin_url` text NOT NULL,
	`name` text NOT NULL,
	`issue_id` text,
	`merge_request_id` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `remote_origin_url_and_name_index` ON `branches` (`name`,`remote_origin_url`);