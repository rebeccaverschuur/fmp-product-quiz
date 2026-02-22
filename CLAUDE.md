# FMP Product Quiz

Live, interactive quiz app for Fairmont Medical Products sales team training. A host projects questions on screen while players answer on their phones in real time.

## Quick Start

```bash
npm install
cp questions-example.json questions.json   # First time only
npm start
# Host: http://localhost:3000/host.html
# Players: http://localhost:3000
```

## Key Files

| File | Purpose |
|------|---------|
| `server.js` | Node.js server (Express + Socket.IO) |
| `questions.json` | Current quiz questions (edit each month) |
| `questions-example.json` | Example questions for reference |
| `load-questions.py` | Python helper to load questions from Excel template |
| `quiz-template.xlsx` | Excel template for authoring questions |
| `public/index.html` | Player entry screen |
| `public/host.html` | Host/presenter screen |
| `public/css/styles.css` | All styles |
| `public/js/host.js` | Host screen logic |
| `public/js/player.js` | Player screen logic |
| `public/img/logo.png` | Fairmont logo |

## Deployment

Live at **https://fmp-product-quiz.onrender.com** via Render free tier.

- **Host**: https://fmp-product-quiz.onrender.com/host.html
- **Players**: https://fmp-product-quiz.onrender.com

### Updating deployed version

1. Push changes to GitHub: https://github.com/rebeccaverschuur/fmp-product-quiz
2. Render dashboard → Manual Deploy → Deploy latest commit

Free tier spins down after 15 mins idle (~30s cold start).

## Question Format

```json
{
  "title": "March 2026 Product Quiz",
  "timePerQuestion": 15,
  "questions": [
    {
      "question": "Your question text here?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct": 0
    }
  ]
}
```

- `correct`: 0-based index of right answer
- `timePerQuestion`: default timer (seconds)
- Optional `time` field per question to override default

## Host Shortcuts

- **Spacebar**: Skip countdown timer / end question early
