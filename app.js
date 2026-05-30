// ========================================
// Firebase Imports (CDN)
// ========================================

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';

// Import Firebase config
import { firebaseConfig } from './firebase-config.js';

// ========================================
// Firebase Initialization
// ========================================

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
let currentUser = null;

// ========================================
// Constants
// ========================================

const COLLECTION = 'reading-list';

// ========================================
// DOM References
// ========================================

const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const resultsDiv = document.getElementById('results');
const readingListDiv = document.getElementById('reading-list');
const authStatus = document.getElementById('authStatus');
const authButton = document.getElementById('authButton');
const emailInput = document.getElementById('emailInput');
const passwordInput = document.getElementById('passwordInput');
const emailSignInBtn = document.getElementById('emailSignInBtn');
const emailRegisterBtn = document.getElementById('emailRegisterBtn');
const sortSelect = document.getElementById('sortSelect');
const bookStats = document.getElementById('bookStats');
const shareBtn = document.getElementById('shareBtn');
const shareMessage = document.getElementById('shareMessage');
const shareSection = document.getElementById('shareSection');
const shareBanner = document.getElementById('shareBanner');

let sharedUserId = null;
let isShareView = false;

// Status options
const DEFAULT_SHELVES = ['Want to Read', 'Read'];
const SORT_STORAGE_KEY = 'bookFinderSort';

// ========================================
// Event Listeners
// ========================================

document.addEventListener('DOMContentLoaded', () => {
  sharedUserId = new URLSearchParams(window.location.search).get('share');
  isShareView = Boolean(sharedUserId);
  setShareView();
  setupAuthListeners();
});

searchBtn.addEventListener('click', async () => {
  if (!currentUser) {
    alert('Please sign in to search for books.');
    return;
  }

  const query = searchInput.value.trim();
  if (query) {
    resultsDiv.innerHTML = '<p class="empty-state">Searching…</p>';
    await searchBooks(query);
  }
});

authButton.addEventListener('click', async () => {
  if (currentUser) {
    await signOutUser();
  } else {
    await signIn();
  }
});

emailSignInBtn.addEventListener('click', async () => {
  await emailSignIn();
});

emailRegisterBtn.addEventListener('click', async () => {
  await emailRegister();
});

shareBtn.addEventListener('click', async () => {
  if (!currentUser) {
    alert('Sign in to generate a shareable reading list link.');
    return;
  }

  const url = new URL(window.location.href);
  url.searchParams.set('share', currentUser.uid);
  const shareUrl = url.toString();

  try {
    await navigator.clipboard.writeText(shareUrl);
    shareMessage.textContent = 'Shareable link copied to clipboard.';
  } catch (error) {
    console.error('Copy failed:', error);
    shareMessage.textContent = shareUrl;
  }

  setTimeout(() => {
    shareMessage.textContent = '';
  }, 5000);
});

searchInput.addEventListener('keypress', async (event) => {
  if (event.key === 'Enter') {
    if (!currentUser) {
      alert('Please sign in to search for books.');
      return;
    }

    const query = searchInput.value.trim();
    if (query) {
      resultsDiv.innerHTML = '<p class="empty-state">Searching…</p>';
      await searchBooks(query);
    }
  }
});


sortSelect.addEventListener('change', (e) => {
  if (!currentUser) {
    e.target.value = localStorage.getItem(SORT_STORAGE_KEY) || 'date-desc';
    return;
  }

  localStorage.setItem(SORT_STORAGE_KEY, e.target.value);
  loadReadingList();
});

function getUserCollection() {
  if (!currentUser) {
    throw new Error('No authenticated user');
  }
  return collection(db, 'users', currentUser.uid, COLLECTION);
}

function getSharedCollection() {
  return collection(db, 'users', sharedUserId, COLLECTION);
}

function setShareView() {
  if (shareSection) {
    shareSection.style.display = isShareView ? 'none' : 'flex';
  }
  if (shareBanner) {
    shareBanner.hidden = !isShareView;
  }
}

function updateAuthUi(user) {
  if (user) {
    authStatus.textContent = `Signed in as ${user.displayName || user.email}`;
    authButton.textContent = 'Sign out';
    authButton.classList.add('signed-in');
  } else {
    authStatus.textContent = 'Not signed in';
    authButton.textContent = 'Sign in with Google';
    authButton.classList.remove('signed-in');
  }

  updateFeatureAccess(user);
}

