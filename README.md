# OYO Compass PWA

An installable PWA for the OYO Own Your Options coaching experience.

© 2026 Own Your Options™. All rights reserved.

## What Is Included

- Firebase login home screen for live user accounts
- Dashboard with daily action stats and manifestation card
- AI coach flow that adapts to free vs premium state
- Future self statement
- Vision board and journal
- Daily manifestation cards and gratitude
- NLP-inspired exercises
- Goals and daily actions
- Whole-life coaching with business and LWA as one pathway inside the broader life compass
- Free and premium content gates
- Resource library
- Built-in community preview and premium posting
- Offline-ready service worker and web app manifest
- OYO-inspired dark, gold, purple, and white brand direction
- Growth Memory profile that tracks stage, focus, patterns, evidence, and milestones
- Owner-only Admin tab protected by the configured Firebase owner email

## Run Locally

Open the project folder in a local web server and visit:

```text
http://127.0.0.1:4173/
```

In this workspace, a local preview is currently running on that address.

## Host On GitHub Pages

This is a static PWA, so GitHub Pages can host it directly.

Recommended setup:

1. Create a new GitHub repository.
2. Upload every file from this project into the repository.
3. In GitHub, go to `Settings` > `Pages`.
4. Under `Build and deployment`, choose `GitHub Actions`.
5. Push to the `main` branch, or run the included `Deploy OYO Compass to GitHub Pages` workflow manually.
6. GitHub will publish the app and show the live Pages URL.

No build command is required.

Included GitHub hosting files:

- `.github/workflows/pages.yml` to deploy with GitHub Actions
- `.nojekyll` so GitHub Pages serves static app files as-is
- `404.html` fallback for direct visits

Other static hosts are still supported through `netlify.toml`, `vercel.json`, `_headers`, and `_redirects`.

## Make Each Person's Experience Private With Firebase

Use Firebase when you want each member to sign in and keep their own coach memory, journal, goals, gratitude, actions, and premium state.

1. Go to the [Firebase Console](https://console.firebase.google.com/) and create a project.
2. Add a Web app inside that Firebase project.
3. Copy the Firebase config values into `firebase-config.js`.
4. In Firebase, open `Authentication` and enable `Email/Password`.
5. In Firebase, open `Firestore Database` and create a database.
6. Publish the included `firestore.rules` so each user can only read and write their own `/users/{uid}` data.
7. Deploy with Firebase Hosting:

```text
firebase login
firebase init hosting firestore
firebase deploy
```

This app uses:

- Firebase Authentication for account login
- Cloud Firestore for private per-user app data
- Firebase Hosting for putting the PWA online

Until `firebase-config.js` has real Firebase values, the app is locked and cannot be used. There is no demo mode in the live build.

## Add Your LWA And Premium Payment Links

Open `firebase-config.js` and replace these placeholders:

```js
export const appLinks = {
  lwa: "PASTE_YOUR_LWA_LINK_HERE",
  premiumPayment: "PASTE_YOUR_PREMIUM_PAYMENT_LINK_HERE"
};
```

Example:

```js
export const appLinks = {
  lwa: "https://your-lwa-link.com",
  premiumPayment: "https://your-stripe-or-payment-link.com"
};
```

Use the LWA link for the button that sends premium users toward LWA.

Use the premium payment link for buttons such as `Unlock Premium`, `Upgrade`, and `Unlock full community`.

Important: the payment link sends people to pay, but it does not automatically mark them Premium yet. That will need Stripe/Firebase payment automation or manual admin approval later.

## Next Production Steps

- Replace local login with real authentication.
- Connect premium state to Stripe, Lemon Squeezy, or another payment provider.
- Replace the prototype coach rules with a real AI backend and user memory.
- Store journals, goals, posts, and vision board assets in a database.
- Add admin tools for resources, LWA links, cards, exercises, and community moderation.
