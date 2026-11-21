# ROBLOC

A collection of mini games with one shared progression: **points** (leaderboard rank and level), **coins**, and **achievement badges**.

Live site: https://leelim81.github.io/robloc

## Games

| Game | Status |
| --- | --- |
| Soccer: 3-a-side stadium match (striker, midfielder, goalkeeper) | Playable |
| Pickleball: singles with serve, two-bounce, kitchen and side-out rules | Playable |
| Baseball, Guess the Price, Transport Modes, Dream Store, Prize Machine, Shopping Mall, Brick Builder Shop | Coming soon |

Everything is drawn and synthesized in the browser: characters, stadiums, music and sound effects. There are no image or audio files to license.

## Tech

- Plain HTML, CSS and JavaScript modules. No build step; GitHub Pages serves the repository as-is.
- Firebase Authentication (Google sign-in) and Cloud Firestore for saves and the leaderboard.
- Firestore security rules (`firestore.rules`) enforce what each player can change.

## Project layout

```
index.html            app shell: landing, player setup, hub, game layer
css/style.css         all UI styling and animation
js/main.js            screens, hub, leaderboard, badges, game host loop
js/backend.js         Firebase + demo (local) storage
js/economy.js         rewards, levels, badges, big-number formatting
js/audio.js           synthesized music tracks and sound effects
js/art.js             procedural human characters and avatars
js/input.js           keyboard, on-screen joystick and buttons
js/fx.js              particles, banners, screen shake
js/games/soccer.js    Soccer
js/games/pickleball.js Pickleball
firestore.rules       security rules to publish in the Firebase console
```

## Run locally

```bash
python3 -m http.server 8080
```

Open http://localhost:8080/?demo to play in demo mode (saves to this browser only, no sign-in).
Google sign-in on localhost works only if `localhost` is in Firebase → Authentication → Settings → Authorized domains (it is there by default).

## Firebase setup

1. `js/firebase-config.js` holds the web app config for project `robloc-d500b`.
2. Publish the security rules: Firebase console → Firestore Database → **Rules** → paste `firestore.rules` → **Publish**. Until this is done, saving and the leaderboard fail with `permission-denied`.

## Special roles (Trevor and Si Wei)

Roles are never granted by typing a name. After the person signs in and creates a player once:

1. Firebase console → Firestore Database → `users` collection → find the document whose `name` is theirs. The document ID is their user ID.
2. Create a collection `roles` and add a document with **that same ID** and these string fields:

| Person | `role` | `moneyBase` | `coinsBase` |
| --- | --- | --- | --- |
| Trevor | `owner` | `837462195708341629584203716852` | `748392615804273961528406` |
| Si Wei | `siwei` | `3000000` | `500000` |

The next time they open ROBLOC, their profile picks up the role, badge tag and starting balances. Players cannot write to `roles`, and nobody can write to anyone else's `users` document.

## Rewards

- Each finished match gives points and coins based on the result, goals or points scored, and difficulty (Rookie ×1, Pro ×1.5, Legend ×2).
- Per-match caps: 600 points and 250 coins (the rules allow at most 1,000 and 500, and one reward every 20 seconds).
- Quitting a match from the pause menu gives no rewards.
- Level *n* starts at 50·n·(n−1) points.

## Test checklist

- Sign in with Google, create a player, edit the name and look.
- Soccer and Pickleball each start from PLAY, respond to keyboard and touch controls, and end with a results screen.
- Rewards and new badges appear on the results screen and in the hub; reload and confirm they persist.
- Leaderboard tabs (Overall, Soccer wins, Pickleball wins) list players and highlight your row.
- On a phone or tablet in landscape: joystick moves smoothly, buttons respond, nothing is cut off.
