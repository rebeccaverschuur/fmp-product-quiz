# FMP Product Quiz

Live, interactive quiz app for Fairmont Medical Products sales team training sessions. A host projects questions on screen while players answer on their phones in real time.

## Quick Start

```bash
# Install dependencies (first time only)
npm install

# Copy the example questions to get started
cp questions-example.json questions.json

# Start the server
npm start
```

## How to Use

1. **Start the server** with `npm start`
2. **Host** opens `http://localhost:3000/host.html` on the computer connected to the projector/TV
3. **Players** open `http://localhost:3000` on their phones or laptops (must be on the same network)
4. Players enter their name and join
5. Host clicks **Start Quiz** when everyone is in
6. Questions appear on both screens simultaneously — players tap their answers
7. After each question, the leaderboard updates automatically
8. Host clicks **Next Question** to advance, or **Show Final Results** after the last one

## Updating Questions

Edit `questions.json` with the new month's questions, then restart the server. The format is:

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

- `correct` is the 0-based index of the right answer (0 = A, 1 = B, 2 = C, 3 = D)
- `timePerQuestion` sets the default timer (seconds) for all questions
- Add an optional `time` field to any individual question to override the default

## Host Shortcuts

- **Spacebar**: Skip the countdown timer and end the question early (useful if everyone has answered)

## Network Access

If players can't connect, make sure:
- All devices are on the same Wi-Fi network
- Use the computer's local IP address instead of `localhost` (e.g. `http://192.168.1.50:3000`)
- The firewall allows connections on port 3000

## Files

| File | Purpose |
|------|---------|
| `server.js` | Node.js server (Express + Socket.IO) |
| `questions.json` | Current quiz questions (edit this each month) |
| `questions-example.json` | Example questions for reference |
| `public/host.html` | Host/presenter screen |
| `public/player.html` | Player screen (mobile-friendly) |
| `public/css/styles.css` | All styles |
| `public/js/host.js` | Host screen logic |
| `public/js/player.js` | Player screen logic |
