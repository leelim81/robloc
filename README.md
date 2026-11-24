# ROBLOC

A collection of mini games with one shared progression: **points** (leaderboard rank and level), **coins**, and **achievement badges**.

Live site: https://leelim81.github.io/robloc

## Games

| Game | Status |
| --- | --- |
| Soccer: 3-a-side stadium match (striker, midfielder, goalkeeper) | Playable |
| Pickleball: singles with serve, two-bounce, kitchen and side-out rules | Playable |
| Baseball: bat and pitch through 1, 3 or 5 innings with balls, strikes, outs and base runners | Playable |
| Shopping Mall: 7 floors with an elevator and 93,560 shops (Floor 1: 10,000 general shops, Floor 2: 68,000 food places, Floor 3: 10,000 drink shops, Floor 4: 2,780 clothes and shoe shops, Floor 5: 2,780 makeup shops) plus B1 with 120 car park bays and the open-air R Roof at the very top (no roof over it, just sky) with TEN outdoor things - 10 swimming pools, 5 golf courses, 10 playgrounds, 10 gardens, 10 sports courts, 5 picnic areas, 5 sunbathing areas, 5 fountains, 5 skate parks, 5 outdoor gyms - plus sun chairs and umbrellas, each shop selling 7 to 1,000 items at real prices plus 8% sales tax. The mall has a MAP button, an elevator, and a 🔍 SEARCH button: tap the letters and every shop with those letters shows up, tap one and the shop opens | Playable |
| Guess the Price: game show with real mall items; pick the right price and beat the CPU contestant | Playable |
| Prize Machine: claw machine with plush toys, toys, coin bags and a golden crown | Playable |
| Maze: find your way through a new maze every game to the flag before the timer runs out — move with arrows, joystick, the on-screen D-pad or by tapping the cell next to you, collect coins on the way | Playable |

**ROBLOC Hunted** is a separate game on its own (not in the hub above): open `hunted.html` (or `?hunted=1`). Go to people's houses and collect sweets — don't get caught by the ghost! SNEAK: when the ghost is looking at you, he has a red triangle in front of him — if you are inside the triangle, he catches you. FREEZE outside the triangle (Shh!) — when he turns away, RUN. The Candy Boss appears after 4 sweets. Trevor starts with $8,788.37 in Hunted cash, 3740 Hunted points, 7635 played and 7273 won; everyone else starts from zero.

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
js/games/baseball.js  Baseball
js/games/mall.js      Shopping Mall
js/games/guessprice.js Guess the Price
js/games/prizemachine.js Prize Machine
js/games/shops.js     shop catalog: 18 hand-made shops + generated shops up to 93,560 (food, drinks, clothes, makeup)
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
2. Publish the security rules: Firebase console → Firestore Database → **Rules** → paste `firestore.rules` → **Publish**. Until this is done, saving and the leaderboard fail with `permission-denied`. The rules are kept simple, so new game features do not need them published again.

## Special roles (Trevor only)

Roles are never granted by typing a name. After the person signs in and creates a player once:

1. Firebase console → Firestore Database → `users` collection → find the document whose `name` is theirs. The document ID is their user ID.
2. Create a collection `roles` and add a document with **that same ID** and a string field `role`: `owner` for Trevor.

The player named **trevor** (any capitals) is always the owner, even without a `roles` document.

Trevor's numbers live in the code (`OWNER_STATS` in `js/economy.js`), so changing them only needs a push:
$73,573,649,729,729,638,637,737,872 money, 67,243,852,825,918 coins, 72,673,674,787,374,873 points, level 653,763,
87,963,845,395 games played and 75,375,285,572 won (split across Soccer, Pickleball, Baseball, Guess the Price and Prize Machine), 4,826,371,592,047 mall items owned, 90% win chance, and every badge.

