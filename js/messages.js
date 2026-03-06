const MESSAGES_KEY = 'message_board_messages';

class MessageBoard {
    constructor(options = {}) {
        this.container = options.container;
        this.currentUser = null;
        this.messages = [];
        
        this.init();
    }
    
    init() {
        this.currentUser = window.guestSystem?.getGuestInfo();
        this.loadLocalMessages();
        this.render();
    }
    
    loadLocalMessages() {
        try {
            const data = localStorage.getItem(MESSAGES_KEY);
            if (data) {
                this.messages = JSON.parse(data);
            }
        } catch (e) {
            console.error('加载留言失败:', e);
            this.messages = [];
        }
    }
    
    saveLocalMessages() {
        try {
            localStorage.setItem(MESSAGES_KEY, JSON.stringify(this.messages));
        } catch (e) {
            console.error('保存留言失败:', e);
        }
    }
    
    render() {
        this.container.innerHTML = `
            <div class="message-board">
                <div class="message-board-header text-center mb-8">
                    <h2 class="text-3xl font-bold mb-2">
                        <span class="text-4xl mr-2">💬</span>
                        留言板
                    </h2>
                    <p class="text-gray-400">与其他探索者交流互动</p>
                </div>
                
                <div class="message-form-container glass-card rounded-2xl p-6 mb-8">
                    <div class="flex items-start gap-4">
                        <img src="${this.currentUser?.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=guest'}" alt="avatar" class="w-12 h-12 rounded-full">
                        <div class="flex-1">
                            <textarea 
                                id="message-input" 
                                class="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white resize-none focus:border-purple-500 focus:outline-none transition-all"
                                placeholder="分享你的想法、建议或故事..."
                                rows="4"
                                maxlength="500"
                            ></textarea>
                            <div class="flex justify-between items-center mt-3">
                                <span class="text-sm text-gray-500">
                                    <span id="msg-char-count">0</span>/500
                                </span>
                                <button 
                                    id="submit-message" 
                                    class="px-8 py-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl text-white font-bold hover:opacity-90 transition-all disabled:opacity-50 flex items-center gap-2"
                                >
                                    <i class="fas fa-paper-plane"></i>
                                    发表留言
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div id="messages-list" class="space-y-6">
                </div>
            </div>
        `;
        
        this.renderMessages();
        this.bindEvents();
    }
    
