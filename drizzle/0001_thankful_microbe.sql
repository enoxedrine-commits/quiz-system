CREATE TABLE `question_responses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionId` int NOT NULL,
	`questionId` int NOT NULL,
	`groupNumber` enum('1','2') NOT NULL,
	`pointsAwarded` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `question_responses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `quiz_questions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`createdBy` int NOT NULL,
	`questionText` text NOT NULL,
	`answerA` text NOT NULL,
	`answerB` text NOT NULL,
	`answerC` text NOT NULL,
	`answerD` text NOT NULL,
	`correctAnswer` enum('A','B','C','D') NOT NULL,
	`points` int NOT NULL DEFAULT 10,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `quiz_questions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `quiz_session_questions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionId` int NOT NULL,
	`questionId` int NOT NULL,
	`questionOrder` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `quiz_session_questions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `quiz_sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`createdBy` int NOT NULL,
	`groupOneName` varchar(255) NOT NULL,
	`groupTwoName` varchar(255) NOT NULL,
	`status` enum('setup','in_progress','completed') NOT NULL DEFAULT 'setup',
	`currentQuestionIndex` int NOT NULL DEFAULT -1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `quiz_sessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `scores` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionId` int NOT NULL,
	`groupNumber` enum('1','2') NOT NULL,
	`totalPoints` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `scores_id` PRIMARY KEY(`id`)
);
