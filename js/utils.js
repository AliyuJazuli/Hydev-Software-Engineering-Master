/* HYDEV SE - Utility Functions */

window.HYDEV = window.HYDEV || {};
var HYDEV = window.HYDEV;

HYDEV.Utils = {
  storage: {
    get(key, defaultValue = null) {
      try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : defaultValue;
      } catch (e) {
        console.warn(`Storage read failed for ${key}:`, e);
        return defaultValue;
      }
    },
    set(key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
      } catch (e) {
        console.warn(`Storage write failed for ${key}:`, e);
        return false;
      }
    },
    remove(key) {
      localStorage.removeItem(key);
    },
    clear() {
      localStorage.clear();
    }
  },

  event: {
    on(element, event, handler) {
      element.addEventListener(event, handler);
    },
    off(element, event, handler) {
      element.removeEventListener(event, handler);
    },
    emit(element, event, detail = {}) {
      element.dispatchEvent(new CustomEvent(event, { detail }));
    }
  },

  dom: {
    $(selector, parent = document) {
      return parent.querySelector(selector);
    },
    $$(selector, parent = document) {
      return Array.from(parent.querySelectorAll(selector));
    },
    create(tag, attrs = {}, children = []) {
      const el = document.createElement(tag);
      Object.assign(el, attrs);
      children.forEach(child => el.appendChild(child instanceof Node ? child : document.createTextNode(child)));
      return el;
    },
    show(element) {
      element.classList.add('active');
    },
    hide(element) {
      element.classList.remove('active');
    },
    toggle(element, force) {
      if (force === undefined) {
        element.classList.toggle('active');
      } else {
        element.classList.toggle('active', force);
      }
    }
  },

  validate: {
    email(email) {
      const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return re.test(email);
    },
    required(value) {
      return value !== null && value !== undefined && String(value).trim() !== '';
    },
    minLength(value, min) {
      return String(value).length >= min;
    },
    maxLength(value, max) {
      return String(value).length <= max;
    }
  },

  format: {
    number(n) {
      return n.toLocaleString();
    },
    percent(n) {
      return Math.round(n * 100) + '%';
    },
    date(d) {
      return new Date(d).toLocaleDateString();
    },
    time(d) {
      return new Date(d).toLocaleTimeString();
    }
  },

  debounce(func, wait = 300) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },

  throttle(func, limit = 300) {
    let inThrottle;
    return function(...args) {
      const context = this;
      if (!inThrottle) {
        func.apply(context, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    }
  },

  uid() {
    return 'id_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
  },

  clone(obj) {
    return JSON.parse(JSON.stringify(obj));
  },

  isEmpty(obj) {
    return obj === null || obj === undefined ||
           (typeof obj === 'object' && Object.keys(obj).length === 0) ||
           (typeof obj === 'string' && obj.trim() === '');
  }
};

HYDEV.Toast = {
  show(message, type = 'info', duration = 3000) {
    const toast = HYDEV.Utils.dom.create('div', {
      className: `toast ${type}`
    }, [
      HYDEV.Utils.dom.create('span', {}, [message])
    ]);

    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  },

  success(message, duration) {
    this.show(message, 'success', duration);
  },

  error(message, duration) {
    this.show(message, 'error', duration);
  },

  warning(message, duration) {
    this.show(message, 'warning', duration);
  },

  info(message, duration) {
    this.show(message, 'info', duration);
  }
};

window.HYDEV = HYDEV;
