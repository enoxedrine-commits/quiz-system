CREATE TABLE `app_settings` (
	`settingKey` varchar(100) NOT NULL,
	`settingValue` varchar(255) NOT NULL,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `app_settings_settingKey` PRIMARY KEY(`settingKey`)
);
