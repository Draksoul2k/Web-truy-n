// Global App State
let selectedManga = null; // Truyện đang xem chi tiết (đầy đủ thông tin)
let currentChapterIndex = null; // Chỉ mục chương đang đọc
let bookmarks = JSON.parse(localStorage.getItem('mp_bookmarks_full')) || []; // Lưu full object truyện
let readingHistory = JSON.parse(localStorage.getItem('mp_history_full')) || []; // Lưu lịch sử đọc kèm thông tin truyện
let currentChapterRawImages = []; // Cache lưu danh sách ảnh gốc của chương đang đọc
let blockedHashes = JSON.parse(localStorage.getItem('mp_blocked_hashes')) || []; // Lưu danh sách mã băm ảnh QC bị chặn

// DOM Elements
const elements = {
  headerLogo: document.getElementById('header-logo'),
  navHome: document.getElementById('nav-home'),
  navBookmarks: document.getElementById('nav-bookmarks'),
  navHistory: document.getElementById('nav-history'),
  
  // Search bar
  globalSearchInput: document.getElementById('global-search-input'),
  globalSearchBtn: document.getElementById('global-search-btn'),
  
  homeContainer: document.getElementById('home-container'),
  mangaGridSection: document.getElementById('manga-grid-section'),
  gridTitle: document.getElementById('grid-title'),
  mangasListGrid: document.getElementById('mangas-list-grid'),
  btnBackToGrid: document.getElementById('btn-back-to-grid'),
  
  // Sidebar
  rankingListContainer: document.getElementById('ranking-list-container'),
  tabBtns: document.querySelectorAll('.tab-btn'),
  
  mangaDetailSection: document.getElementById('manga-detail-section'),
  chaptersSection: document.getElementById('chapters-section'),
  customViewSection: document.getElementById('custom-view-section'),
  
  heroBg: document.getElementById('hero-bg'),
  mangaCoverImg: document.getElementById('manga-cover-img'),
  mangaTitleText: document.getElementById('manga-title-text'),
  mangaAuthor: document.getElementById('manga-author'),
  mangaStatus: document.getElementById('manga-status'),
  mangaViews: document.getElementById('manga-views'),
  mangaFollows: document.getElementById('manga-follows'),
  mangaDescText: document.getElementById('manga-desc-text'),
  btnToggleDesc: document.getElementById('btn-toggle-desc'),
  
  btnReadFirst: document.getElementById('btn-read-first'),
  btnReadLast: document.getElementById('btn-read-last'),
  btnBookmark: document.getElementById('btn-bookmark'),
  
  chaptersCount: document.getElementById('chapters-count'),
  searchChapterInput: document.getElementById('search-chapter-input'),
  chaptersListGrid: document.getElementById('chapters-list-grid'),
  
  customViewTitle: document.getElementById('custom-view-title'),
  customViewContent: document.getElementById('custom-view-content'),
  
  mangaReaderSection: document.getElementById('manga-reader-section'),
  readerNavControls: document.getElementById('reader-nav-controls'),
  readerBtnHome: document.getElementById('reader-btn-home'),
  readerBtnPrev: document.getElementById('reader-btn-prev'),
  readerBtnNext: document.getElementById('reader-btn-next'),
  readerChapterDropdown: document.getElementById('reader-chapter-dropdown'),
  readerBtnBookmark: document.getElementById('reader-btn-bookmark'),
  readerImageStack: document.getElementById('reader-image-stack'),
  
  readerBottomBtnPrev: document.getElementById('reader-bottom-btn-prev'),
  readerBottomBtnNext: document.getElementById('reader-bottom-btn-next'),
  btnBackToTop: document.getElementById('btn-back-to-top'),
  footer: document.querySelector('footer'),
  
  // Cài đặt lọc QC trình đọc
  readerBtnSettings: document.getElementById('reader-btn-settings'),
  readerSettingsMenu: document.getElementById('reader-settings-menu'),
  chkSkipFirst: document.getElementById('chk-skip-first'),
  chkSkipFirstTwo: document.getElementById('chk-skip-first-two'),
  chkSkipLast: document.getElementById('chk-skip-last')
};

// 1. Core Startup Actions
window.addEventListener('DOMContentLoaded', () => {
  // Load settings checkbox states (mặc định là false để tránh mất trang gốc nếu người dùng chưa bật)
  elements.chkSkipFirst.checked = localStorage.getItem('mp_skip_first') === 'true';
  elements.chkSkipFirstTwo.checked = localStorage.getItem('mp_skip_first_two') === 'true';
  elements.chkSkipLast.checked = localStorage.getItem('mp_skip_last') === 'true';

  loadHomeMangas();
  loadTopRankings('day');
  setupEventListeners();
});

