# ROBLOC notes for Claude

## Workflow (owner's standing instruction)
- Test changes yourself, then commit and push straight to `main` (the live GitHub Pages site). No need to ask first.
- Still tell the owner what changed and anything they must do by hand (for example, publishing `firestore.rules` in the Firebase console).

## Testing
- No build step. Load the site in Playwright with `?demo` (local storage saves, no sign-in) and serve repo files through `page.route`.
- Games export `create(env)`; most take an `env.debug` hook for headless simulations.
- Firebase itself can't be reached from the cloud sandbox, so Firestore rules can't be tested here.

## Firebase
- Project `robloc-d500b`. Rules in `firestore.rules` are kept simple (own document only; role bonuses come from `roles/{uid}`), so new features shouldn't need a rules change.
- Trevor is the owner: any player named "trevor" (any capitals), or `roles/{uid}` with `role: owner`. Keep him #1 on the Overall leaderboard.
- Trevor's numbers are in `OWNER_STATS` (`js/economy.js`); change them there when he asks.
