# Quiz System - Deployment Guide

## Overview

The Quiz System is a real-time team quiz application built with React, tRPC, Drizzle ORM, and Express. It features a Memphis-inspired design system and supports live scoring with separate host control and public display screens.

## Architecture

### Technology Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS
- **Backend**: Express, tRPC, Node.js
- **Database**: MySQL/TiDB with Drizzle ORM
- **Authentication**: Manus OAuth
- **Real-time Updates**: Polling (1-second intervals)
- **Testing**: Vitest

### Project Structure

```
quiz-system/
├── client/                 # React frontend
│   └── src/
│       ├── pages/         # Page components (Admin, Host, Live Display, etc.)
│       ├── components/    # Reusable UI components
│       ├── lib/          # tRPC client setup
│       └── index.css     # Memphis design system
├── server/               # Express backend
│   ├── routers.ts       # tRPC procedure definitions
│   ├── db.ts            # Database queries
│   └── _core/           # Core utilities (auth, context, etc.)
├── drizzle/             # Database schema and migrations
├── shared/              # Shared types and constants
└── package.json         # Dependencies and scripts
```

## Prerequisites

- Node.js 18+
- MySQL 8.0+ or TiDB
- Environment variables configured (see `.env` setup below)

## Environment Setup

### 1. Database Configuration

Create a `.env` file in the project root:

```env
# Database
DATABASE_URL="mysql://user:password@localhost:3306/quiz_system"

# OAuth
OWNER_OPEN_ID="your-owner-id"
LOGIN_URL="https://your-manus-instance.com/oauth/authorize"
OAUTH_CLIENT_ID="your-client-id"
OAUTH_CLIENT_SECRET="your-client-secret"

# Server
PORT=3000
NODE_ENV="production"
```

### 2. Database Initialization

```bash
# Generate migrations
npm run db:push

# This will create all necessary tables:
# - users
# - quiz_questions
# - quiz_sessions
# - quiz_session_questions
# - scores
# - question_responses
```

## Installation & Development

### Local Development

```bash
# Install dependencies
npm install --legacy-peer-deps

# Run development server (frontend + backend)
npm run dev

# Run tests
npm test

# Build for production
npm run build

# Start production server
npm start
```

### Testing

The project includes comprehensive test coverage for all critical procedures:

```bash
# Run all tests
npm test

# Test coverage includes:
# - Quiz question CRUD operations
# - Quiz session creation and state management
# - Quiz progression (start, next question, end)
# - Score tracking and point assignment
# - Session completion handling
```

## Features & Workflow

### 1. Admin Panel (`/admin`)

**Purpose**: Manage quiz questions

**Features**:
- Create new questions with 4 multiple-choice answers
- Edit existing questions
- Delete questions with confirmation
- Set custom point values per question
- Mark correct answer

**Workflow**:
1. Navigate to Admin Panel from home
2. Click "Add Question" to create new questions
3. Fill in question text, answers, correct answer, and points
4. Save and manage questions in the grid view

### 2. Group Setup (`/setup`)

**Purpose**: Configure teams and initialize quiz session

**Features**:
- Enter two team names
- Display count of available questions
- Validate both team names are filled
- Create quiz session with all questions

**Workflow**:
1. Navigate to Group Setup from home
2. Enter Team 1 and Team 2 names
3. Verify question count is > 0
4. Click "Start Quiz" to create session and redirect to Host Panel

### 3. Host Control Panel (`/host/:sessionId`)

**Purpose**: Control quiz progression and manage scoring

**Features**:
- Live URL generation for public display screen
- Real-time score tracking for both teams
- Quiz state management (setup → in_progress → completed)
- Question progression controls
- Manual point assignment to teams
- Quiz completion summary with winner announcement

**Workflow**:
1. After creating session, host is redirected to Host Panel
2. Copy live URL and share with audience
3. Click "Start Quiz" to begin
4. For each question:
   - Question displays on public screen
   - Host awards points to winning team
   - Click "Next Question" to advance
5. After last question, click "Next Question" to complete
6. View final scores and winner announcement

### 4. Live Public Display (`/live/:sessionId`)

**Purpose**: Display quiz content to audience