// Setup event listeners
function setupEventListeners() {
  // Navigation Links
  elements.navHome.onclick = (e) => {
    e.preventDefault();
    elements.globalSearchInput.value = '';
    elements.gridTitle.innerHTML = `<i class="fa-solid fa-clock-rotate-left"></i> Mới Cập Nhật`;
    selectedManga = null;
    loadHomeMangas();
    showSection('home');
  };
  
  elements.headerLogo.onclick = (e) => {
    e.preventDefault();
    elements.globalSearchInput.value = '';
    elements.gridTitle.innerHTML = `<i class="fa-solid fa-clock-rotate-left"></i> Mới Cập Nhật`;
    selectedManga = null;
    loadHomeMangas();
    showSection('home');
  };
  
  elements.navBookmarks.onclick = (e) => { e.preventDefault(); showSection('bookmarks'); };
  elements.navHistory.onclick = (e) => { e.preventDefault(); showSection('history'); };
  
  // Search Bar Action
  elements.globalSearchBtn.onclick = triggerSearch;
  elements.globalSearchInput.onkeydown = (e) => {
    if (e.key === 'Enter') triggerSearch();
  };
  
  // Sidebar Ranking Tabs
  elements.tabBtns.forEach(btn => {
    btn.onclick = (e) => {
      elements.tabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const rankType = btn.getAttribute('data-type');
      loadTopRankings(rankType);
    };
  });
  
  // Back to Home Grid
  elements.btnBackToGrid.onclick = () => {
    selectedManga = null;
    elements.mangaGridSection.style.display = 'block';
    elements.btnBackToGrid.style.display = 'none';
    elements.mangaDetailSection.style.display = 'none';
    elements.chaptersSection.style.display = 'none';
    window.scrollTo({ top: 0 });
  };
  
  // Toggle Synopsis Description
  elements.btnToggleDesc.onclick = () => {
    const isExpanded = elements.mangaDescText.classList.toggle('expanded');
    elements.btnToggleDesc.innerHTML = isExpanded 
      ? `Thu gọn <i class="fa-solid fa-chevron-up"></i>` 
      : `Xem thêm <i class="fa-solid fa-chevron-down"></i>`;
  };
  
  // Bookmark button
  elements.btnBookmark.onclick = toggleBookmark;
  elements.readerBtnBookmark.onclick = toggleBookmark;
  
  // Toggle settings menu
  elements.readerBtnSettings.onclick = (e) => {
    e.stopPropagation();
    const isHidden = elements.readerSettingsMenu.style.display === 'none';
    elements.readerSettingsMenu.style.display = isHidden ? 'block' : 'none';
  };
  
  // Close menu when clicking outside
  document.addEventListener('click', (e) => {
    if (elements.readerSettingsMenu.style.display !== 'none' && 
        !elements.readerSettingsMenu.contains(e.target) && 
        e.target !== elements.readerBtnSettings && 
        !elements.readerBtnSettings.contains(e.target)) {
      elements.readerSettingsMenu.style.display = 'none';
    }
  });
  
  // Settings changes
  elements.chkSkipFirst.onchange = () => {
    if (elements.chkSkipFirst.checked) {
      elements.chkSkipFirstTwo.checked = false;
    }
    saveSettingsAndReRender();
  };
  elements.chkSkipFirstTwo.onchange = () => {
    if (elements.chkSkipFirstTwo.checked) {
      elements.chkSkipFirst.checked = false;
    }
    saveSettingsAndReRender();
  };
  elements.chkSkipLast.onchange = () => {
    saveSettingsAndReRender();
  };
}

function saveSettingsAndReRender() {
  localStorage.setItem('mp_skip_first', elements.chkSkipFirst.checked);
  localStorage.setItem('mp_skip_first_two', elements.chkSkipFirstTwo.checked);
  localStorage.setItem('mp_skip_last', elements.chkSkipLast.checked);
  
  if (currentChapterIndex !== null && selectedManga && currentChapterRawImages.length > 0) {
    renderChapterImages(currentChapterRawImages, selectedManga.chapters[currentChapterIndex].chapter_name);
  }
}

