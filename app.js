let chartInstance = null;

document.addEventListener('DOMContentLoaded', () => {
    // Initial Fetch on Load
    fetchGitHubRepos('react');

    document.getElementById('search-btn').addEventListener('click', () => {
        const query = document.getElementById('search-input').value.trim();
        if (query) fetchGitHubRepos(query);
    });
});

async function fetchGitHubRepos(topic) {
    const language = document.getElementById('language-filter').value;
    const repoGrid = document.getElementById('repo-grid');
    
    // UI Feedback State
    repoGrid.innerHTML = `<p class="col-span-full text-center text-slate-500 py-12">Fetching GitHub data...</p>`;

    let queryUrl = `https://api.github.com/search/repositories?q=${encodeURIComponent(topic)}`;
    if (language) {
        queryUrl += `+language:${encodeURIComponent(language)}`;
    }
    queryUrl += `&sort=stars&order=desc&per_page=10`;

    try {
        const response = await fetch(queryUrl);
        if (!response.ok) throw new Error('API Rate Limit or Network Error');
        
        const data = await response.json();
        renderRepoCards(data.items);
        renderChart(data.items);
    } catch (error) {
        repoGrid.innerHTML = `<p class="col-span-full text-center text-red-400 py-12">${error.message}. Try again in a minute.</p>`;
    }
}

function renderRepoCards(repos) {
    const repoGrid = document.getElementById('repo-grid');
    repoGrid.innerHTML = '';

    if (!repos || repos.length === 0) {
        repoGrid.innerHTML = `<p class="col-span-full text-center text-slate-500 py-12">No repositories found.</p>`;
        return;
    }

    repos.forEach(repo => {
        const card = document.createElement('div');
        card.className = 'bg-slate-800 border border-slate-700/60 rounded-xl p-5 flex flex-col justify-between hover:border-slate-600 transition';
        card.innerHTML = `
            <div>
                <div class="flex items-center justify-between mb-3">
                    <span class="text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                        ${repo.language || 'Code'}
                    </span>
                    <span class="text-xs text-slate-400">★ ${repo.stargazers_count.toLocaleString()}</span>
                </div>
                <h3 class="font-bold text-slate-100 text-base mb-2 truncate">${repo.name}</h3>
                <p class="text-xs text-slate-400 line-clamp-2 mb-4">${repo.description || 'No description provided.'}</p>
            </div>
            <div class="flex items-center justify-between pt-4 border-t border-slate-700/50">
                <span class="text-xs text-slate-500">Forks: ${repo.forks_count}</span>
                <a href="${repo.html_url}" target="_blank" class="text-xs text-indigo-400 hover:underline font-medium">View Repo →</a>
            </div>
        `;
        repoGrid.appendChild(card);
    });
}

function renderChart(repos) {
    const ctx = document.getElementById('starsChart').getContext('2d');

    const labels = repos.map(r => r.name.length > 12 ? r.name.substring(0, 10) + '..' : r.name);
    const stars = repos.map(r => r.stargazers_count);

    if (chartInstance) {
        chartInstance.destroy(); // Clear existing canvas context before re-render
    }

    chartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Stars',
                data: stars,
                backgroundColor: '#6366f1',
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                x: {
                    ticks: { color: '#94a3b8', font: { size: 10 } },
                    grid: { display: false }
                },
                y: {
                    ticks: { color: '#94a3b8', font: { size: 10 } },
                    grid: { color: '#334155' }
                }
            }
        }
    });
}