**Features**:
- Real-time scoreboard showing both team scores
- Large question display with typography
- 30-second countdown timer with visual feedback
- Answer reveal animation (correct answer highlighted in green)
- Points display after answer reveal
- Quiz completion screen with winner announcement
- Automatic updates via polling

**States**:
- **Setup**: "Waiting for quiz to start..."
- **In Progress**: Question display with timer and answers
- **Completed**: Final scores and winner announcement

## Deployment

### Vercel/Web Platform Deployment

1. **Push to GitHub**:
   ```bash
   git add .
   git commit -m "Quiz system ready for deployment"
   git push origin main
   ```

2. **Configure Environment Variables**:
   - Set all `.env` variables in platform settings
   - Ensure `DATABASE_URL` points to production database

3. **Build & Deploy**:
   ```bash
   npm run build
   npm start
   ```

### Docker Deployment

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --legacy-peer-deps

COPY . .

RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
```

Build and run:
```bash
docker build -t quiz-system .
docker run -p 3000:3000 --env-file .env quiz-system
```

## Performance Optimization

### Real-time Updates

The system uses polling with 1-second intervals for:
- Session state updates
- Score tracking
- Question progression

For high-traffic scenarios, consider:
- WebSocket implementation for real-time updates
- Redis caching for score data
- Database query optimization with indexes

### Frontend Optimization

- Lazy loading of page components
- Memoization of expensive computations
- CSS-in-JS optimization with Tailwind
- Image optimization for Memphis design elements

## Monitoring & Maintenance

### Health Checks

Monitor these endpoints:
- `GET /api/health` - Server health status
- `GET /api/trpc/auth.me` - Authentication status

### Database Maintenance

```bash
# Backup database
mysqldump -u user -p quiz_system > backup.sql

# Restore from backup
mysql -u user -p quiz_system < backup.sql
```

### Logs

- Frontend errors: Browser console and error tracking service
- Backend errors: Server logs and error monitoring service
- Database errors: MySQL error log

## Troubleshooting

### Common Issues

**Issue**: "Quiz started but navigation fails"
- **Solution**: Verify `/host/:sessionId` route exists in App.tsx

**Issue**: "Live display not updating"
- **Solution**: Check polling interval (should be 1000ms), verify network connectivity

**Issue**: "Questions not loading"
- **Solution**: Verify database connection, check `DATABASE_URL` environment variable

**Issue**: "Authentication fails"
- **Solution**: Verify OAuth credentials, check `OWNER_OPEN_ID` configuration

## API Reference

### Core Procedures

#### Questions
- `questions.list()` - Get all questions
- `questions.get({ id })` - Get single question
- `questions.create(data)` - Create new question
- `questions.update({ id, ...data })` - Update question
- `questions.delete({ id })` - Delete question

#### Sessions
- `session.create({ groupOneName, groupTwoName, questionIds })` - Create quiz session
- `session.get({ id })` - Get session details
- `session.start({ id })` - Start quiz
- `session.nextQuestion({ id })` - Advance to next question
- `session.end({ id })` - End quiz
- `session.getQuestions({ sessionId })` - Get session questions
- `session.getScores({ sessionId })` - Get session scores

#### Scoring
- `scoring.awardPoints({ sessionId, groupNumber, points, questionId })` - Award points
- `scoring.getScores({ sessionId })` - Get scores

## Best Practices

1. **Question Design**:
   - Keep questions concise and clear
   - Use 4 distinct answer options
   - Vary point values for difficulty

2. **Team Management**:
   - Use meaningful team names
   - Ensure equal number of participants
   - Brief teams on rules before starting

3. **Live Display**:
   - Project on large screen visible to all
   - Position host panel separately for control
   - Test audio/visual setup before event

4. **Scoring**:
   - Award points immediately after answer reveal
   - Double-check correct answers
   - Announce scores after each question

## Support & Contribution

For issues or feature requests:
1. Check existing GitHub issues
2. Create detailed bug reports with reproduction steps
3. Submit pull requests with tests for new features

## License

[Specify your license here]

## Changelog

### Version 1.0.0
- Initial release
- Quiz question management
- Real-time scoring
- Host control panel
- Public display screen
- Memphis design system
- Comprehensive test coverage