function updateFeatureAccess(user) {
  const enabled = Boolean(user);

  searchInput.disabled = !enabled;
  searchBtn.disabled = !enabled;
  sortSelect.disabled = !enabled;
  shareBtn.disabled = !enabled;

  searchInput.placeholder = enabled
    ? 'Search books or authors…'
    : 'Sign in to search books…';

  if (!enabled) {
    resultsDiv.innerHTML = '<p class="empty-state">Sign in to search books.</p>';
    readingListDiv.innerHTML = '<p class="empty-state">Sign in to view your reading list and saved books.</p>';
    bookStats.style.display = 'none';
  }
}

function setupAuthListeners() {
  onAuthStateChanged(auth, (user) => {
    currentUser = user;
    updateAuthUi(user);
    if (isShareView) {
      loadSharedReadingList();
    } else {
      loadReadingList();
    }
  });
}

async function signIn() {
  try {
    await signInWithPopup(auth, provider);
  } catch (error) {
    console.error('Sign in failed:', error);
    alert('Could not sign in. Please try again.');
  }
}

async function signOutUser() {
  try {
    await signOut(auth);
    currentUser = null;
    updateAuthUi(null);
    loadReadingList();
  } catch (error) {
    console.error('Sign out failed:', error);
    alert('Could not sign out. Please try again.');
  }
}

async function emailSignIn() {
  const email = emailInput.value.trim();
  const password = passwordInput.value;

  if (!email || !password) {
    alert('Enter both email and password to sign in.');
    return;
  }

  try {
    await signInWithEmailAndPassword(auth, email, password);
    emailInput.value = '';
    passwordInput.value = '';
  } catch (error) {
    console.error('Email sign in failed:', error);
    if (error.code === 'auth/wrong-password') {
      alert('Incorrect password. Please try again.');
    } else if (error.code === 'auth/user-not-found') {
      alert('No account found for that email. Please register first.');
    } else if (error.code === 'auth/invalid-email') {
      alert('Please enter a valid email address.');
    } else {
      alert('Could not sign in. Please try again.');
    }
  }
}

async function emailRegister() {
  const email = emailInput.value.trim();
  const password = passwordInput.value;

  if (!email || !password) {
    alert('Enter both email and password to register.');
    return;
  }

  try {
    await createUserWithEmailAndPassword(auth, email, password);
    emailInput.value = '';
    passwordInput.value = '';
  } catch (error) {
    console.error('Email registration failed:', error);
    if (error.code === 'auth/email-already-in-use') {
      alert('That email is already in use. Please sign in instead.');
    } else if (error.code === 'auth/invalid-email') {
      alert('Please enter a valid email address.');
    } else if (error.code === 'auth/weak-password') {
      alert('Password should be at least 6 characters.');
    } else {
      alert('Could not register. Please try again.');
    }
  }
}

// ========================================
// Function: searchBooks
// ========================================

