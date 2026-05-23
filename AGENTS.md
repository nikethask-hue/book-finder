# AGENTS.md — Book Finder

This file is for **AI coding assistants** (Claude, Copilot, Cursor, etc.) and **human contributors** alike. It describes the project's purpose, architecture, coding conventions, and rules that must be followed when making changes.

---

## Project Overview

**Book Finder** is a deliberately simple, single-page web app. It is a learning project — the codebase is kept minimal and readable on purpose. Do not introduce unnecessary complexity.

### Core user flows

1. User searches → app calls OpenLibrary → results render
2. User saves a book → document written to Firestore → reading list updates
3. User toggles status → Firestore document updated → UI reflects new state
4. User refreshes → reading list re-fetched from Firestore → state restored

---

## Repository Layout

```
book-finder/
├── index.html          # Single HTML file; contains all markup
├── style.css           # All styles; no preprocessor, plain CSS
├── app.js              # All JavaScript logic; no build step
├── firebase-config.js  # Firebase credentials; never modify in PRs
└── README.md           # End-user setup guide
```

> **One file per concern. No bundlers. No frameworks. No build pipeline.**
> The app must work by opening `index.html` through a local HTTP server or GitHub Pages with zero compilation.

---

## For AI Coding Assistants

### Understand before changing

Before modifying any file, read it in full. The codebase is small — there is no excuse for partial reads. Understand what every function does and how the files relate to each other before writing a single line.

### Constraints you must respect

- **No npm, no bundlers, no transpilation.** All code runs directly in the browser. Do not add `package.json`, `webpack.config.js`, or any build tooling.
- **No frontend frameworks.** Do not introduce React, Vue, Svelte, or any component library. The app uses vanilla HTML, CSS, and JavaScript only.
- **No new dependencies** unless explicitly asked. If a dependency is truly necessary, use a CDN `<script>` tag — not a package manager.
- **Do not modify `firebase-config.js`.** This file contains credentials that the user fills in themselves. Never change, commit, or read values from it.
- **Do not add inline styles.** All styling belongs in `style.css`. Do not add `style=""` attributes to HTML elements.
- **Preserve the single-page layout.** Do not split the app into multiple HTML pages or introduce client-side routing.

### What you are allowed to do

- Fix bugs in `app.js` or `style.css`
- Improve the search results rendering (e.g. better fallback for missing cover images)
- Improve Firestore read/write error handling
- Add accessibility improvements (ARIA attributes, keyboard navigation, focus management)
- Improve CSS for responsiveness on mobile screens
- Refactor JavaScript functions for clarity, as long as external behaviour is unchanged
- Add comments to explain non-obvious logic

### How to validate your changes

After making changes, verify all of the following manually or by description:

- [ ] Searching for "tolkien" returns multiple results with titles and author names
- [ ] Clicking Save on a result adds it to the reading list
- [ ] The saved book appears in Firestore (Firebase Console → Firestore → your collection)
- [ ] Toggling status between "Want to Read" and "Read" works and persists after refresh
- [ ] Refreshing the page restores the reading list from Firestore
- [ ] The app works when served via Live Server or `python -m http.server`
- [ ] No browser console errors appear during normal use
- [ ] The app is usable on a 375px wide mobile viewport

### Commit message format

Use short, imperative present-tense commit messages:

```
Fix missing cover image fallback
Add keyboard support for search input
Improve Firestore error handling
```

Do not use commit messages like "I fixed the bug" or "Updated code".

---

## For Human Contributors

### Getting started

Follow the full setup guide in [README.md](./README.md) first. Once the app runs locally, you are ready to contribute.

### How to submit a change