Everyone else starts from the beginning, like real games — with 10 points, $10 and 10 coins to get going, and nothing else: no badges, no trophies, no wins, no games played, no items, Lv 1. Uncle Si Wei is NOT the owner, but he starts with $700,000 and 10,000 coins and nothing else special — no points, level, wins, win chance, badges or #1. His starting balance is set in the code (`SIWEI_STATS` in `js/economy.js`), and he is recognized by his name "Si Wei" (like Trevor is recognized by his name) — "Uncle Si Wei" counts too, since that is what Trevor calls him — so the balance shows even when no `roles` document exists for him yet — only the first account named Si Wei can use that name. A `roles` document for him (`role: siwei`, `moneyBase: 700000`, `coinsBase: 10000`) is still good to have so the record matches, but it is no longer needed for the balance to show. Bonus numbers in a `roles` document for any other role are ignored by the code, and the role itself is treated as a plain player. New players start with no badges at all. Old saves are cleaned up too: a plain player only keeps badges their own play could have earned (each badge is checked against their saved wins, goals, coins and points), and items bought with money they never earned are removed — lifetime spending can never pass lifetime earnings plus the starting balance. The leaderboard footer shows the real number of players from the database, never a made-up number.

The next time they open ROBLOC, their profile picks up the role, badge tag and starting balances. Players cannot write to `roles`, and nobody can write to anyone else's `users` document.

Trevor, the boss, also earns money from the mall: the 8% sales tax on every purchase goes to him. Each purchase saves the tax it paid on the buyer's own save (`bossPaidCents`), and his total is the sum of everyone's — so it works with the rules as they are, no extra step needed. The total is no longer shown anywhere: Trevor asked for the 👑 "Boss earned" display to be removed from the hub top bar and the mall wallet bar (2026-11-22). The tax is still saved on every purchase, so the display can come back any time.

## Rewards

- Each finished match gives points, coins and dollars based on the result, goals or points scored, and difficulty (Rookie ×1, Pro ×1.5, Legend ×2).
- Per-match caps: 600 points and 250 coins.
- Dollars: 75¢ for every coin earned, plus $5 for a win ($2 for a draw). Spend them in the Shopping Mall.
- The home screen shows what you earned by playing in total — ⭐ points earned, 🪙 coins earned, 💰 dollars earned — next to games played and won. The big totals at the top barely move for the owner (his starting fortune is huge), so the earned row is where you see your winnings grow after every match.
- **Dollars and coins buy superpowers**: before a match, spend dollars AND coins on a superpower for that match, like a real game — 🛡️ Shield ($25 + 25 coins, lose but still earn the draw reward), ⚡ Speed ($50 + 50 coins, run and move 50% faster), 💪 Power ($75 + 75 coins, shots and hits 50% stronger), ⭐ Double Points ($100 + 100 coins, earn double points), 🍀 Double Coins ($150 + 150 coins, earn double coins). Every power has its own dollar price and coin price. Pick one on the screen before you press PLAY, or tap the ⚡ SUPERPOWERS button in the mall to buy one — it is held for your next match. The dollars and coins are spent when the match starts. Trevor still wins about 90% of his matches and stays #1.
- Quitting a match from the pause menu gives no rewards.
- Level *n* starts at 50·n·(n−1) points.

## Test checklist

- Sign in with Google, create a player, edit the name and look.
- Soccer and Pickleball each start from PLAY, respond to keyboard and touch controls, and end with a results screen.
- Rewards and new badges appear on the results screen and in the hub; reload and confirm they persist.
- Leaderboard tabs (Overall, Soccer wins, Pickleball wins) show the top 10 players, then only your own row last in its own gold box, with your estimated world rank. A plain player never appears in the top 10 list itself, even if they would rank there. Trevor is always #1.
- **Start over** (Settings, the gear): erase everything — points, coins, money, badges, wins, items — and begin again with 10 points, $10 and 10 coins, the same start every new player gets. Tap it twice to confirm, so a stray tap cannot wipe a player. It only resets your own save (the rules let a player write only their own document), and it clears the device-local shop store too, so nothing old can come back. Trevor never sees this button: his numbers are the game's #1.
- On a phone or tablet in landscape: joystick moves smoothly, buttons respond, nothing is cut off.
