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
  doc
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

// Import Firebase config
import { firebaseConfig } from './firebase-config.js';

// ========================================
// Firebase Initialization
// ========================================

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

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
const goalInput = document.getElementById('goalInput');
const setGoalBtn = document.getElementById('setGoalBtn');
const goalDisplay = document.getElementById('goalDisplay');
const progressBar = document.getElementById('progressBar');
const goalProgress = document.getElementById('goalProgress');
const shelfInput = document.getElementById('shelfInput');
const createShelfBtn = document.getElementById('createShelfBtn');
const shelvesList = document.getElementById('shelves');

// Default shelves
const DEFAULT_SHELVES = ['Want to Read', 'Read'];
const SHELVES_STORAGE_KEY = 'bookFinderShelves';

// ========================================
// Event Listeners
// ========================================

document.addEventListener('DOMContentLoaded', () => {
  // Initialize shelves
  initializeShelves();
  // Load and render shelves
  renderShelves();
  // Load reading list on page load
  loadReadingList();
  // Load reading goal from localStorage
  loadReadingGoal();
});

searchBtn.addEventListener('click', async () => {
  const query = searchInput.value.trim();
  if (query) {
    resultsDiv.innerHTML = '<p class="empty-state">Searching…</p>';
    await searchBooks(query);
  }
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
  try {
    const bookData = {
      title: book.title,
      author: book.author,
      year: book.year,
      coverId: book.coverId,
      shelf: 'Want to Read',
      savedAt: new Date().toISOString()
    };

    await addDoc(collection(db, COLLECTION), bookData);
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
  try {
    const snapshot = await getDocs(collection(db, COLLECTION));
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
  try {
    const docRef = doc(db, COLLECTION, docId);
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
    return;
  }

  readingListDiv.innerHTML = '';
  const shelves = getShelves();
  
  // Organize books by shelf
  const booksByShelf = {};
  shelves.forEach(shelf => {
    booksByShelf[shelf] = [];
  });

  books.forEach(book => {
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
            </div>
          </div>
        `;

        const shelfSelect = article.querySelector('.shelf-select');
        shelfSelect.addEventListener('change', async (e) => {
          await updateBookShelf(book.id, e.target.value);
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
  try {
    const snapshot = await getDocs(collection(db, COLLECTION));
    snapshot.forEach(async (docSnap) => {
      if (docSnap.data().shelf === oldShelf) {
        await updateDoc(doc(db, COLLECTION, docSnap.id), { shelf: newShelf });
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
