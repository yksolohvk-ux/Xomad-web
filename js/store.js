// Global application state
export const store = {
  user: null,
  userProfile: null,
  theme: localStorage.getItem('theme') || 'light',
  unreadNotifications: 0,
  unreadMessages: 0,

  setUser(user) {
    this.user = user;
    this.notify('user');
  },
  setUserProfile(profile) {
    this.userProfile = profile;
    this.notify('userProfile');
  },
  setTheme(theme) {
    this.theme = theme;
    localStorage.setItem('theme', theme);
    document.documentElement.className = theme === 'dark' ? 'dark' : '';
    this.notify('theme');
  },
  setUnreadNotifications(count) {
    this.unreadNotifications = count;
    this.notify('unreadNotifications');
  },
  setUnreadMessages(count) {
    this.unreadMessages = count;
    this.notify('unreadMessages');
  },

  _listeners: {},
  on(event, fn) {
    if (!this._listeners[event]) this._listeners[event] = [];
    this._listeners[event].push(fn);
  },
  off(event, fn) {
    if (!this._listeners[event]) return;
    this._listeners[event] = this._listeners[event].filter(f => f !== fn);
  },
  notify(event) {
    (this._listeners[event] || []).forEach(fn => fn(this[event]));
  }
};

// Apply theme on load
document.documentElement.className = store.theme === 'dark' ? 'dark' : '';
