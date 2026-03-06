class CommentsManager {
    constructor(options = {}) {
        this.testId = options.testId;
        this.container = options.container;
        this.currentUser = null;
        this.comments = [];
        this.page = 1;
        this.limit = 20;
        this.hasMore = true;
        this.loading = false;
        
        this.init();
    }
    
    async init() {
        this.currentUser = window.guestSystem?.getGuestInfo();
        this.loadLocalComments();
        this.render();
    }
    
    loadLocalComments() {
        try {
            const key = `comments_${this.testId || 'general'}`;
            const data = localStorage.getItem(key);
            if (data) {
                this.comments = JSON.parse(data);
            }
        } catch (e) {
            console.error('加载评论失败:', e);
            this.comments = [];
        }
    }
    
    saveLocalComments() {
        try {
            const key = `comments_${this.testId || 'general'}`;
            localStorage.setItem(key, JSON.stringify(this.comments));
        } catch (e) {
            console.error('保存评论失败:', e);
        }
    }
    
    render() {
        this.container.innerHTML = `
            <div class="comments-section">
                <div class="comments-header">
                    <h3 class="text-xl font-bold flex items-center gap-2">
                        <i class="fas fa-comments text-purple-400"></i>
                        评论区
                    </h3>
                    <span class="text-sm text-gray-400" id="comments-count">${this.comments.length} 条评论</span>
                </div>
                
                <div class="comment-form-container glass-card rounded-xl p-4 mb-6">
                    <div class="flex items-start gap-3">
                        <img src="${this.currentUser?.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=guest'}" alt="avatar" class="w-10 h-10 rounded-full">
                        <div class="flex-1">
                            <textarea 
                                id="comment-input" 
                                class="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white resize-none focus:border-purple-500 focus:outline-none transition-all"
                                placeholder="分享你的想法..."
                                rows="3"
                                maxlength="1000"
                            ></textarea>
                            <div class="flex justify-between items-center mt-2">
                                <span class="text-xs text-gray-500">
                                    <span id="char-count">0</span>/1000
                                </span>
                                <button 
                                    id="submit-comment" 
                                    class="px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg text-white font-medium hover:opacity-90 transition-all disabled:opacity-50"
                                >
                                    发表评论
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div id="comments-list" class="space-y-4">
                </div>
            </div>
        `;
        
        this.renderComments();
        this.bindEvents();
    }
    
    bindEvents() {
        const input = document.getElementById('comment-input');
        const submitBtn = document.getElementById('submit-comment');
        
        if (input) {
            input.addEventListener('input', () => {
                document.getElementById('char-count').textContent = input.value.length;
            });
        }
        
        if (submitBtn) {
            submitBtn.addEventListener('click', () => this.submitComment());
        }
    }
    
    renderComments() {
        const list = document.getElementById('comments-list');
        
        if (this.comments.length === 0) {
            list.innerHTML = `
                <div class="text-center py-8 text-gray-400">
                    <i class="fas fa-comments text-4xl mb-3 opacity-30"></i>
                    <p>暂无评论，快来发表第一条评论吧！</p>
                </div>
            `;
            return;
        }
        
        const sortedComments = [...this.comments].sort((a, b) => b.timestamp - a.timestamp);
        
        list.innerHTML = sortedComments.map(comment => this.renderCommentItem(comment)).join('');
        
        this.bindCommentEvents();
    }
    
    renderCommentItem(comment) {
        const isOwner = this.currentUser && this.currentUser.id === comment.userId;
        const hasLiked = comment.likedBy?.includes(this.currentUser?.id);
        
        return `
            <div class="comment-item glass-card rounded-xl p-4" data-id="${comment.id}">
                <div class="flex items-start gap-3">
                    <img src="${comment.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${comment.userId}`}" alt="avatar" class="w-10 h-10 rounded-full">
                    <div class="flex-1">
                        <div class="flex items-center gap-2 mb-1">
                            <span class="font-medium">${this.escapeHtml(comment.username)}</span>
                            ${comment.isGuest ? '<span class="text-xs bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded-full">访客</span>' : ''}
                            <span class="text-xs text-gray-500">${this.formatTime(comment.timestamp)}</span>
                        </div>
                        <p class="text-gray-300 mb-3">${this.escapeHtml(comment.content)}</p>
                        <div class="flex items-center gap-4 text-sm">
                            <button class="like-btn flex items-center gap-1 ${hasLiked ? 'text-red-400' : 'text-gray-400'} hover:text-red-400 transition-colors" data-id="${comment.id}">
                                <i class="fas fa-heart"></i>
                                <span>${comment.likes || 0}</span>
                            </button>
                            ${isOwner ? `
                                <button class="delete-btn text-gray-400 hover:text-red-400 transition-colors" data-id="${comment.id}">
                                    <i class="fas fa-trash"></i> 删除
                                </button>
                            ` : ''}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    bindCommentEvents() {
        document.querySelectorAll('.like-btn').forEach(btn => {
            btn.addEventListener('click', () => this.likeComment(btn.dataset.id));
        });
        
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', () => this.deleteComment(btn.dataset.id));
        });
    }
    
    submitComment() {
        const input = document.getElementById('comment-input');
        const content = input.value.trim();
        
        if (!content) {
            this.showToast('请输入评论内容', 'error');
            return;
        }
        
        const btn = document.getElementById('submit-comment');
        btn.disabled = true;
        btn.textContent = '发表中...';
        
        const guest = window.guestSystem?.getGuestInfo();
        
        const newComment = {
            id: 'comment_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            testId: this.testId,
            content: content,
            userId: guest?.id || 'anonymous',
            username: guest?.nickname || '匿名探索者',
            avatar: guest?.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=anonymous',
            isGuest: true,
            timestamp: Date.now(),
            likes: 0,
            likedBy: []
        };
        
        this.comments.unshift(newComment);
        this.saveLocalComments();
        this.renderComments();
        
        input.value = '';
        document.getElementById('char-count').textContent = '0';
        this.showToast('评论发表成功', 'success');
        
        if (window.guestSystem) {
            window.guestSystem.updateStats('commentsPosted');
        }
        
        btn.disabled = false;
        btn.textContent = '发表评论';
    }
    
    likeComment(commentId) {
        const comment = this.comments.find(c => c.id === commentId);
        if (!comment) return;
        
        const guestId = this.currentUser?.id;
        if (!guestId) return;
        
        if (!comment.likedBy) {
            comment.likedBy = [];
        }
        
        const hasLiked = comment.likedBy.includes(guestId);
        
        if (hasLiked) {
            comment.likedBy = comment.likedBy.filter(id => id !== guestId);
            comment.likes = Math.max(0, (comment.likes || 0) - 1);
        } else {
            comment.likedBy.push(guestId);
            comment.likes = (comment.likes || 0) + 1;
        }
        
        this.saveLocalComments();
        this.renderComments();
    }
    
    deleteComment(commentId) {
        if (!confirm('确定要删除这条评论吗？')) return;
        
        this.comments = this.comments.filter(c => c.id !== commentId);
        this.saveLocalComments();
        this.renderComments();
        this.showToast('删除成功', 'success');
    }
    
    formatTime(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;
        
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);
        
        if (minutes < 1) return '刚刚';
        if (minutes < 60) return `${minutes}分钟前`;
        if (hours < 24) return `${hours}小时前`;
        if (days < 7) return `${days}天前`;
        
        return date.toLocaleDateString();
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    showToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `fixed top-4 right-4 px-6 py-3 rounded-xl shadow-lg z-50 animate__animated animate__fadeInRight ${
            type === 'success' ? 'bg-green-500/90' : 'bg-red-500/90'
        } text-white`;
        toast.innerHTML = `<i class="fas fa-${type === 'success' ? 'check' : 'exclamation'}-circle mr-2"></i>${message}`;
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.classList.remove('animate__fadeInRight');
            toast.classList.add('animate__fadeOutRight');
            setTimeout(() => toast.remove(), 500);
        }, 2000);
    }
}

window.CommentsManager = CommentsManager;
