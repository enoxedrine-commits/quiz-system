# Quiz System TODO

## Database & Backend
- [x] Create database schema (questions, groups, quiz_sessions, scores)
- [x] Implement tRPC procedures for question CRUD operations
- [x] Implement tRPC procedures for group setup and quiz initialization
- [x] Implement tRPC procedures for quiz state management (start, next, end)
- [x] Implement tRPC procedures for score updates and scoreboard queries

## Design System
- [x] Create Memphis-inspired color palette (peach bg, mint, lilac, yellow, black accents)
- [x] Define global typography (bold, uppercase, sans-serif)
- [x] Create geometric primitive SVG components (circles, triangles, rectangles, dots, diamonds)
- [x] Update index.css with Memphis theme and custom utilities

## Admin Panel
- [x] Build question list view with edit/delete actions
- [x] Build question creation form (question text, 4 answers, correct answer, points)
- [x] Build question edit form
- [x] Build question deletion with confirmation

## Group Setup & Quiz Initialization
- [x] Build group name input form (two groups required before starting)
- [x] Build quiz initialization screen
- [x] Implement validation (both group names must be filled)
- [x] Create quiz session in database on start

## Live Public Display Screen
- [x] Build question display component with large typography
- [x] Build countdown timer (configurable duration, visual feedback)
- [x] Build answer reveal animation (highlight correct answer)
- [x] Build scoreboard display (real-time group scores)
- [x] Implement real-time updates via polling

## Host Control Panel
- [x] Build host dashboard with quiz controls (start, next, end)
- [x] Build manual point assignment UI (select winning group, assign points)
- [x] Build quiz progress indicator
- [x] Build quiz end screen with final scores

## Integration & Testing
- [ ] Connect admin panel to backend procedures
- [ ] Connect public display to real-time quiz state
- [ ] Connect host control to quiz state updates
- [ ] Test full quiz workflow (setup -> questions -> scoring -> end)
- [ ] Write vitest tests for critical procedures

## Polish & Deployment
- [ ] Add loading states and error handling
- [ ] Test responsive design on different screen sizes
- [ ] Optimize animations and transitions
- [ ] Create checkpoint for deployment