async function searchBooks(query) {
  try {
    const encodedQuery = encodeURIComponent(query);
    const url = `https://openlibrary.org/search.json?q=${encodedQuery}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error('Failed to fetch from OpenLibrary');
    }

    const data = await response.json();

    if (!data.docs || data.docs.length === 0) {
      resultsDiv.innerHTML = '<p class="empty-state">No results found. Try a different search.</p>';
      return;
    }

    // Extract only needed fields from API response
    const books = data.docs.map(doc => ({
      title: doc.title,
      author: doc.author_name?.[0] ?? 'Unknown author',
      year: doc.first_publish_year ?? '—',
      coverId: doc.cover_i ?? null
    }));

    renderResults(books);
  } catch (error) {
    console.error('Search error:', error);
    resultsDiv.innerHTML = '<p class="empty-state">Error searching. Please try again.</p>';
  }
}

// ========================================
// Function: renderResults
// ========================================

function renderResults(books) {
  if (!books || books.length === 0) {
    resultsDiv.innerHTML = '<p class="empty-state">No results to display.</p>';
    return;
  }

  resultsDiv.innerHTML = '';

  books.forEach(book => {
    const article = document.createElement('article');
    article.className = 'book-card';
    article.setAttribute('aria-label', `${book.title} by ${book.author}`);

    const coverUrl = buildCoverUrl(book.coverId);
    const coverElement = coverUrl
      ? `<img src="${coverUrl}" alt="Cover of ${book.title}" class="book-cover">`
      : placeholderEl().outerHTML;

    article.innerHTML = `
      <div class="book-cover-container">
        ${coverElement}
      </div>
      <div class="book-info">
        <h3 class="book-title">${escapeHtml(book.title)}</h3>
        <p class="book-author">by ${escapeHtml(book.author)}</p>
        <p class="book-year">${book.year}</p>
        <div class="book-actions">
          <button class="btn btn-save" data-title="${encodeURIComponent(book.title)}" data-author="${encodeURIComponent(book.author)}" data-year="${book.year}" data-cover-id="${book.coverId || ''}">
            Save
          </button>
        </div>
      </div>
    `;

    // Add click handler to Save button
    const saveBtn = article.querySelector('.btn-save');
    saveBtn.addEventListener('click', async () => {
      await saveBook(book);
      saveBtn.textContent = 'Saved!';
      saveBtn.disabled = true;
      setTimeout(() => {
        saveBtn.textContent = 'Save';
        saveBtn.disabled = false;
      }, 2000);
    });

    resultsDiv.appendChild(article);
  });
}

// ========================================
// Function: saveBook
// ========================================

async function saveBook(book) {
  if (!currentUser) {
    alert('Please sign in to save books and access your reading list.');
    return;
  }

  try {
    const bookData = {
      title: book.title,
      author: book.author,
      year: book.year,
      coverId: book.coverId,
      shelf: 'Want to Read',
      starred: false,
      savedAt: new Date().toISOString()
    };

    await addDoc(getUserCollection(), bookData);
    console.log('Book saved successfully');
    await loadReadingList();
  } catch (error) {
    console.error('Error saving book:', error);
    alert('Failed to save book. Please try again.');
  }
}

// ========================================
// Function: loadReadingList
// ========================================

async function loadReadingList() {
  if (!currentUser) {
    readingListDiv.innerHTML = '<p class="empty-state">Sign in to view your reading list and saved books.</p>';
    bookStats.style.display = 'none';
    return;
  }

  try {
    const snapshot = await getDocs(getUserCollection());
    const books = [];

    snapshot.forEach(doc => {
      books.push({
        id: doc.id,
        ...doc.data()
      });
    });

    renderReadingList(books);
  } catch (error) {
    console.error('Error loading reading list:', error);
    readingListDiv.innerHTML = '<p class="empty-state">Error loading reading list.</p>';
  }
}

async function loadSharedReadingList() {
  if (!sharedUserId) {
    return;
  }

  try {
    const snapshot = await getDocs(getSharedCollection());
    const books = [];

    snapshot.forEach(doc => {
      books.push({
        id: doc.id,
        ...doc.data()
      });
    });

    renderReadingList(books, true);
  } catch (error) {
    console.error('Error loading shared reading list:', error);
    readingListDiv.innerHTML = '<p class="empty-state">Unable to load shared reading list.</p>';
    bookStats.style.display = 'none';
  }
}

// ========================================
// Function: toggleStatus
// ========================================

async function updateBookShelf(docId, newShelf) {
  if (!currentUser) {
    alert('Please sign in to update your reading list.');
    return;
  }

  try {
    const docRef = doc(getUserCollection(), docId);
    await updateDoc(docRef, { shelf: newShelf });
    console.log('Shelf updated successfully');
    await loadReadingList();
  } catch (error) {
    console.error('Error updating shelf:', error);
    alert('Failed to update shelf. Please try again.');
  }
}

// ========================================
// Function: renderReadingList
// ========================================

function renderReadingList(books, readOnly = false) {
  if (!books || books.length === 0) {
    readingListDiv.innerHTML = '<p class="empty-state">📖 Your reading list is empty. Save some books to get started!</p>';
    bookStats.style.display = 'none';
    return;
  }

  updateStats(books);

  const sortBy = localStorage.getItem(SORT_STORAGE_KEY) || 'date-desc';
  const sortedBooks = sortBooks(books, sortBy);

  readingListDiv.innerHTML = '';

  sortedBooks.forEach(book => {
    const article = document.createElement('article');
    article.className = 'book-card';
    article.setAttribute('aria-label', `${book.title} by ${book.author}`);

    const coverUrl = buildCoverUrl(book.coverId);
    const coverElement = coverUrl
      ? `<img src="${coverUrl}" alt="Cover of ${book.title}" class="book-cover">`
      : placeholderEl().outerHTML;

    const statusText = book.shelf || 'Want to Read';
    const favoriteLabel = book.starred ? '<span class="book-fav-label">⭐ Favorite</span>' : '';

    article.innerHTML = `
      <div class="book-cover-container">
        ${coverElement}
      </div>
      <div class="book-info">
        <h3 class="book-title">${escapeHtml(book.title)}</h3>
        <p class="book-author">by ${escapeHtml(book.author)}</p>
        <p class="book-year">${book.year}</p>
        <div class="book-actions" id="actions-${book.id}">
          ${readOnly ? `<span class="book-status">Status: ${escapeHtml(statusText)}</span>${favoriteLabel}` : `
            <select class="shelf-select" data-doc-id="${book.id}" aria-label="Set book status">
              ${DEFAULT_SHELVES.map(s => `<option value="${s}" ${s === book.shelf ? 'selected' : ''}>${s}</option>`).join('')}
            </select>
            <button class="btn-favorite ${book.starred ? 'starred' : ''}" data-doc-id="${book.id}" title="Add to favorites" aria-label="Toggle favorite">
              ${book.starred ? '⭐' : '☆'}
            </button>
            <button class="btn-delete" data-doc-id="${book.id}" title="Delete book" aria-label="Delete book">
              ✕
            </button>
          `}
        </div>
      </div>
    `;

    if (!readOnly) {
      const shelfSelect = article.querySelector('.shelf-select');
      shelfSelect.addEventListener('change', async (e) => {
        await updateBookShelf(book.id, e.target.value);
      });

      const favoriteBtn = article.querySelector('.btn-favorite');
      favoriteBtn.addEventListener('click', async () => {
        await toggleFavorite(book.id, book.starred);
      });

      const deleteBtn = article.querySelector('.btn-delete');
      deleteBtn.addEventListener('click', async () => {
        if (confirm(`Delete "${book.title}"?`)) {
          await deleteBook(book.id);
        }
      });
    }

    readingListDiv.appendChild(article);
  });
}

// ========================================
// Function: deleteBook
// ========================================

async function deleteBook(docId) {
  if (!currentUser) {
    alert('Please sign in to delete books.');
    return;
  }

  try {
    await deleteDoc(doc(getUserCollection(), docId));
    console.log('Book deleted successfully');
    await loadReadingList();
  } catch (error) {
    console.error('Error deleting book:', error);
    alert('Failed to delete book. Please try again.');
  }
}

// ========================================
// Function: toggleFavorite
// ========================================

async function toggleFavorite(docId, currentStarred) {
  if (!currentUser) {
    alert('Please sign in to update favorites.');
    return;
  }

  try {
    const docRef = doc(getUserCollection(), docId);
    await updateDoc(docRef, { starred: !currentStarred });
    console.log('Favorite toggled successfully');
    await loadReadingList();
  } catch (error) {
    console.error('Error toggling favorite:', error);
    alert('Failed to update favorite. Please try again.');
  }
}

// ========================================
// Function: sortBooks
// ========================================

function sortBooks(books, sortBy) {
  const sorted = [...books];
  
  switch (sortBy) {
    case 'title':
      sorted.sort((a, b) => a.title.localeCompare(b.title));
      break;
    case 'author':
      sorted.sort((a, b) => a.author.localeCompare(b.author));
      break;
    case 'date-asc':
      sorted.sort((a, b) => new Date(a.savedAt) - new Date(b.savedAt));
      break;
    case 'date-desc':
    default:
      sorted.sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt));
      break;
  }
  
  return sorted;
}

// ========================================
// Function: updateStats
// ========================================

function updateStats(books) {
  const total = books.length;
  const readCount = books.filter(b => b.shelf === 'Read').length;
  const wantToReadCount = books.filter(b => b.shelf === 'Want to Read').length;
  const favCount = books.filter(b => b.starred).length;

  document.getElementById('totalBooksCount').textContent = total;
  document.getElementById('readCount').textContent = readCount;
  document.getElementById('wantToReadCount').textContent = wantToReadCount;
  document.getElementById('favCount').textContent = favCount;

  bookStats.style.display = 'block';
}

// ========================================
// Function: buildCoverUrl
// ========================================

function buildCoverUrl(coverId) {
  if (!coverId) {
    return null;
  }
  return `https://covers.openlibrary.org/b/id/${coverId}-M.jpg`;
}

// ========================================
// Function: placeholderEl
// ========================================

function placeholderEl() {
  const div = document.createElement('div');
  div.className = 'book-cover-placeholder';
  div.textContent = '📚';
  return div;
}

// ========================================

// ========================================

// ========================================

// ========================================
// Helper: escapeHtml
// Prevents XSS by escaping HTML special characters
// ========================================

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
