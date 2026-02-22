<objective>
Build a live, interactive product quiz web application for Fairmont Medical Products' sales team training sessions. This is a Kahoot-style quiz where a host projects questions on a screen and players answer on their own devices (phones/laptops) in real time.

This replaces ad-hoc quiz methods with a professional, reusable tool that runs monthly during product training. It needs to look polished — better than Kahoot — and be dead simple for the quiz master (Bec or Danni) to run.

Go beyond the basics to create a fully-featured, visually impressive quiz experience.
</objective>

<context>
- **Company**: Fairmont Medical Products (medical device distributor)
- **Users**: ~10-20 sales reps answering on phones/laptops, 1 host (Bec or Danni) projecting on a screen
- **Frequency**: Monthly during product training sessions
- **Tech stack**: Node.js backend with WebSocket (Socket.IO) for real-time sync, vanilla HTML/CSS/JS frontend (no framework needed — keep it simple and deployable)
- **Deployment**: Initially run locally (`npm start`), later handed to IT for deployment on an internal FMP server
- **Questions**: Loaded from a JSON file each month — no database needed

Read the project CLAUDE.md for repository conventions.
</context>

<architecture>
Create a new project directory: `./product-quiz/`

```
product-quiz/
├── server.js              # Node.js + Express + Socket.IO server
├── package.json           # Dependencies and scripts
├── questions.json          # Current month's quiz questions (template)
├── questions-example.json  # Example with sample medical product questions
├── public/
│   ├── host.html          # Host/presenter screen (projected on TV/monitor)
│   ├── player.html        # Player screen (mobile-friendly, used on phones)
│   ├── img/
│   │   └── logo.png       # Fairmont logo (copied from repo)
│   ├── css/
│   │   └── styles.css     # Shared styles
│   └── js/
│       ├── host.js        # Host screen logic
│       └── player.js      # Player screen logic
└── README.md              # Setup and usage instructions for Bec/IT
```

**Logo**: Copy `../FMP Logo ORANGE.png` to `./product-quiz/public/img/logo.png` before starting. The logo file exists at the root of the general repo.
</architecture>

<requirements>

## Host Screen (host.html) — Projected on TV/monitor

1. **Lobby view**: Shows a large join code/URL, displays player names as they join (animated entrance), and a "Start Quiz" button
2. **Question view**: Displays the question text prominently, shows the multiple choice options (A/B/C/D) with coloured blocks, a visible countdown timer (15 seconds default), and a count of how many players have answered
3. **Results view**: After timer expires or all players answer, reveal the correct answer with a visual highlight, show a bar chart of how many picked each option, then transition to the leaderboard
4. **Leaderboard view**: Ranked list of players by score after each question, highlight top 3, animate position changes between rounds
5. **Final results view**: End-of-quiz podium/celebration screen showing top 3, everyone's final scores, and a "Play Again" or "New Quiz" button

## Player Screen (player.html) — Mobile-friendly

1. **Join view**: Enter display name, join the quiz session. Clean, large text input and join button that works well on mobile
2. **Waiting view**: "Waiting for host to start..." message with their name displayed
3. **Answer view**: Show the question text and 4 large, tappable answer buttons (A/B/C/D) with matching colours to the host screen. Buttons disable after selection. Show countdown timer
4. **Feedback view**: After each question, show if they were correct/incorrect, points earned, and their current rank
5. **Final view**: Their final score and position

## Real-time Sync (Socket.IO)

- Host controls the flow: start quiz, advance to next question
- All players see the question at the same time
- Player answers are sent to server instantly
- Server tracks timing for speed-based scoring
- Host screen updates live as answers come in (answer count)

## Scoring

- **Correct answer**: 1000 points base
- **Speed bonus**: Up to 500 extra points for fast answers (linear scale — answering in 1 second = +500, answering at 15 seconds = +0)
- **Wrong answer**: 0 points
- Points are cumulative across all questions

## Question Format (questions.json)

