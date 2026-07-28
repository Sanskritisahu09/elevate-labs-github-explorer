// State Management
let starsChartInstance = null;
let languageChartInstance = null;
let currentView = 'all'; // 'all' or 'bookmarks'
let lastFetchedRepos = [];

// Initialize LocalStorage for Bookmarks
function getBookmarks() {
    return JSON.parse(localStorage.getItem('github_explorer_bookmarks') || '[]');
}

function saveBookmarks(bookmarks) {
    localStorage.setItem('github_explorer_bookmarks', JSON.stringify(bookmarks));
    updateBookmarkCount();
}

function updateBookmarkCount() {
    const count = getBookmarks().length;
    document.getElementById('bookmark-count').textContent = count;
}

// DOM Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    updateBookmarkCount();
    fetchGitHubRepos('react');

    document.getElementById('search-btn').addEventListener('click', () => {
        const query = document.getElementById('search-input').value.trim();
        if (query) fetchGitHubRepos(query);
    });

    document.getElementById('search-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const query = e.target.value.trim();
            if (query) fetchGitHubRepos(query);
        }
    });

    // Tab Switchers
    document.getElementById('tab-all').addEventListener('click', (e) => {
        currentView = 'all';
        e.target.className = 'text-sm font-semibold text-indigo-400 border-b-2 border-indigo-500 pb-3 -mb-3 transition';
        document.getElementById('tab-bookmarks').className = 'text-sm font-semibold text-slate-400 hover:text-slate-200 pb-3 -mb-3 transition flex items-center gap-2';
        renderRepoCards(lastFetchedRepos);
    });

    document.getElementById('tab-bookmarks').addEventListener('click', (e) => {
        currentView = 'bookmarks';
        e.target.className = 'text-sm font-semibold text-indigo-400 border-b-2 border-indigo-500 pb-3 -mb-3 transition flex items-center gap-2';
        document.getElementById('tab-all').className = 'text-sm font-semibold text-slate-400 hover:text-slate-200 pb-3 -mb-3 transition';
        renderRepoCards(getBookmarks());
    });
});

// Fetch Logic
async function fetchGitHubRepos(topic) {
    const language = document.getElementById('language-filter').value;
    const sort = document.getElementById('sort-filter').value;
    const repoGrid = document.getElementById('repo-grid');
    
    // Skeleton Loading Indicator
    repoGrid.innerHTML = Array(6).fill(0).map(() => `
        <div class="bg-slate-900 border border-slate-800 rounded-2xl p-5 animate-pulse space-y-4">
            <div class="h-4 bg-slate-800 rounded w-1/3"></div>
            <div class="h-6 bg-slate-800 rounded w-3/4"></div>
            <div class="h-12 bg-slate-800 rounded w-full"></div>
        </div>
    `).join('');

    let queryUrl = `https://api.github.com/search/repositories?q=${encodeURIComponent(topic)}`;
    if (language) queryUrl += `+language:${encodeURIComponent(language)}`;
    queryUrl += `&sort=${sort}&order=desc&per_page=12`;

    try {
        const response = await fetch(queryUrl);
        
        // Rate Limit Handling
        const remaining = response.headers.get('X-RateLimit-Remaining');
        if (remaining !== null) {
            document.getElementById('rate-limit-badge').textContent = `API Limit: ${remaining}/60`;
        }

        if (!response.ok) {
            if (response.status === 403) throw new Error('API Rate limit exceeded. Please wait a minute.');
            throw new Error('Failed to fetch data from GitHub API.');
        }
        
        const data = await response.json();
        lastFetchedRepos = data.items;
        
        if (currentView === 'all') {
            renderRepoCards(lastFetchedRepos);
            renderCharts(lastFetchedRepos);
        }
    } catch (error) {
        repoGrid.innerHTML = `
            <div class="col-span-full bg-red-500/10 border border-red-500/20 text-red-400 p-6 rounded-2xl text-center">
                <p class="font-semibold">${error.message}</p>
            </div>`;
    }
}