// 2. Fetch Newly Updated list (Home mangas)
async function loadHomeMangas() {
  elements.mangasListGrid.innerHTML = `
    <div style="grid-column: 1/-1; text-align: center; padding: 5rem 0; color: var(--text-muted);">
      <div class="spinner" style="position: relative; margin: 0 auto 1rem;"></div>
      <p>Đang tải danh sách truyện mới cập nhật...</p>
    </div>
  `;
  
  try {
    const response = await fetch('/api/home-mangas');
    if (!response.ok) throw new Error("Không thể tải danh sách trang chủ.");
    const mangas = await response.json();
    renderMangasGrid(mangas);
  } catch (error) {
    console.error("Lỗi:", error);
    elements.mangasListGrid.innerHTML = `
      <div class="empty-state" style="grid-column: 1/-1;">
        <i class="fa-solid fa-triangle-exclamation" style="color: #ff6b35;"></i>
        <h3>Lỗi kết nối máy chủ truyện</h3>
        <p>Vui lòng kiểm tra xem máy chủ python có đang chạy ẩn hay không.</p>
      </div>
    `;
  }
}

// Render list of mangas in main grid
function renderMangasGrid(mangaList) {
  if (!mangaList || mangaList.length === 0) {
    elements.mangasListGrid.innerHTML = `
      <div class="empty-state" style="grid-column: 1/-1;">
        <i class="fa-solid fa-circle-exclamation"></i>
        <h3>Không tìm thấy truyện nào</h3>
        <p>Thử tìm kiếm với từ khóa khác.</p>
      </div>
    `;
    return;
  }
  
  elements.mangasListGrid.innerHTML = mangaList.map((manga) => {
    return `
      <div class="manga-grid-card" onclick="selectMangaBySlug('${manga.slug}')">
        <div class="manga-grid-card-cover">
          <img src="/proxy?url=${encodeURIComponent(manga.cover_image)}" alt="${manga.title}" loading="lazy">
        </div>
        <div class="manga-grid-card-title">${manga.title}</div>
        <div class="manga-grid-card-info">
          <span class="manga-grid-card-chap">${manga.last_chapter || 'Chap mới'}</span>
          <span><i class="fa-solid fa-eye"></i> ${manga.views || '100K'}</span>
        </div>
      </div>
    `;
  }).join('');
}

// 3. Leaderboards Logic
async function loadTopRankings(type) {
  elements.rankingListContainer.innerHTML = `
    <div style="text-align: center; padding: 2rem 0; color: var(--text-muted);">
      <div class="spinner" style="position: relative; margin: 0 auto 0.5rem; width: 30px; height: 30px;"></div>
    </div>
  `;
  
  try {
    const response = await fetch(`/api/top-mangas?type=${type}`);
    if (!response.ok) throw new Error("Không thể tải bảng xếp hạng.");
    const mangas = await response.json();
    renderRankings(mangas);
  } catch (error) {
    console.error("Lỗi:", error);
    elements.rankingListContainer.innerHTML = `<p style="text-align: center; font-size: 0.8rem; color: var(--text-muted);">Lỗi tải bảng xếp hạng.</p>`;
  }
}

