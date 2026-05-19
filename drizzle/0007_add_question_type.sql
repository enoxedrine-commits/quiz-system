ALTER TABLE `quiz_questions` ADD `questionType` enum('multiple_choice','single_answer') NOT NULL DEFAULT 'multiple_choice';