    bindEvents() {
        const input = document.getElementById('message-input');
        const submitBtn = document.getElementById('submit-message');
        
        if (input) {
            input.addEventListener('input', () => {
                document.getElementById('msg-char-count').textContent = input.value.length;
            });
            
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && e.ctrlKey) {
                    this.submitMessage();
                }
            });
        }
        
        if (submitBtn) {
            submitBtn.addEventListener('click', () => this.submitMessage());
        }
    }
    
    renderMessages() {
        const list = document.getElementById('messages-list');
        
        if (this.messages.length === 0) {
            list.innerHTML = `
                <div class="text-center py-12 text-gray-400">
                    <div class="text-6xl mb-4">📝</div>
                    <p class="text-lg">还没有留言</p>
                    <p class="text-sm">成为第一个留言的人吧！</p>
                </div>
            `;
            return;
        }
        
        const pinnedMessages = this.messages.filter(m => m.isPinned);
        const normalMessages = this.messages.filter(m => !m.isPinned);
        const sortedMessages = [
            ...pinnedMessages.sort((a, b) => b.timestamp - a.timestamp),
            ...normalMessages.sort((a, b) => b.timestamp - a.timestamp)
        ];
        
        list.innerHTML = sortedMessages.map(message => this.renderMessageItem(message)).join('');
        
        this.bindMessageEvents();
    }
    
    renderMessageItem(message) {
        const isOwner = this.currentUser && this.currentUser.id === message.userId;
        const hasLiked = message.likedBy?.includes(this.currentUser?.id);
        
        return `
            <div class="message-item glass-card rounded-2xl p-6 ${message.isPinned ? 'border-2 border-yellow-500/50' : ''}" data-id="${message.id}">
                ${message.isPinned ? `
                    <div class="flex items-center gap-2 text-yellow-400 text-sm mb-3">
                        <i class="fas fa-thumbtack"></i>
                        <span>置顶留言</span>
                    </div>
                ` : ''}
                
                <div class="flex items-start gap-4">
                    <img src="${message.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${message.userId}`}" alt="avatar" class="w-12 h-12 rounded-full">
                    <div class="flex-1">
                        <div class="flex items-center gap-3 mb-2">
                            <span class="font-bold text-lg">${this.escapeHtml(message.username)}</span>
                            ${message.isGuest ? '<span class="text-xs bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded-full">访客</span>' : ''}
                            <span class="text-sm text-gray-500">${this.formatTime(message.timestamp)}</span>
                        </div>
                        <p class="text-gray-300 mb-4 leading-relaxed">${this.escapeHtml(message.content)}</p>
                        
                        <div class="flex items-center gap-4 text-sm">
                            <button class="msg-like-btn flex items-center gap-2 ${hasLiked ? 'text-red-400' : 'text-gray-400'} hover:text-red-400 transition-colors" data-id="${message.id}">
                                <i class="fas fa-heart"></i>
                                <span>${message.likes || 0}</span>
                            </button>
                            
                            <button class="msg-reply-btn text-gray-400 hover:text-purple-400 transition-colors" data-id="${message.id}">
                                <i class="fas fa-reply"></i> 回复
                            </button>
                            
                            ${isOwner ? `
                                <button class="msg-delete-btn text-gray-400 hover:text-red-400 transition-colors" data-id="${message.id}">
                                    <i class="fas fa-trash"></i> 删除
                                </button>
                            ` : ''}
                        </div>
                        
                        ${message.replies && message.replies.length > 0 ? `
                            <div class="replies-container mt-4 pl-4 border-l-2 border-purple-500/30 space-y-3">
                                ${message.replies.map(reply => `
                                    <div class="reply-item">
                                        <div class="flex items-center gap-2 mb-1">
                                            <img src="${reply.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${reply.userId}`}" alt="avatar" class="w-6 h-6 rounded-full">
                                            <span class="font-medium text-sm">${this.escapeHtml(reply.username)}</span>
                                            <span class="text-xs text-gray-500">${this.formatTime(reply.timestamp)}</span>
                                        </div>
                                        <p class="text-gray-400 text-sm">${this.escapeHtml(reply.content)}</p>
                                    </div>
                                `).join('')}
                            </div>
                        ` : ''}
                        
                        <div class="reply-form-container hidden mt-4" data-message-id="${message.id}">
                            <div class="flex items-start gap-3">
                                <img src="${this.currentUser?.avatar}" alt="avatar" class="w-8 h-8 rounded-full">
                                <div class="flex-1">
                                    <textarea 
                                        class="reply-input w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white text-sm resize-none focus:border-purple-500 focus:outline-none transition-all"
                                        placeholder="写下你的回复..."
                                        rows="2"
                                        maxlength="300"
                                    ></textarea>
                                    <div class="flex justify-end gap-2 mt-2">
                                        <button class="cancel-reply-btn px-4 py-1 text-sm text-gray-400 hover:text-white transition-colors">取消</button>
                                        <button class="submit-reply-btn px-4 py-1 bg-purple-500 rounded-lg text-sm text-white hover:bg-purple-600 transition-colors">回复</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    bindMessageEvents() {
        document.querySelectorAll('.msg-like-btn').forEach(btn => {
            btn.addEventListener('click', () => this.likeMessage(btn.dataset.id));
        });
        
        document.querySelectorAll('.msg-reply-btn').forEach(btn => {
            btn.addEventListener('click', () => this.showReplyForm(btn.dataset.id));
        });
        
        document.querySelectorAll('.msg-delete-btn').forEach(btn => {
            btn.addEventListener('click', () => this.deleteMessage(btn.dataset.id));
        });
        
        document.querySelectorAll('.cancel-reply-btn').forEach(btn => {
            btn.addEventListener('click', () => this.hideReplyForm(btn));
        });
        
        document.querySelectorAll('.submit-reply-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const container = e.target.closest('.reply-form-container');
                this.submitReply(container.dataset.messageId, container.querySelector('.reply-input').value);
            });
        });
    }
    
    submitMessage() {
        const input = document.getElementById('message-input');
        const content = input.value.trim();
        
        if (!content) {
            this.showToast('请输入留言内容', 'error');
            return;
        }
        
        const btn = document.getElementById('submit-message');
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 发表中...';
        
        const guest = window.guestSystem?.getGuestInfo();
        
        const newMessage = {
            id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            content: content,
            userId: guest?.id || 'anonymous',
            username: guest?.nickname || '匿名探索者',
            avatar: guest?.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=anonymous',
            isGuest: true,
            timestamp: Date.now(),
            likes: 0,
            likedBy: [],
            isPinned: false,
            replies: []
        };
        
        this.messages.unshift(newMessage);
        this.saveLocalMessages();
        this.renderMessages();
        
        input.value = '';
        document.getElementById('msg-char-count').textContent = '0';
        this.showToast('留言发表成功', 'success');
        
        if (window.guestSystem) {
            window.guestSystem.updateStats('messagesPosted');
        }
        
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-paper-plane"></i> 发表留言';
    }
    
    likeMessage(messageId) {
        const message = this.messages.find(m => m.id === messageId);
        if (!message) return;
        
        const guestId = this.currentUser?.id;
        if (!guestId) return;
        
        if (!message.likedBy) {
            message.likedBy = [];
        }
        
        const hasLiked = message.likedBy.includes(guestId);
        
        if (hasLiked) {
            message.likedBy = message.likedBy.filter(id => id !== guestId);
            message.likes = Math.max(0, (message.likes || 0) - 1);
        } else {
            message.likedBy.push(guestId);
            message.likes = (message.likes || 0) + 1;
        }
        
        this.saveLocalMessages();
        this.renderMessages();
    }
    
    showReplyForm(messageId) {
        this.hideAllReplyForms();
        const container = document.querySelector(`.reply-form-container[data-message-id="${messageId}"]`);
        if (container) {
            container.classList.remove('hidden');
            container.querySelector('.reply-input').focus();
        }
    }
    
    hideReplyForm(btn) {
        const container = btn.closest('.reply-form-container');
        if (container) {
            container.classList.add('hidden');
            container.querySelector('.reply-input').value = '';
        }
    }
    
    hideAllReplyForms() {
        document.querySelectorAll('.reply-form-container').forEach(container => {
            container.classList.add('hidden');
        });
    }
    
    submitReply(messageId, content) {
        if (!content.trim()) {
            this.showToast('请输入回复内容', 'error');
            return;
        }
        
        const message = this.messages.find(m => m.id === messageId);
        if (!message) return;
        
        const guest = window.guestSystem?.getGuestInfo();
        
        const reply = {
            id: 'reply_' + Date.now(),
            content: content.trim(),
            userId: guest?.id || 'anonymous',
            username: guest?.nickname || '匿名探索者',
            avatar: guest?.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=anonymous',
            timestamp: Date.now()
        };
        
        if (!message.replies) {
            message.replies = [];
        }
        message.replies.push(reply);
        
        this.saveLocalMessages();
        this.renderMessages();
        this.showToast('回复成功', 'success');
    }
    
    deleteMessage(messageId) {
        if (!confirm('确定要删除这条留言吗？')) return;
        
        this.messages = this.messages.filter(m => m.id !== messageId);
        this.saveLocalMessages();
        this.renderMessages();
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

window.MessageBoard = MessageBoard;