function renderRankings(mangas) {
  if (!mangas || mangas.length === 0) {
    elements.rankingListContainer.innerHTML = `<p style="text-align: center; font-size: 0.8rem; color: var(--text-muted);">Không có dữ liệu xếp hạng.</p>`;
    return;
  }
  
  elements.rankingListContainer.innerHTML = mangas.map((manga, index) => {
    const rankClass = index === 0 ? 'top-1' : index === 1 ? 'top-2' : index === 2 ? 'top-3' : '';
    return `
      <div class="ranking-item" onclick="selectMangaBySlug('${manga.slug}')">
        <div class="rank-number ${rankClass}">${index + 1}</div>
        <div class="rank-cover">
          <img src="/proxy?url=${encodeURIComponent(manga.cover_image)}" alt="${manga.title}" loading="lazy">
        </div>
        <div class="rank-info">
          <div class="rank-title">${manga.title}</div>
          <div class="rank-meta">
            <span class="rank-chap">${manga.last_chapter || 'Chap mới'}</span>
            <span><i class="fa-solid fa-eye"></i> ${manga.views || '100K'}</span>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// 4. Global Search Logic
async function triggerSearch() {
  const query = elements.globalSearchInput.value.trim();
  if (!query) return;
  
  showSection('home');
  selectedManga = null;
  
  elements.gridTitle.innerHTML = `<i class="fa-solid fa-magnifying-glass"></i> Kết Quả Tìm Kiếm: "${query}"`;
  elements.mangasListGrid.innerHTML = `
    <div style="grid-column: 1/-1; text-align: center; padding: 5rem 0; color: var(--text-muted);">
      <div class="spinner" style="position: relative; margin: 0 auto 1rem;"></div>
      <p>Đang tìm kiếm truyện tranh...</p>
    </div>
  `;
  
  try {
    const response = await fetch(`/api/search-manga?q=${encodeURIComponent(query)}`);
    if (!response.ok) throw new Error("Lỗi tìm kiếm.");
    const mangas = await response.json();
    renderMangasGrid(mangas);
  } catch (error) {
    console.error("Lỗi:", error);
    elements.mangasListGrid.innerHTML = `
      <div class="empty-state" style="grid-column: 1/-1;">
        <i class="fa-solid fa-circle-exclamation"></i>
        <h3>Lỗi kết quả tìm kiếm</h3>
        <p>Vui lòng thử lại sau.</p>
      </div>
    `;
  }
}

// 5. Select Manga and Fetch details dynamically
async function selectMangaBySlug(slug) {
  // Hide home sections, display details
  elements.mangaGridSection.style.display = 'none';
  elements.btnBackToGrid.style.display = 'inline-flex';
  elements.mangaDetailSection.style.display = 'grid';
  elements.chaptersSection.style.display = 'block';
  
  // Show Loading States in detail panel
  elements.mangaTitleText.textContent = "Đang tải dữ liệu truyện...";
  elements.mangaCoverImg.src = "";
  elements.heroBg.style.backgroundImage = "none";
  elements.mangaDescText.textContent = "";
  elements.mangaAuthor.textContent = "...";
  elements.mangaStatus.textContent = "...";
  elements.mangaViews.textContent = "...";
  elements.mangaFollows.textContent = "...";
  elements.chaptersCount.textContent = "0";
  elements.chaptersListGrid.innerHTML = `
    <div style="grid-column: 1/-1; text-align: center; padding: 4rem 0; color: var(--text-muted);">
      <div class="spinner" style="position: relative; margin: 0 auto 1rem;"></div>
      <p>Đang tải danh sách chương truyện từ nguồn...</p>
    </div>
  `;
  
  window.scrollTo({ top: 0 });
  
  try {
    const response = await fetch(`/api/manga-details?slug=${slug}`);
    if (!response.ok) throw new Error("Không thể lấy chi tiết truyện.");
    const manga = await response.json();
    
    selectedManga = manga;
    initMangaDetailPage();
  } catch (error) {
    console.error("Lỗi:", error);
    elements.mangaTitleText.textContent = "Lỗi tải chi tiết truyện tranh";
    elements.chaptersListGrid.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: var(--text-muted);">Lỗi không tải được chương truyện.</p>`;
  }
}

// Bind detail page widgets
function initMangaDetailPage() {
  if (!selectedManga) return;
  
  elements.mangaTitleText.textContent = selectedManga.title;
  elements.mangaCoverImg.src = `/proxy?url=${encodeURIComponent(selectedManga.cover_image)}`;
  elements.heroBg.style.backgroundImage = `url('/proxy?url=${encodeURIComponent(selectedManga.cover_image)}')`;
  elements.mangaDescText.textContent = selectedManga.description || "Chưa có mô tả nội dung.";
  
  elements.mangaAuthor.textContent = selectedManga.author || "Cập nhật";
  elements.mangaStatus.textContent = selectedManga.status || "Đang tiến hành";
  elements.mangaViews.textContent = selectedManga.views || "100K";
  elements.mangaFollows.textContent = selectedManga.follows || "10K";
  
  const totalChapters = selectedManga.chapters.length;
  elements.chaptersCount.textContent = totalChapters;
  
  // Bookmarks Button Status
  updateBookmarkButton();
  
  // Render chapters grid
  renderChaptersList(selectedManga.chapters);
  
  // Update Dropdown elements in Reader
  elements.readerChapterDropdown.innerHTML = selectedManga.chapters.map((chap, idx) => `
    <option value="${idx}">${chap.chapter_name}</option>
  `).join('');
  
  // Bind actions
  elements.btnReadFirst.onclick = () => openReader(0);
  elements.btnReadLast.onclick = () => openReader(totalChapters - 1);
  
  // Check if there is history for "Đọc tiếp"
  const lastRead = readingHistory.find(h => h.slug === selectedManga.slug);
  if (lastRead) {
    const idx = selectedManga.chapters.findIndex(c => c.chapter_slug === lastRead.chapterSlug);
    if (idx !== -1) {
      elements.btnReadFirst.innerHTML = `<i class="fa-solid fa-play"></i> Đọc tiếp (${selectedManga.chapters[idx].chapter_name})`;
      elements.btnReadFirst.onclick = () => openReader(idx);
    } else {
      elements.btnReadFirst.innerHTML = `<i class="fa-solid fa-play"></i> Đọc từ đầu (Chap 0)`;
    }
  } else {
    elements.btnReadFirst.innerHTML = `<i class="fa-solid fa-play"></i> Đọc từ đầu (Chap 0)`;
  }
}

// Render Chapters list
function renderChaptersList(chaptersList) {
  if (!chaptersList || chaptersList.length === 0) {
    elements.chaptersListGrid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--text-muted);">Không tìm thấy chương nào.</p>';
    return;
  }
  
  const reversedList = [...chaptersList].reverse();
  
  elements.chaptersListGrid.innerHTML = reversedList.map((chap) => {
    const origIndex = selectedManga.chapters.findIndex(c => c.chapter_slug === chap.chapter_slug);
    return `
      <div class="chapter-card" onclick="openReader(${origIndex})">
        <div>
          <div class="chapter-name">${chap.chapter_name}</div>
          <div class="chapter-date">Nhấp để đọc ngay</div>
        </div>
        <i class="fa-solid fa-chevron-right"></i>
      </div>
    `;
  }).join('');
}

