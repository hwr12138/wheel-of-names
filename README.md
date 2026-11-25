# wheel-of-names

A wheel you spin by clicking its centre. Enter a list of names at the start of a session; each spin draws one name and takes it off the wheel, until every name has been drawn.

Built with TypeScript, Vite and an HTML canvas. There is no backend: the session is kept in the browser's `sessionStorage`, so a refresh keeps your place and closing the tab clears it.

## Develop

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # unit tests (spin maths, random draw, session state)
npm run build      # type-check and build into dist/
```

## How a spin works

The winner is picked first, with `crypto.getRandomValues` so every remaining name is equally likely. The animation then works out an end angle that stops that name's wedge under the pointer, a random distance from the wedge's centre but never on a dividing line, after 5–8 full turns. A refresh mid-spin resumes at that spin's result, so a draw can't be thrown away and re-rolled.

## Deploy to Firebase Hosting

One-time setup:

```bash
npm install -g firebase-tools
firebase login
firebase use --add   # pick or create your Firebase project; writes .firebaserc
```

Then deploy whenever you like:

```bash
npm run deploy
```

To try the production build on Firebase's local emulator first (http://localhost:5050):

```bash
npm run serve:firebase
```

`firebase.json` serves `dist/`, never caches `index.html`, and caches the hashed files in `/assets/` for a year, so each deploy shows up straight away.
