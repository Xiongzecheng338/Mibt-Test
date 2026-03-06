const GUEST_INFO_KEY = 'guest_info';

const guestSystem = {
    generateGuestId() {
        return 'guest_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    },
    
    generateRandomNickname() {
        const adjectives = ['快乐的', '聪明的', '勇敢的', '温柔的', '神秘的', '闪耀的', '自由的', '智慧的'];
        const nouns = ['星星', '月亮', '太阳', '流星', '银河', '行星', '彗星', '星云'];
        const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
        const noun = nouns[Math.floor(Math.random() * nouns.length)];
        const num = Math.floor(Math.random() * 100);
        return `${adj}${noun}${num}`;
    },
    
    getGuestInfo() {
        try {
            const data = localStorage.getItem(GUEST_INFO_KEY);
            if (data) {
                return JSON.parse(data);
            }
        } catch (e) {
            console.error('读取访客信息失败:', e);
        }
        
        const newGuest = {
            id: this.generateGuestId(),
            nickname: this.generateRandomNickname(),
            avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${Date.now()}`,
            createdAt: Date.now(),
            stats: {
                testsCompleted: 0,
                commentsPosted: 0,
                messagesPosted: 0
            }
        };
        
        localStorage.setItem(GUEST_INFO_KEY, JSON.stringify(newGuest));
        return newGuest;
    },
    
    updateGuestInfo(data) {
        try {
            const guest = this.getGuestInfo();
            Object.assign(guest, data);
            
            if (data.nickname) {
                guest.avatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(data.nickname)}`;
            }
            
            localStorage.setItem(GUEST_INFO_KEY, JSON.stringify(guest));
            return guest;
        } catch (e) {
            console.error('更新访客信息失败:', e);
            return null;
        }
    },
    
    updateStats(statKey, increment = 1) {
        try {
            const guest = this.getGuestInfo();
            if (guest.stats && guest.stats[statKey] !== undefined) {
                guest.stats[statKey] += increment;
            }
            localStorage.setItem(GUEST_INFO_KEY, JSON.stringify(guest));
            return guest;
        } catch (e) {
            console.error('更新统计数据失败:', e);
            return null;
        }
    },
    
    getDisplayName() {
        const guest = this.getGuestInfo();
        return guest.nickname || '匿名探索者';
    },
    
    getAvatar() {
        const guest = this.getGuestInfo();
        return guest.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${guest.id}`;
    },
    
    getId() {
        const guest = this.getGuestInfo();
        return guest.id;
    },
    
    clearGuestInfo() {
        localStorage.removeItem(GUEST_INFO_KEY);
    },
    
    isGuest() {
        return true;
    },
    
    formatGuestInfo() {
        const guest = this.getGuestInfo();
        return {
            id: guest.id,
            nickname: guest.nickname,
            avatar: guest.avatar,
            isGuest: true
        };
    }
};

window.guestSystem = guestSystem;