// Filter chapters dynamically as user types
elements.searchChapterInput.addEventListener('input', (e) => {
  const query = e.target.value.toLowerCase().trim();
  if (!selectedManga) return;
  
  const filtered = selectedManga.chapters.filter(chap => 
    chap.chapter_name.toLowerCase().includes(query) || 
    chap.chapter_num.toString().includes(query)
  );
  
  renderChaptersList(filtered);
});

// Bookmarks (Theo Dõi) actions
function updateBookmarkButton() {
  if (!selectedManga) return;
  const isBookmarked = bookmarks.some(b => b.slug === selectedManga.slug);
  if (isBookmarked) {
    elements.btnBookmark.innerHTML = `<i class="fa-solid fa-bookmark"></i> Đã theo dõi`;
    elements.btnBookmark.classList.add('btn-primary');
    elements.btnBookmark.classList.remove('btn-secondary');
    elements.readerBtnBookmark.innerHTML = `<i class="fa-solid fa-bookmark"></i>`;
    elements.readerBtnBookmark.style.color = "var(--accent-color)";
  } else {
    elements.btnBookmark.innerHTML = `<i class="fa-regular fa-bookmark"></i> Theo dõi truyện`;
    elements.btnBookmark.classList.remove('btn-primary');
    elements.btnBookmark.classList.add('btn-secondary');
    elements.readerBtnBookmark.innerHTML = `<i class="fa-regular fa-bookmark"></i>`;
    elements.readerBtnBookmark.style.color = "inherit";
  }
}

function toggleBookmark() {
  if (!selectedManga) return;
  const index = bookmarks.findIndex(b => b.slug === selectedManga.slug);
  if (index === -1) {
    // Save full info of the manga
    bookmarks.push({
      slug: selectedManga.slug,
      title: selectedManga.title,
      cover_image: selectedManga.cover_image,
      last_chapter: selectedManga.chapters.length > 0 ? selectedManga.chapters[selectedManga.chapters.length - 1].chapter_name : 'Chap mới'
    });
  } else {
    bookmarks.splice(index, 1);
  }
  localStorage.setItem('mp_bookmarks_full', JSON.stringify(bookmarks));
  updateBookmarkButton();
  
  if (elements.customViewSection.style.display !== 'none' && elements.customViewTitle.textContent.includes('theo dõi')) {
    renderBookmarksView();
  }
}

// Sections Navigation (Trang chủ / Bookmark / Lịch sử)
function showSection(section) {
  elements.homeContainer.style.display = section === 'reader' ? 'none' : 'block';
  elements.mangaReaderSection.style.display = section === 'reader' ? 'block' : 'none';
  elements.footer.style.display = section === 'reader' ? 'none' : 'block';
  
  if (section === 'home') {
    if (selectedManga) {
      elements.mangaGridSection.style.display = 'none';
      elements.btnBackToGrid.style.display = 'inline-flex';
      elements.mangaDetailSection.style.display = 'grid';
      elements.chaptersSection.style.display = 'block';
    } else {
      elements.mangaGridSection.style.display = 'block';
      elements.btnBackToGrid.style.display = 'none';
      elements.mangaDetailSection.style.display = 'none';
      elements.chaptersSection.style.display = 'none';
    }
    elements.customViewSection.style.display = 'none';
    elements.navHome.classList.add('active');
    elements.navBookmarks.classList.remove('active');
    elements.navHistory.classList.remove('active');
  } else if (section === 'bookmarks') {
    elements.mangaGridSection.style.display = 'none';
    elements.btnBackToGrid.style.display = 'none';
    elements.mangaDetailSection.style.display = 'none';
    elements.chaptersSection.style.display = 'none';
    elements.customViewSection.style.display = 'block';
    elements.navHome.classList.remove('active');
    elements.navBookmarks.classList.add('active');
    elements.navHistory.classList.remove('active');
    renderBookmarksView();
  } else if (section === 'history') {
    elements.mangaGridSection.style.display = 'none';
    elements.btnBackToGrid.style.display = 'none';
    elements.mangaDetailSection.style.display = 'none';
    elements.chaptersSection.style.display = 'none';
    elements.customViewSection.style.display = 'block';
    elements.navHome.classList.remove('active');
    elements.navBookmarks.classList.remove('active');
    elements.navHistory.classList.add('active');
    renderHistoryView();
  }
}

