ALTER TABLE `projects` ADD `budget_minutes` integer;--> statement-breakpoint
CREATE TABLE `absences` (
	`id` text PRIMARY KEY NOT NULL,
	`person_id` text NOT NULL,
	`day` text NOT NULL,
	`kind` text NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`actor` text NOT NULL,
	`created` integer NOT NULL
);--> statement-breakpoint
CREATE UNIQUE INDEX `absence_person_day` ON `absences` (`person_id`,`day`);--> statement-breakpoint
CREATE TABLE `period_closes` (
	`id` text PRIMARY KEY NOT NULL,
	`person_id` text NOT NULL,
	`period_start` text NOT NULL,
	`period` text NOT NULL,
	`status` text NOT NULL,
	`reason` text DEFAULT '' NOT NULL,
	`actor` text NOT NULL,
	`updated` integer NOT NULL
);--> statement-breakpoint
CREATE UNIQUE INDEX `period_close_key` ON `period_closes` (`person_id`,`period`,`period_start`);--> statement-breakpoint
CREATE TABLE `disputes` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`person_id` text NOT NULL,
	`reason` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`resolution` text DEFAULT '' NOT NULL,
	`actor` text,
	`created` integer NOT NULL,
	`resolved` integer
);--> statement-breakpoint
CREATE INDEX `dispute_status` ON `disputes` (`status`,`created`);