1. **Fork** the repository (if you haven't already)
2. Create a new branch for your change:
   ```bash
   git checkout -b fix/cover-image-fallback
   ```
3. Make your changes
4. Test everything listed in the checklist above
5. Commit with a clear message
6. Push to your fork:
   ```bash
   git push origin fix/cover-image-fallback
   ```
7. Open a **Pull Request** against the `main` branch of the original repo
8. Describe what you changed and why in the PR description

### Branch naming

| Type of change | Branch prefix | Example |
|---|---|---|
| Bug fix | `fix/` | `fix/search-empty-state` |
| New feature | `feat/` | `feat/remove-book` |
| Style / CSS | `style/` | `style/mobile-layout` |
| Documentation | `docs/` | `docs/update-readme` |
| Refactor | `refactor/` | `refactor/firestore-helpers` |

### What makes a good contribution

- **Small and focused.** One PR = one logical change. Don't bundle unrelated fixes.
- **Tested.** Run through the full checklist before opening a PR.
- **Explained.** Write a clear PR description. If it's a visual change, include a screenshot.
- **Consistent.** Match the existing code style — see the Style Guide below.

### What not to contribute (without prior discussion)

- Framework migrations (e.g. rewriting in React)
- User authentication / login systems
- Backend changes beyond Firestore
- Changes to `firebase-config.js`
- Anything that requires a build step

If you want to propose a larger change, open an **Issue** first to discuss it.

---

## Code Style Guide

### JavaScript

- Use `const` by default; use `let` only when a variable will be reassigned
- Use `async/await` for all asynchronous operations — no raw `.then()` chains
- Wrap all Firestore operations in `try/catch` and log errors to the console
- Function names should be descriptive verbs: `searchBooks`, `saveBook`, `toggleStatus`
- No unused variables; no commented-out blocks of old code

```javascript
// Good
async function saveBook(book) {
  try {
    await addDoc(collection(db, "reading-list"), book);
  } catch (error) {
    console.error("Failed to save book:", error);
  }
}

// Bad
function save(b) {
  addDoc(collection(db, "reading-list"), b).then(() => {}).catch(e => console.log(e));
}
```

### CSS

- Use CSS custom properties (variables) for colours and repeated values
- Mobile-first: write base styles for small screens, use `min-width` media queries to scale up
- Class names use kebab-case: `.reading-list`, `.book-card`, `.search-bar`
- No `!important`
- Group properties in this order: layout → box model → typography → visual → animation

### HTML

- Semantic elements first: use `<main>`, `<section>`, `<article>`, `<button>`, `<input>` before reaching for `<div>`
- Every `<img>` must have an `alt` attribute
- Interactive elements must be focusable and operable by keyboard
- Do not put logic or styles inline

---

## Key APIs and Data Shapes

### OpenLibrary search

**Request:**
```
GET https://openlibrary.org/search.json?q=QUERY
```

**Relevant fields from each item in `docs`:**

```json
{
  "title": "The Hobbit",
  "author_name": ["J.R.R. Tolkien"],
  "first_publish_year": 1937,
  "cover_i": 8406786
}
```

**Cover image URL pattern:**
```
https://covers.openlibrary.org/b/id/{cover_i}-M.jpg
```

If `cover_i` is absent, display a placeholder image.

### Firestore document shape

Each saved book is stored as a document in the `reading-list` collection:

```json
{
  "title": "The Hobbit",
  "author": "J.R.R. Tolkien",
  "year": 1937,
  "coverId": 8406786,
  "status": "want-to-read",
  "savedAt": "2024-03-15T10:30:00Z"
}
```

`status` is either `"want-to-read"` or `"read"`. No other values are valid.

---

## Common Mistakes to Avoid

- **Do not call `getDocs` on every keystroke.** The search calls OpenLibrary; Firestore is only read on page load and written on save/toggle.
- **Do not store the full OpenLibrary API response in Firestore.** Extract only the fields listed above.
- **Do not assume a book has a cover.** `cover_i` is optional — always check before building the image URL.
- **Do not hard-code the Firestore collection name** in multiple places. Define it as a constant at the top of `app.js`.

---

## Questions and Issues

- Found a bug? Open a [GitHub Issue](../../issues) with steps to reproduce
- Have an idea? Open an Issue and describe the use case before writing any code
- Stuck on setup? Check the Troubleshooting section in [README.md](./README.md)
