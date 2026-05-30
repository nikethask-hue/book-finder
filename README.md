📚 Book Finder
A full-stack web app that lets you search for books and authors, then save results to a personal reading list that persists across sessions using Firebase Firestore. Hosted live on GitHub Pages.
---
What the App Does
Search for any book title or author using the free OpenLibrary API
Browse results with cover images, titles, authors, and publication years
Save any book to your personal reading list with one click
Toggle each saved book between Want to Read and Read
Your reading list persists — refresh or close the tab and it's still there
---
Tech Stack
Layer	Technology
Frontend	HTML, CSS, vanilla JavaScript
Database	Firebase Firestore
Book Data	OpenLibrary API (free, no key needed)
Hosting	GitHub Pages
---
Prerequisites
Before you start, make sure you have the following:
A GitHub account — sign up free at github.com
A Firebase account — sign up free at firebase.google.com
A modern web browser (Chrome, Firefox, Edge, Safari)
A text editor — VS Code is recommended
Git installed on your machine — download here
> **Never used Git before?** That's fine. Every terminal command you need is written out in full below.
---
Step 1 — Fork and Clone the Repository
1a. Fork the repo
Go to the Book Finder repository on GitHub
Click the Fork button in the top-right corner
GitHub will create a copy of the repo under your own account
1b. Clone your fork to your computer
Open a terminal (or Git Bash on Windows) and run:
```bash
git clone https://github.com/YOUR-USERNAME/book-finder.git
```
Replace `YOUR-USERNAME` with your actual GitHub username.
1c. Move into the project folder
```bash
cd book-finder
```
---
Step 2 — Set Up Firebase
2a. Create a Firebase project
Go to firebase.google.com and sign in
Click Go to Console in the top-right
Click Add project
Give your project a name (e.g. `book-finder`) and click Continue
You can disable Google Analytics for this project — click Continue then Create project
Wait for the project to be created, then click Continue
2b. Register a web app
From your Firebase project dashboard, click the `</>` (web) icon under "Get started by adding Firebase to your app"
Give the app a nickname (e.g. `book-finder-web`)
Check the box for "Also set up Firebase Hosting" — this is optional but useful
Click Register app
Firebase will show you a `firebaseConfig` object — keep this page open, you'll need it in Step 4
2c. Enable Authentication
In the left sidebar, click Build → Authentication
Choose Sign-in method
Enable Google and Email/Password, then save each provider
2d. Create a Firestore database
In the left sidebar, click Build → Firestore Database
Click Create database
Choose Start in test mode (this lets anyone read/write for 30 days — fine for development)
Select a Firestore location closest to you, then click Enable
> **Note:** Test mode rules expire after 30 days. For a production app you would set up proper security rules, but for this project test mode is perfect.
---
Step 3 — Configure the App
3a. Open the project in your text editor
In VS Code, go to File → Open Folder and select the `book-finder` folder you cloned.
3b. Find the Firebase config file
Open the file `firebase-config.js` (or look inside `index.html` for a `<script>` block labelled Firebase config).
3c. Paste your Firebase credentials
Replace the placeholder values with the `firebaseConfig` object from Step 2b. It looks like this:
```javascript
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "book-finder-xxxxx.firebaseapp.com",
  projectId: "book-finder-xxxxx",
  storageBucket: "book-finder-xxxxx.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456"
};
```
> ⚠️ **Do not share these credentials publicly** in a real production app. For this learning project they are safe inside a public GitHub repo, but be aware they grant access to your Firestore database.
---
Step 4 — Test Locally
You need to serve the files over HTTP rather than opening `index.html` directly as a file, because browsers block certain features (like Firebase) when using the `file://` protocol.
Option A — VS Code Live Server (easiest)
In VS Code, install the Live Server extension (search for it in the Extensions panel)
Right-click `index.html` in the file explorer and choose Open with Live Server
Your browser will open at `http://127.0.0.1:5500`
Option B — Python (if you have Python installed)
```bash
# Python 3
python -m http.server 8080
```
Then open `http://localhost:8080` in your browser.
What to check
Type a book title or author name into the search bar and press Enter
Sign in with Google or use the email/password fields at the top
Click Save on a result — it should appear in your reading list below
Click the status button to toggle between Want to Read and Read
Refresh the page — your saved books should still be there (fetched from Firestore)
---
Step 5 — Deploy to GitHub Pages
5a. Push your changes to GitHub
```bash
git add .
git commit -m "Add Firebase config"
git push origin main
```
5b. Enable GitHub Pages
Go to your forked repository on GitHub
Click Settings (the gear icon in the top menu)
Scroll down to the Pages section in the left sidebar
Under Source, select Deploy from a branch
Set the branch to main and the folder to / (root)
Click Save
5c. Get your live URL
GitHub will build your site. After about 60 seconds, refresh the Settings → Pages page. You will see a green banner with your live URL:
```
https://YOUR-USERNAME.github.io/book-finder/
```
Visit that URL — your app is live! 🎉
---
How the OpenLibrary API Works
No sign-up or API key is required. The app sends a search request like this:
```
https://openlibrary.org/search.json?q=harry+potter
```
The response is a JSON object. The app reads the `docs` array, where each item contains:
Field	What it is
`title`	Book title
`author_name`	Array of author names
`first_publish_year`	Year of first publication
`cover_i`	Cover image ID (used to build the cover URL)
Cover images are loaded using:
```
https://covers.openlibrary.org/b/id/COVER_ID-M.jpg
```
---
Project Structure
```
book-finder/
├── index.html          # App shell and markup
├── style.css           # All styling
├── app.js              # Search logic, Firestore reads/writes
├── firebase-config.js  # Your Firebase credentials (you edit this)
└── README.md           # This file
```
---
Troubleshooting
Problem	Likely cause	Fix
Search returns no results	Network issue or typo	Check your internet connection; try a different search term
Books don't save	Firebase not configured	Double-check `firebase-config.js` values match your Firebase console
Page shows old books but won't save new ones	Firestore test mode expired	Go to Firebase Console → Firestore → Rules and extend the expiry date
App works locally but not on GitHub Pages	Wrong base path	Make sure all file paths in `index.html` are relative (e.g. `./app.js` not `/app.js`)
Cover images are broken	Book has no cover on OpenLibrary	Expected — not every book has a cover; the app falls back to a placeholder
---
Contributing
Found a bug or want to add a feature? See AGENTS.md for full contribution guidelines and instructions for AI coding assistants.
---
Licence
MIT — free to use, modify, and distribute.