// Render Bookmarks View
function renderBookmarksView() {
  elements.customViewTitle.innerHTML = `<i class="fa-solid fa-bookmark"></i> Truyện đang theo dõi`;
  
  if (bookmarks.length === 0) {
    elements.customViewContent.innerHTML = `
      <div class="empty-state">
        <i class="fa-regular fa-bookmark"></i>
        <h3>Danh sách theo dõi trống</h3>
        <p>Tìm truyện và nhấn nút "Theo dõi truyện" để lưu lại tại đây.</p>
      </div>
    `;
    return;
  }
  
  elements.customViewContent.innerHTML = `
    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 1.5rem;">
      ${bookmarks.map(manga => `
        <div class="manga-grid-card" onclick="selectMangaBySlug('${manga.slug}')">
          <div class="manga-grid-card-cover">
            <img src="/proxy?url=${encodeURIComponent(manga.cover_image)}" alt="${manga.title}" loading="lazy">
          </div>
          <div class="manga-grid-card-title">${manga.title}</div>
          <div class="manga-grid-card-info">
            <span class="manga-grid-card-chap">${manga.last_chapter || 'Theo dõi'}</span>
            <span><i class="fa-solid fa-heart" style="color: var(--accent-color);"></i></span>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

// Render History View
function renderHistoryView() {
  elements.customViewTitle.innerHTML = `<i class="fa-solid fa-clock-rotate-left"></i> Lịch sử đọc truyện`;
  
  if (readingHistory.length === 0) {
    elements.customViewContent.innerHTML = `
      <div class="empty-state">
        <i class="fa-solid fa-history"></i>
        <h3>Lịch sử trống</h3>
        <p>Bạn chưa đọc chương nào của bất kỳ bộ truyện nào.</p>
      </div>
    `;
    return;
  }
  
  // Sort history newest first
  const historyList = [...readingHistory].sort((a, b) => b.timestamp - a.timestamp);
  
  elements.customViewContent.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 1rem; max-width: 800px;">
      ${historyList.map(h => {
        const formatTime = new Date(h.timestamp).toLocaleString('vi-VN');
        return `
          <div style="display: flex; justify-content: space-between; align-items: center; background: var(--bg-secondary); padding: 1.2rem 1.5rem; border-radius: var(--radius-md); border: 1px solid var(--border-color);">
            <div style="display: flex; gap: 1rem; align-items: center;">
              <img src="/proxy?url=${encodeURIComponent(h.cover_image)}" style="width: 45px; aspect-ratio: 2/3; border-radius: var(--radius-xs); object-fit: cover;">
              <div>
                <h4 style="margin-bottom: 0.25rem; color: var(--text-main); cursor: pointer;" onclick="selectMangaBySlug('${h.slug}')">${h.title}</h4>
                <p style="font-size: 0.85rem; color: var(--text-muted);">Đã đọc: <strong style="color: var(--accent-color);">${h.chapterName}</strong> | Vào lúc: ${formatTime}</p>
              </div>
            </div>
            <button class="btn btn-primary" style="padding: 0.5rem 1.2rem; font-size: 0.85rem;" onclick="resumeReadingManga('${h.slug}', '${h.chapterSlug}')">
              <i class="fa-solid fa-play"></i> Đọc tiếp
            </button>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

// Resume reading from history list
async function resumeReadingManga(slug, chapterSlug) {
  await selectMangaBySlug(slug);
  if (selectedManga) {
    const chapIdx = selectedManga.chapters.findIndex(c => c.chapter_slug === chapterSlug);
    if (chapIdx !== -1) {
      openReader(chapIdx);
    }
  }
}

// Reader functions
function openReader(chapterIndex) {
  if (!selectedManga || chapterIndex < 0 || chapterIndex >= selectedManga.chapters.length) return;
  
  currentChapterIndex = chapterIndex;
  showSection('reader');
  
  window.scrollTo({ top: 0 });
  
  elements.readerChapterDropdown.value = chapterIndex;
  
  const isFirst = chapterIndex === 0;
  const isLast = chapterIndex === selectedManga.chapters.length - 1;
  
  elements.readerBtnPrev.disabled = isFirst;
  elements.readerBottomBtnPrev.disabled = isFirst;
  
  elements.readerBtnNext.disabled = isLast;
  elements.readerBottomBtnNext.disabled = isLast;
  
  // Save reading progress
  saveReadingProgress(chapterIndex);
  
  // Load images
  loadChapterImagesOnDemand(selectedManga.chapters[chapterIndex]);
}

function saveReadingProgress(idx) {
  if (!selectedManga) return;
  const chapter = selectedManga.chapters[idx];
  
  readingHistory = readingHistory.filter(h => h.slug !== selectedManga.slug);
  
  readingHistory.push({
    slug: selectedManga.slug,
    title: selectedManga.title,
    cover_image: selectedManga.cover_image,
    chapterSlug: chapter.chapter_slug,
    chapterName: chapter.chapter_name,
    timestamp: Date.now()
  });
  
  if (readingHistory.length > 30) {
    readingHistory.shift();
  }
  
  localStorage.setItem('mp_history_full', JSON.stringify(readingHistory));
}

// Load chapter images
async function loadChapterImagesOnDemand(chapter) {
  elements.readerImageStack.innerHTML = `
    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 5rem 0;">
      <div class="spinner" style="position: relative;"></div>
      <p style="margin-top: 1rem; color: var(--text-muted);">Đang tải trang ảnh...</p>
    </div>
  `;
  
  const slugReplaced = chapter.chapter_slug.replace("chapter-", "chuong-");
  const chapterUrl = `https://nettruyen.gg/truyen-tranh/${selectedManga.slug}/${slugReplaced}`;
  const apiUrl = `/api/chapter-images?url=${encodeURIComponent(chapterUrl)}`;
  
  try {
    const response = await fetch(apiUrl);
    if (!response.ok) throw new Error("Không thể tải ảnh chương.");
    const imageUrls = await response.json();
    
    currentChapterRawImages = imageUrls; // Cache danh sách ảnh gốc để chuyển đổi bộ lọc lập tức
    renderChapterImages(imageUrls, chapter.chapter_name);
  } catch (error) {
    console.error("Lỗi tải ảnh:", error);
    elements.readerImageStack.innerHTML = `
      <div class="empty-state" style="margin: 4rem auto; color: var(--text-muted);">
        <i class="fa-solid fa-circle-exclamation" style="font-size: 3rem; color: #f25f5c; margin-bottom: 1rem;"></i>
        <h3>Lỗi không thể tải ảnh</h3>
        <p>Vui lòng kiểm tra kết nối mạng hoặc thử lại sau.</p>
      </div>
    `;
  }
}

function renderChapterImages(images, chapterName) {
  elements.readerImageStack.innerHTML = '';
  
  if (images.length === 0) {
    elements.readerImageStack.innerHTML = `
      <div class="empty-state" style="margin: 4rem auto; color: var(--text-muted);">
        <i class="fa-regular fa-face-frown" style="font-size: 3rem; margin-bottom: 1rem;"></i>
        <h3>Chương này chưa có ảnh</h3>
        <p>Quay lại danh sách hoặc thử lại sau.</p>
      </div>
    `;
    return;
  }
  
  // Đọc cấu hình lọc trang quảng cáo hiện tại
  const skipFirst = elements.chkSkipFirst.checked;
  const skipFirstTwo = elements.chkSkipFirstTwo.checked;
  const skipLast = elements.chkSkipLast.checked;
  
  let imagesToRender = images;
  if (images.length > 3) {
    let startIdx = 0;
    let endIdx = images.length;
    
    if (skipFirstTwo) {
      startIdx = 2;
    } else if (skipFirst) {
      startIdx = 1;
    }
    
    if (skipLast) {
      endIdx = images.length - 1;
    }
    
    imagesToRender = images.slice(startIdx, endIdx);
  } else if (images.length > 2) {
    // Tránh cắt mất nội dung nếu chương quá ít trang
    imagesToRender = images.slice(1, -1);
  }
  
  imagesToRender.forEach((imgUrl, idx) => {
    const pageWrapper = document.createElement('div');
    pageWrapper.className = 'manga-page-wrapper';
    
    const spinner = document.createElement('div');
    spinner.className = 'spinner';
    
    const img = document.createElement('img');
    img.className = 'manga-page-img';
    img.alt = `${chapterName} - Page ${idx + 1}`;
    
    const proxiedUrl = `/proxy?url=${encodeURIComponent(imgUrl)}`;
    
    pageWrapper.appendChild(spinner);
    pageWrapper.appendChild(img);
    elements.readerImageStack.appendChild(pageWrapper);
    
    // Tải ảnh thông qua fetch để trích xuất X-Image-Hash trong header
    fetch(proxiedUrl)
      .then(response => {
        if (!response.ok) throw new Error("Lỗi kết nối");
        const hash = response.headers.get('X-Image-Hash');
        
        // Nếu ảnh này đã bị chặn từ trước -> Ẩn hoàn toàn khỏi giao diện đọc
        if (hash && blockedHashes.includes(hash)) {
          pageWrapper.style.display = 'none';
          spinner.style.display = 'none';
          return null;
        }
        
        // Gắn nút "Chặn ảnh QC" nếu ảnh có mã băm định danh
        if (hash) {
          const blockBtn = document.createElement('button');
          blockBtn.className = 'block-page-btn';
          blockBtn.innerHTML = `<i class="fa-solid fa-ban"></i> Chặn ảnh QC`;
          blockBtn.onclick = (e) => {
            e.stopPropagation();
            window.blockImageHash(hash, blockBtn);
          };
          pageWrapper.appendChild(blockBtn);
        }
        
        return response.blob();
      })
      .then(blob => {
        if (!blob) return;
        const objectUrl = URL.createObjectURL(blob);
        img.src = objectUrl;
        img.onload = () => {
          img.classList.add('loaded');
          spinner.style.display = 'none';
        };
      })
      .catch(err => {
        // Dự phòng tải trực tiếp nếu fetch lỗi
        img.src = proxiedUrl;
        img.onload = () => {
          img.classList.add('loaded');
          spinner.style.display = 'none';
        };
        img.onerror = () => {
          spinner.style.display = 'none';
          pageWrapper.innerHTML = `
            <div style="color: var(--text-dark); text-align: center; padding: 2rem;">
              <i class="fa-solid fa-circle-exclamation" style="font-size: 2rem; color: #f25f5c; margin-bottom: 0.5rem;"></i>
              <p style="font-size: 0.8rem;">Lỗi tải trang ${idx + 1}</p>
            </div>
          `;
        };
      });
  });
}

// Hàm chặn ảnh quảng cáo vĩnh viễn theo mã băm MD5
window.blockImageHash = function(hash, buttonElement) {
  if (!hash) return;
  if (!blockedHashes.includes(hash)) {
    blockedHashes.push(hash);
    localStorage.setItem('mp_blocked_hashes', JSON.stringify(blockedHashes));
  }
  
  // Ẩn ảnh này ngay lập tức trên màn hình
  const wrapper = buttonElement.closest('.manga-page-wrapper');
  if (wrapper) {
    wrapper.style.display = 'none';
  }
  
  // Hiển thị thông báo Toast nhỏ hoặc log để xác nhận
  console.log(`Đã chặn ảnh QC thành công! Mã MD5: ${hash}`);
};

// Reader Navigation Action
elements.readerBtnHome.onclick = () => {
  currentChapterIndex = null;
  showSection('home');
};

elements.readerBtnPrev.onclick = () => openReader(currentChapterIndex - 1);
elements.readerBottomBtnPrev.onclick = () => openReader(currentChapterIndex - 1);

elements.readerBtnNext.onclick = () => openReader(currentChapterIndex + 1);
elements.readerBottomBtnNext.onclick = () => openReader(currentChapterIndex + 1);

elements.readerChapterDropdown.onchange = (e) => {
  openReader(parseInt(e.target.value));
};

// Keyboard Arrow Navigation
document.addEventListener('keydown', (e) => {
  if (currentChapterIndex === null) return;
  if (document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.id === 'global-search-input')) return;
  
  if (e.key === 'ArrowLeft') {
    if (currentChapterIndex > 0) openReader(currentChapterIndex - 1);
  } else if (e.key === 'ArrowRight') {
    if (currentChapterIndex < selectedManga.chapters.length - 1) openReader(currentChapterIndex + 1);
  }
});

// Scroll Events
let lastScrollTop = 0;
window.onscroll = () => {
  if (document.body.scrollTop > 400 || document.documentElement.scrollTop > 400) {
    elements.btnBackToTop.classList.add('visible');
  } else {
    elements.btnBackToTop.classList.remove('visible');
  }
  
  if (currentChapterIndex !== null) {
    let st = window.pageYOffset || document.documentElement.scrollTop;
    if (st > lastScrollTop && st > 150) {
      elements.readerNavControls.classList.add('hidden');
    } else {
      elements.readerNavControls.classList.remove('hidden');
    }
    lastScrollTop = st <= 0 ? 0 : st;
  }
};

elements.btnBackToTop.onclick = () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
};