// Render Repository Cards
function renderRepoCards(repos) {
    const repoGrid = document.getElementById('repo-grid');
    repoGrid.innerHTML = '';

    if (!repos || repos.length === 0) {
        repoGrid.innerHTML = `
            <div class="col-span-full text-center py-16 text-slate-500">
                <p>No repositories available in this view.</p>
            </div>`;
        return;
    }

    const bookmarks = getBookmarks();

    repos.forEach(repo => {
        const isBookmarked = bookmarks.some(b => b.id === repo.id);
        const card = document.createElement('div');
        card.className = 'bg-slate-900 border border-slate-800 hover:border-slate-700/80 rounded-2xl p-5 flex flex-col justify-between transition duration-200 shadow-lg hover:shadow-xl';
        
        card.innerHTML = `
            <div>
                <div class="flex items-center justify-between mb-3">
                    <span class="text-xs font-mono font-medium px-2.5 py-1 rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                        ${repo.language || 'Plain Text'}
                    </span>
                    <button class="bookmark-btn text-xs text-slate-400 hover:text-amber-400 transition" data-id="${repo.id}">
                        ${isBookmarked ? '★ Saved' : '☆ Bookmark'}
                    </button>
                </div>
                <h3 class="font-bold text-slate-100 text-base mb-2 truncate" title="${repo.name}">${repo.name}</h3>
                <p class="text-xs text-slate-400 line-clamp-2 mb-4 h-8">${repo.description || 'No description available for this repository.'}</p>
            </div>
            
            <div class="pt-4 border-t border-slate-800/80 space-y-3">
                <div class="flex items-center justify-between text-xs text-slate-400">
                    <span>★ ${repo.stargazers_count.toLocaleString()}</span>
                    <span>⑂ ${repo.forks_count.toLocaleString()}</span>
                    <span>Updated ${new Date(repo.updated_at).toLocaleDateString()}</span>
                </div>
                <a href="${repo.html_url}" target="_blank" class="block text-center w-full bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold py-2 rounded-lg transition border border-slate-700/50">
                    View on GitHub ↗
                </a>
            </div>
        `;

        // Handle Bookmark Click
        card.querySelector('.bookmark-btn').addEventListener('click', () => toggleBookmark(repo));
        repoGrid.appendChild(card);
    });
}

function toggleBookmark(repo) {
    let bookmarks = getBookmarks();
    const index = bookmarks.findIndex(b => b.id === repo.id);

    if (index > -1) {
        bookmarks.splice(index, 1);
    } else {
        bookmarks.push(repo);
    }

    saveBookmarks(bookmarks);
    renderRepoCards(currentView === 'all' ? lastFetchedRepos : getBookmarks());
}

// Chart Visualizations
function renderCharts(repos) {
    if (!repos || repos.length === 0) return;

    const top10 = repos.slice(0, 10);
    const labels = top10.map(r => r.name.length > 10 ? r.name.substring(0, 10) + '..' : r.name);
    const stars = top10.map(r => r.stargazers_count);

    // Language Distribution Processing
    const langCounts = {};
    repos.forEach(r => {
        if (r.language) {
            langCounts[r.language] = (langCounts[r.language] || 0) + 1;
        }
    });

    // 1. Stars Bar Chart
    const ctxStars = document.getElementById('starsChart').getContext('2d');
    if (starsChartInstance) starsChartInstance.destroy();
    
    starsChartInstance = new Chart(ctxStars, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Stars',
                data: stars,
                backgroundColor: '#6366f1',
                borderRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { ticks: { color: '#64748b', font: { size: 10 } }, grid: { display: false } },
                y: { ticks: { color: '#64748b', font: { size: 10 } }, grid: { color: '#1e293b' } }
            }
        }
    });

    // 2. Language Doughnut Chart
    const ctxLang = document.getElementById('languageChart').getContext('2d');
    if (languageChartInstance) languageChartInstance.destroy();

    languageChartInstance = new Chart(ctxLang, {
        type: 'doughnut',
        data: {
            labels: Object.keys(langCounts),
            datasets: [{
                data: Object.values(langCounts),
                backgroundColor: ['#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom', labels: { color: '#94a3b8', font: { size: 10 } } }
            }
        }
    });
}