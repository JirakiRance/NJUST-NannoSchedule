import { store } from '../store.js';
import { API_BASE, showToast } from '../utils.js';

export default {
    template: `
        <div class="subpage-container" style="display: flex; flex-direction: column; height: 100%;">
            <div class="search-bar-wrapper">
                <input type="text" v-model="bookKeyword" placeholder="输入书名或关键词..." @keyup.enter="searchLibrary">
                <button class="search-btn" @click="searchLibrary" :disabled="isSearchingBooks">
                    <i v-if="isSearchingBooks" class="ri-loader-4-line ri-spin" style="margin-right: 4px;"></i>
                    {{ isSearchingBooks ? '检索中' : '搜索' }}
                </button>
            </div>
            <div class="search-results-area" style="flex: 1; overflow-y: auto; padding-top: 15px;">
                <div v-if="bookList.length > 0">
                    <div class="book-card" v-for="(book, index) in bookList" :key="index" @click="fetchBookDetail(book)">
                        <div class="book-info">
                            <div class="book-title">{{ book.title }}</div>
                            <div class="book-author">{{ book.author }} | {{ book.publisher }}</div>
                            <div class="book-stock"><span class="stock-badge available"><i class="ri-map-pin-line" style="vertical-align: text-bottom;"></i> 点击查看馆藏</span></div>
                        </div>
                        <div style="display: flex; align-items: center; color: var(--text-sub); font-size: 20px;"><i class="ri-arrow-right-s-line"></i></div>
                    </div>
                </div>
                <div class="empty-state" v-else-if="!isSearchingBooks">
                    <div class="empty-emoji"><i class="ri-search-eye-line" style="color: #999;"></i></div><p>输入关键词寻找书籍</p>
                </div>
            </div>

            <div class="modal-overlay" v-if="showBookModal" @click.self="showBookModal = false">
                <div class="modal-content" style="width: 90%; max-width: 400px;">
                    <div v-if="loadingBook" class="library-modal-loading">
                        <i class="ri-book-read-line ri-spin" style="font-size: 30px; color: var(--primary-color);"></i><br><br>正在穿梭书架...
                    </div>
                    <div v-else-if="currentBookDetail">
                        <div class="modal-title">{{ currentBookDetail.title }}</div>
                        <div class="library-modal-holdings">
                            <table class="g-table library-table">
                                <thead><tr><th class="library-th-left">馆藏地</th><th>索书号</th><th>状态</th></tr></thead>
                                <tbody>
                                    <tr v-for="(h, idx) in currentBookDetail.holdings" :key="idx">
                                        <td class="library-td-left">{{ h.location }}</td>
                                        <td class="library-td-center">{{ h.call_no }}</td>
                                        <td :style="{ color: h.status.includes('可借') ? '#34c759' : '#ff3b30', fontWeight: 'bold', fontSize: '11px' }">{{ h.status }}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                        <button class="modal-close-btn" @click="showBookModal = false">关闭</button>
                    </div>
                </div>
            </div>
        </div>
    `,
    data() {
        return { store, bookKeyword: "", isSearchingBooks: false, bookList: [], showBookModal: false, loadingBook: false, currentBookDetail: null };
    },
    methods: {
        async searchLibrary() {
            if (!this.bookKeyword.trim()) return showToast("请输入书名");
            this.isSearchingBooks = true; this.bookList = [];
            try {
                const res = await fetch(`${API_BASE}/search_books`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ keyword: this.bookKeyword }) });
                const result = await res.json();
                if (res.ok) { this.bookList = result.data; if(this.bookList.length === 0) showToast("未找到书籍"); }
            } catch (e) { showToast("网络异常"); } finally { this.isSearchingBooks = false; }
        },
        async fetchBookDetail(book) {
            if (!book.id) return;
            this.currentBookDetail = { title: book.title, holdings: [] }; this.loadingBook = true; this.showBookModal = true;
            try {
                const res = await fetch(`${API_BASE}/book_detail`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: book.id }) });
                const result = await res.json();
                if (res.ok) this.currentBookDetail = { ...this.currentBookDetail, ...result.data };
            } catch (e) { showToast("网络异常"); this.showBookModal = false; } finally { this.loadingBook = false; }
        }
    }
}