```json
{
  "title": "February 2026 Product Quiz",
  "timePerQuestion": 15,
  "questions": [
    {
      "question": "What is the intended use of the DRE Resectoscope?",
      "options": ["Cardiac surgery", "Urological procedures", "Orthopaedic repair", "Dental implants"],
      "correct": 1
    }
  ]
}
```

- `correct` is the 0-based index of the correct option
- `timePerQuestion` can be overridden per-question with an optional `time` field
- Include 5 example medical product questions in `questions-example.json`

## Visual Design

- **Fairmont logo**: Display the logo (`img/logo.png`) on the host lobby screen, the player join screen, and the final results/podium screen. Keep it tasteful — top-centre or top-left, not too large. It reinforces branding without dominating the UI.
- **Professional and clean** — not childish like Kahoot. Think corporate training meets modern web design
- Colour palette: Use Fairmont's orange (#F37021) as the primary accent colour, with dark navy (#1B2A4A) backgrounds and white text
- Answer option colours: Use 4 distinct, professional colours (e.g., blue, green, orange, purple) for options A/B/C/D — consistent between host and player screens
- Large, readable fonts — the host screen will be viewed from across a room
- Smooth animations and transitions between views (CSS transitions, not jarring)
- The countdown timer should be visually prominent — a circular countdown or progress bar
- Mobile-responsive player screen — must look great on phone screens
- Subtle celebratory animation on the final podium screen (CSS-only, no confetti libraries)

</requirements>

<implementation>

1. **Server (server.js)**:
   - Express serves static files from `public/`
   - Socket.IO handles all real-time communication
   - Server loads `questions.json` on startup
   - Game state managed in memory (no database)
   - Generate a simple 4-digit room code for each session
   - Handle edge cases: player disconnects mid-quiz, host refreshes, duplicate names

2. **No authentication needed** — this is internal, trust-based. Anyone with the URL can join.

3. **No build step** — keep it simple. Plain HTML/CSS/JS. No webpack, no React, no TypeScript. This needs to be something Bec can `npm start` and it just works.

4. **Why no database**: Questions change monthly via a JSON file swap. Player scores don't need to persist beyond the session. Simplicity is more important than features here.

5. **Why Socket.IO over plain WebSockets**: Built-in reconnection, room support, and fallback to polling. More reliable for a room full of phones on potentially flaky WiFi.

6. **README.md** should include:
   - How to install (`npm install`)
   - How to run (`npm start`)
   - How to access (host goes to `http://localhost:3000/host.html`, players go to `http://localhost:3000`)
   - How to update questions (edit `questions.json`, restart server)
   - Copy `questions-example.json` to `questions.json` to get started

</implementation>

<output>
Create all files in `./product-quiz/` as described in the architecture section above. Every file should be complete and functional — no placeholder code or TODOs.

Copy the Fairmont logo into the project:
```bash
mkdir -p ./product-quiz/public/img && cp "./FMP Logo ORANGE.png" ./product-quiz/public/img/logo.png
```
</output>

<verification>
Before declaring complete, verify your work:

1. Run `cd ./product-quiz && npm install && node server.js` to confirm the server starts without errors
2. Confirm `http://localhost:3000` serves the player page
3. Confirm `http://localhost:3000/host.html` serves the host page
4. Review the HTML/CSS to ensure mobile responsiveness and professional styling
5. Verify the WebSocket events are properly wired: join → start → question → answer → results → leaderboard → final
6. Stop the server after testing
</verification>

<success_criteria>
- Server starts with `npm start` and serves both host and player pages
- Host can create a session, see players join, start the quiz, and advance through questions
- Players can join by name, see questions in sync with host, tap answers, and see their score
- Countdown timer works and auto-advances when time expires
- Leaderboard updates after each question with correct rankings
- Scoring includes speed bonus
- Questions load from questions.json
- UI is professional, clean, and mobile-friendly
- No external CSS frameworks (keep dependencies minimal: just express + socket.io)
</success_criteria>
