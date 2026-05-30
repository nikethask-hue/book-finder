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
const goalInput = document.getElementById('goalInput');
const setGoalBtn = document.getElementById('setGoalBtn');
const goalDisplay = document.getElementById('goalDisplay');
const progressBar = document.getElementById('progressBar');
const goalProgress = document.getElementById('goalProgress');
const shelfInput = document.getElementById('shelfInput');
const createShelfBtn = document.getElementById('createShelfBtn');
const shelvesList = document.getElementById('shelves');
const sortSelect = document.getElementById('sortSelect');
const bookStats = document.getElementById('bookStats');

// Default shelves
const DEFAULT_SHELVES = ['Want to Read', 'Read'];
const SHELVES_STORAGE_KEY = 'bookFinderShelves';
const SORT_STORAGE_KEY = 'bookFinderSort';

// ========================================
// Event Listeners
// ========================================

document.addEventListener('DOMContentLoaded', () => {
  initializeShelves();
  renderShelves();
  loadReadingGoal();
  setupAuthListeners();
});

searchBtn.addEventListener('click', async () => {
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

searchInput.addEventListener('keypress', async (event) => {
  if (event.key === 'Enter') {
    const query = searchInput.value.trim();
    if (query) {
      resultsDiv.innerHTML = '<p class="empty-state">Searching…</p>';
      await searchBooks(query);
    }
  }
});

setGoalBtn.addEventListener('click', () => {
  const target = parseInt(goalInput.value, 10);
  if (target > 0) {
    saveReadingGoal(target);
    goalInput.value = '';
    updateGoalDisplay();
  } else {
    alert('Please enter a number greater than 0');
  }
});

goalInput.addEventListener('keypress', (event) => {
  if (event.key === 'Enter') {
    setGoalBtn.click();
  }
});

createShelfBtn.addEventListener('click', () => {
  const shelfName = shelfInput.value.trim();
  if (shelfName && shelfName.length > 0) {
    addShelf(shelfName);
    shelfInput.value = '';
    renderShelves();
  } else {
    alert('Please enter a shelf name');
  }
});

shelfInput.addEventListener('keypress', (event) => {
  if (event.key === 'Enter') {
    createShelfBtn.click();
  }
});

sortSelect.addEventListener('change', (e) => {
  localStorage.setItem(SORT_STORAGE_KEY, e.target.value);
  loadReadingList();
});

function getUserCollection() {
  if (!currentUser) {
    throw new Error('No authenticated user');
  }
  return collection(db, 'users', currentUser.uid, COLLECTION);
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
}

function setupAuthListeners() {
  onAuthStateChanged(auth, (user) => {
    currentUser = user;
    updateAuthUi(user);
    loadReadingList();
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

function renderReadingList(books) {
  if (!books || books.length === 0) {
    readingListDiv.innerHTML = '<p class="empty-state">📖 Your reading list is empty. Save some books to get started!</p>';
    bookStats.style.display = 'none';
    return;
  }

  // Calculate and display stats
  updateStats(books);

  // Sort books
  const sortBy = localStorage.getItem(SORT_STORAGE_KEY) || 'date-desc';
  const sortedBooks = sortBooks(books, sortBy);

  readingListDiv.innerHTML = '';
  const shelves = getShelves();
  
  // Organize books by shelf
  const booksByShelf = {};
  shelves.forEach(shelf => {
    booksByShelf[shelf] = [];
  });

  sortedBooks.forEach(book => {
    const shelf = book.shelf || 'Want to Read';
    if (!booksByShelf[shelf]) {
      booksByShelf[shelf] = [];
    }
    booksByShelf[shelf].push(book);
  });

  // Render each shelf group
  shelves.forEach(shelf => {
    const shelfBooks = booksByShelf[shelf];
    const shelfGroup = document.createElement('div');
    shelfGroup.className = 'shelf-group';

    const shelfTitle = document.createElement('h3');
    shelfTitle.className = 'shelf-group-title';
    shelfTitle.textContent = shelf;

    shelfGroup.appendChild(shelfTitle);

    if (!shelfBooks || shelfBooks.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'shelf-empty';
      empty.textContent = `No books in "${shelf}" yet`;
      shelfGroup.appendChild(empty);
    } else {
      const booksDiv = document.createElement('div');
      booksDiv.className = 'shelf-group-books';

      shelfBooks.forEach(book => {
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
            <div class="book-actions" id="actions-${book.id}">
              <select class="shelf-select" data-doc-id="${book.id}" aria-label="Move book to shelf">
                ${shelves.map(s => `<option value="${s}" ${s === book.shelf ? 'selected' : ''}>${s}</option>`).join('')}
              </select>
              <button class="btn-favorite ${book.starred ? 'starred' : ''}" data-doc-id="${book.id}" title="Add to favorites" aria-label="Toggle favorite">
                ${book.starred ? '⭐' : '☆'}
              </button>
              <button class="btn-delete" data-doc-id="${book.id}" title="Delete book" aria-label="Delete book">
                ✕
              </button>
            </div>
          </div>
        `;

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

        booksDiv.appendChild(article);
      });

      shelfGroup.appendChild(booksDiv);
    }

    readingListDiv.appendChild(shelfGroup);
  });

  // Update goal display after rendering
  updateGoalDisplay();
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
// Function: initializeShelves
// ========================================

function initializeShelves() {
  const stored = localStorage.getItem(SHELVES_STORAGE_KEY);
  if (!stored) {
    localStorage.setItem(SHELVES_STORAGE_KEY, JSON.stringify(DEFAULT_SHELVES));
  }
}

// ========================================
// Function: getShelves
// ========================================

function getShelves() {
  const stored = localStorage.getItem(SHELVES_STORAGE_KEY);
  return stored ? JSON.parse(stored) : DEFAULT_SHELVES;
}

// ========================================
// Function: addShelf
// ========================================

function addShelf(shelfName) {
  const shelves = getShelves();
  if (!shelves.includes(shelfName)) {
    shelves.push(shelfName);
    localStorage.setItem(SHELVES_STORAGE_KEY, JSON.stringify(shelves));
  }
}

// ========================================
// Function: removeShelf
// ========================================

function removeShelf(shelfName) {
  // Don't allow removing default shelves
  if (DEFAULT_SHELVES.includes(shelfName)) {
    alert('Cannot remove default shelves');
    return;
  }
  const shelves = getShelves();
  const index = shelves.indexOf(shelfName);
  if (index > -1) {
    shelves.splice(index, 1);
    localStorage.setItem(SHELVES_STORAGE_KEY, JSON.stringify(shelves));
    // Move books from removed shelf to "Want to Read"
    moveShelfBooks(shelfName, 'Want to Read');
  }
}

// ========================================
// Function: moveShelfBooks
// ========================================

async function moveShelfBooks(oldShelf, newShelf) {
  if (!currentUser) {
    return;
  }

  try {
    const snapshot = await getDocs(getUserCollection());
    snapshot.forEach(async (docSnap) => {
      if (docSnap.data().shelf === oldShelf) {
        await updateDoc(doc(getUserCollection(), docSnap.id), { shelf: newShelf });
      }
    });
  } catch (error) {
    console.error('Error moving shelf books:', error);
  }
}

// ========================================
// Function: renderShelves
// ========================================

function renderShelves() {
  const shelves = getShelves();
  shelvesList.innerHTML = '';

  shelves.forEach(shelf => {
    const tag = document.createElement('div');
    tag.className = 'shelf-tag';
    if (DEFAULT_SHELVES.includes(shelf)) {
      tag.classList.add('default');
    }
    tag.innerHTML = `
      ${shelf}
      ${!DEFAULT_SHELVES.includes(shelf) ? '<button class="remove-shelf" aria-label="Remove shelf">×</button>' : ''}
    `;

    if (!DEFAULT_SHELVES.includes(shelf)) {
      const removeBtn = tag.querySelector('.remove-shelf');
      removeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (confirm(`Remove shelf "${shelf}"? Books will move to "Want to Read".`)) {
          removeShelf(shelf);
          renderShelves();
          loadReadingList();
        }
      });
    }

    shelvesList.appendChild(tag);
  });
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
// Function: saveReadingGoal
// ========================================

function saveReadingGoal(target) {
  localStorage.setItem('readingGoal', JSON.stringify({ target, setAt: new Date().toISOString() }));
}

// ========================================
// Function: loadReadingGoal
// ========================================

function loadReadingGoal() {
  const goalData = localStorage.getItem('readingGoal');
  if (goalData) {
    updateGoalDisplay();
  }
}

// ========================================
// Function: updateGoalDisplay
// ========================================

function updateGoalDisplay() {
  const goalData = localStorage.getItem('readingGoal');
  if (!goalData) {
    goalDisplay.style.display = 'none';
    return;
  }

  const { target } = JSON.parse(goalData);
  goalDisplay.style.display = 'block';

  // Count books in "Read" shelf
  const readBooks = Array.from(readingListDiv.querySelectorAll('.shelf-select')).filter(select => select.value === 'Read').length;
  const percentage = Math.min((readBooks / target) * 100, 100);

  progressBar.style.width = percentage + '%';
  goalProgress.textContent = `${readBooks} / ${target} books read`;

  // Optional: Add celebration emoji when goal is reached
  if (readBooks >= target) {
    goalProgress.textContent = `🎉 ${readBooks} / ${target} books read - Goal Achieved!`;
  }
}

// ========================================
// Helper: escapeHtml
// Prevents XSS by escaping HTML special characters
// ========================================

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
