CREATE TABLE `question_banks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`createdBy` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `question_banks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `quiz_questions` ADD `bankId` int;