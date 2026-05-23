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

// ========================================
// Event Listeners
// ========================================

document.addEventListener('DOMContentLoaded', () => {
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
      status: 'want-to-read',
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

async function toggleStatus(docId, currentStatus) {
  try {
    const newStatus = currentStatus === 'want-to-read' ? 'read' : 'want-to-read';
    const docRef = doc(db, COLLECTION, docId);
    await updateDoc(docRef, { status: newStatus });
    console.log('Status updated successfully');
    await loadReadingList();
  } catch (error) {
    console.error('Error updating status:', error);
    alert('Failed to update status. Please try again.');
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

  books.forEach(book => {
    const article = document.createElement('article');
    article.className = 'book-card';
    article.setAttribute('aria-label', `${book.title} by ${book.author}, status: ${book.status}`);

    const coverUrl = buildCoverUrl(book.coverId);
    const coverElement = coverUrl
      ? `<img src="${coverUrl}" alt="Cover of ${book.title}" class="book-cover">`
      : placeholderEl().outerHTML;

    const statusLabel = book.status === 'want-to-read' ? 'Want to Read' : 'Read';
    const statusClass = book.status;

    article.innerHTML = `
      <div class="book-cover-container">
        ${coverElement}
      </div>
      <div class="book-info">
        <h3 class="book-title">${escapeHtml(book.title)}</h3>
        <p class="book-author">by ${escapeHtml(book.author)}</p>
        <p class="book-year">${book.year}</p>
        <div class="book-actions">
          <button class="btn status-badge ${statusClass}" data-doc-id="${book.id}" data-status="${book.status}">
            ${statusLabel}
          </button>
        </div>
      </div>
    `;

    // Add click handler to status button
    const statusBtn = article.querySelector('.status-badge');
    statusBtn.addEventListener('click', async () => {
      await toggleStatus(book.id, book.status);
    });

    readingListDiv.appendChild(article);
  });

  // Update goal display after rendering
  updateGoalDisplay();
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

  // Count books with status "read"
  const readBooks = Array.from(readingListDiv.querySelectorAll('.status-badge.read')).length;
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
