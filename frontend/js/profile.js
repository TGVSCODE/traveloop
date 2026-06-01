/**
 * Traveloop - Profile & Settings JavaScript Controller
 * Pure Custom JavaScript ES6+
 */

// Store helper methods to interact with localStorage
// Vercel handles production routing via vercel.json rewrite
const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:5000/api'
  : '/api';

// Store helper methods to interact with backend DB
const Store = {
  getUsers: async () => {
    try {
      const res = await fetch(`${API_BASE}/auth/users`);
      return res.ok ? await res.json() : [];
    } catch (err) {
      console.error(err);
      return [];
    }
  },
  saveUsers: (users) => {},
  getCurrentUser: () => JSON.parse(localStorage.getItem('traveloop_user')),
  setCurrentUser: (user) => localStorage.setItem('traveloop_user', JSON.stringify(user)),
  getToken: () => localStorage.getItem('traveloop_token'),
  setToken: (token) => localStorage.setItem('traveloop_token', token),
  getTrips: async () => {
    const token = Store.getToken();
    if (!token) return [];
    try {
      const res = await fetch(`${API_BASE}/trips`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      return res.ok ? await res.json() : [];
    } catch (err) {
      console.error(err);
      return [];
    }
  },
  saveTrips: (userTrips) => {},
  clearAuth: () => {
    localStorage.removeItem('traveloop_token');
    localStorage.removeItem('traveloop_user');
    localStorage.removeItem('traveloop_active_trip_id');
  }
};

// Default structures
const defaultSettings = {
  language: 'English',
  currency: 'INR',
  dateFormat: 'DD/MM/YYYY',
  timeFormat: '12 hour',
  units: 'Metric',
  notifications: {
    email: true,
    reminders: true,
    recommendations: false,
    budget: true
  },
  privacy: {
    publicProfile: true,
    searchResults: true,
    travelStats: true
  },
  twoFactorEnabled: false
};

// Mock Backend API Layer
// Backend API Layer
const api = {
  getProfile: async () => {
    const res = await fetch(`${API_BASE}/profile/me`, {
      headers: {
        'Authorization': `Bearer ${Store.getToken()}`
      }
    });
    if (!res.ok) throw new Error('Failed to load profile');
    return await res.json();
  },

  toggle2FA: async (enabled) => {
    const res = await fetch(`${API_BASE}/profile/2fa`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Store.getToken()}`
      },
      body: JSON.stringify({ enabled })
    });
    if (!res.ok) throw new Error('Failed to update 2FA status');
    return { success: true };
  },

  getSessions: async () => {
    const res = await fetch(`${API_BASE}/profile/sessions`, {
      headers: {
        'Authorization': `Bearer ${Store.getToken()}`
      }
    });
    if (!res.ok) throw new Error('Failed to load active sessions');
    return await res.json();
  },

  revokeSession: async (id) => {
    const res = await fetch(`${API_BASE}/profile/sessions/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${Store.getToken()}`
      }
    });
    if (!res.ok) throw new Error('Failed to revoke session');
    return { success: true };
  },

  revokeAllSessions: async () => {
    const res = await fetch(`${API_BASE}/profile/sessions`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${Store.getToken()}`
      }
    });
    if (!res.ok) throw new Error('Failed to revoke other sessions');
    return { success: true };
  },

  getSavedCities: async () => {
    const res = await fetch(`${API_BASE}/profile/saved-cities`, {
      headers: {
        'Authorization': `Bearer ${Store.getToken()}`
      }
    });
    if (!res.ok) throw new Error('Failed to load saved places');
    return await res.json();
  },

  removeSavedCity: async (cityId) => {
    const res = await fetch(`${API_BASE}/profile/saved-cities/${cityId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${Store.getToken()}`
      }
    });
    if (!res.ok) throw new Error('Failed to remove saved place');
    return { success: true };
  },

  updateProfile: async (profileData) => {
    const res = await fetch(`${API_BASE}/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Store.getToken()}`
      },
      body: JSON.stringify(profileData)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to update profile');
    return { success: true, user: data.user };
  },

  updateSettings: async (settingsData) => {
    const res = await fetch(`${API_BASE}/profile/settings`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Store.getToken()}`
      },
      body: JSON.stringify(settingsData)
    });
    if (!res.ok) throw new Error('Failed to update settings');
    return { success: true };
  },

  updateNotifications: async (notificationsData) => {
    const res = await fetch(`${API_BASE}/profile/notifications`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Store.getToken()}`
      },
      body: JSON.stringify(notificationsData)
    });
    if (!res.ok) throw new Error('Failed to update notification settings');
    return { success: true };
  },

  updatePrivacy: async (privacyData) => {
    const res = await fetch(`${API_BASE}/profile/privacy`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Store.getToken()}`
      },
      body: JSON.stringify(privacyData)
    });
    if (!res.ok) throw new Error('Failed to update privacy settings');
    return { success: true };
  },

  changePassword: async (currentPassword, newPassword) => {
    const res = await fetch(`${API_BASE}/auth/password`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Store.getToken()}`
      },
      body: JSON.stringify({ currentPassword, newPassword })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to update password');
    return { success: true };
  },

  deleteAccount: async () => {
    const res = await fetch(`${API_BASE}/auth/account`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${Store.getToken()}`
      }
    });
    if (!res.ok) throw new Error('Failed to delete account');
    return { success: true };
  }
};

// Global Page State
let activeUser = null;
let profileTrips = [];

// Initialize Page
document.addEventListener('DOMContentLoaded', async () => {
  // Check auth
  const token = Store.getToken();
  if (!token) {
    window.location.href = '../index.html';
    return;
  }

  try {
    activeUser = await api.getProfile();
    Store.setCurrentUser(activeUser);
  } catch (err) {
    console.error('Failed to load user profile:', err);
    Store.clearAuth();
    window.location.href = '../index.html';
    return;
  }

  // Load User statistics
  profileTrips = await Store.getTrips();
  
  // Render Sidebar, Forms, Sessions, Cities
  initSidebar();
  initProfileForm();
  initPreferencesForm();
  initNotifications();
  initSecurityTab();
  initSessions();
  initSavedPlaces();
  initPrivacyForm();
  initModalListeners();
  initMobileNavToggle();
});

// Toast notification function
function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  
  const toast = document.createElement('div');
  toast.className = `profile-toast profile-toast-${type}`;
  
  let iconClass = 'fa-check-circle';
  if (type === 'error') iconClass = 'fa-exclamation-circle';
  if (type === 'info') iconClass = 'fa-info-circle';
  
  toast.innerHTML = `
    <i class="fas ${iconClass}"></i>
    <span class="profile-toast-msg">${message}</span>
  `;
  
  container.appendChild(toast);
  
  // Fade out and remove
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, 3000);
}

// Mobile sidebar controls
function initMobileNavToggle() {
  const toggleBtn = document.getElementById('profile-sidebar-toggle-btn');
  const sidebar = document.getElementById('profile-sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  
  if (toggleBtn && sidebar && overlay) {
    toggleBtn.addEventListener('click', () => {
      sidebar.classList.add('active');
      overlay.classList.add('active');
    });
    
    overlay.addEventListener('click', () => {
      sidebar.classList.remove('active');
      overlay.classList.remove('active');
    });
  }
}

// Side navigation active element scroll
function switchSection(sectionId) {
  const target = document.getElementById(sectionId);
  if (!target) return;
  
  // Scroll smoothly
  target.scrollIntoView({ behavior: 'smooth' });
  
  // Close mobile navigation sidebar
  const sidebar = document.getElementById('profile-sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  if (sidebar && overlay) {
    sidebar.classList.remove('active');
    overlay.classList.remove('active');
  }

  // Find active nav item
  const navItems = document.querySelectorAll('.sidebar-nav-item');
  navItems.forEach(item => {
    item.classList.remove('active');
    // Check if click handler targets this section
    const clickAttr = item.getAttribute('onclick');
    if (clickAttr && clickAttr.includes(sectionId)) {
      item.classList.add('active');
    }
  });
}

// Render Sidebar Info
function initSidebar() {
  const nameEl = document.getElementById('sidebar-user-name');
  const emailEl = document.getElementById('sidebar-user-email');
  const avatarEl = document.getElementById('sidebar-avatar-container');
  
  if (nameEl) nameEl.textContent = activeUser.name || 'Traveler';
  if (emailEl) emailEl.textContent = activeUser.email || 'traveler@traveloop.com';
  
  renderAvatar(avatarEl, activeUser);
  
  // Statistics loading
  const statsTrips = document.getElementById('sidebar-stat-trips');
  const statsCountries = document.getElementById('sidebar-stat-countries');
  const statsCities = document.getElementById('sidebar-stat-cities');
  
  const statsTripsStrip = document.getElementById('stats-trips-count');
  const statsCountriesStrip = document.getElementById('stats-countries-count');
  const statsCitiesStrip = document.getElementById('stats-cities-count');
  
  // Compute trip statistics
  const countTrips = profileTrips.length;
  
  // Count unique cities and countries from destinations
  const uniqueCountries = new Set();
  const uniqueCities = new Set();
  
  profileTrips.forEach(t => {
    if (!t.destination) return;
    const parts = t.destination.split(',').map(s => s.trim());
    if (parts.length > 0) uniqueCities.add(parts[0]);
    if (parts.length > 1) {
      uniqueCountries.add(parts[parts.length - 1]);
    } else {
      uniqueCountries.add('India'); // Default
    }
  });
  
  const countCountries = uniqueCountries.size || (countTrips > 0 ? 1 : 0);
  const countCities = uniqueCities.size || countTrips;

  if (statsTrips) statsTrips.textContent = countTrips;
  if (statsCountries) statsCountries.textContent = countCountries;
  if (statsCities) statsCities.textContent = countCities;
  
  if (statsTripsStrip) statsTripsStrip.textContent = countTrips;
  if (statsCountriesStrip) statsCountriesStrip.textContent = countCountries;
  if (statsCitiesStrip) statsCitiesStrip.textContent = countCities;

  // Handle avatar file selector change
  const fileInput = document.getElementById('avatar-file-input');
  if (fileInput) {
    fileInput.addEventListener('change', handleAvatarSelect);
  }
}

// Helper: Render initials or Base64 Image for avatar container
function renderAvatar(container, user) {
  if (!container) return;
  if (user.avatar) {
    container.innerHTML = `<img src="${user.avatar}" alt="Avatar">`;
  } else {
    const initials = (user.name || 'Traveler')
      .split(' ')
      .map(n => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
    container.innerHTML = initials;
  }
}

// Avatar upload image handler
function handleAvatarSelect(e) {
  const file = e.target.files[0];
  if (!file) return;
  
  if (!file.type.startsWith('image/')) {
    showToast('Please select a valid image file.', 'error');
    return;
  }
  
  const reader = new FileReader();
  reader.onload = async function(event) {
    const base64Data = event.target.result;
    
    showToast('Uploading avatar...', 'info');
    try {
      const response = await api.updateProfile({ avatar: base64Data });
      if (response.success) {
        activeUser = response.user;
        Store.setCurrentUser(activeUser);
        
        // Update display in sidebar
        const sidebarAvatar = document.getElementById('sidebar-avatar-container');
        renderAvatar(sidebarAvatar, activeUser);
        showToast('Avatar updated successfully.', 'success');
      }
    } catch (err) {
      console.error(err);
      showToast(err.message || 'Failed to upload avatar.', 'error');
    }
  };
  reader.readAsDataURL(file);
}

// Input Blur Validators helper
function registerInputValidator(inputId, validationFn, errorMessage) {
  const input = document.getElementById(inputId);
  if (!input) return;
  
  input.addEventListener('blur', () => {
    validateField(input, validationFn, errorMessage);
  });
}

function validateField(inputElement, validationFn, errorMessage) {
  const container = inputElement.closest('.input-container-custom');
  if (!container) return false;
  
  // Clear previous state classes and messages
  container.classList.remove('error-state', 'success-state');
  const prevMsg = container.nextElementSibling;
  if (prevMsg && prevMsg.classList.contains('error-message-text')) {
    prevMsg.remove();
  }
  const prevIcon = container.querySelector('.validation-icon');
  if (prevIcon) prevIcon.remove();

  const value = inputElement.value.trim();
  
  // If not required and empty, don't show success/error
  if (!inputElement.required && value === '') {
    return true;
  }

  const isValid = validationFn(value);

  if (!isValid) {
    container.classList.add('error-state');
    const msg = document.createElement('div');
    msg.className = 'error-message-text';
    msg.innerHTML = `<i class="fas fa-circle-exclamation"></i> ${errorMessage}`;
    container.after(msg);
    
    const icon = document.createElement('i');
    icon.className = 'fas fa-circle-exclamation validation-icon error-icon';
    container.appendChild(icon);
    return false;
  } else {
    container.classList.add('success-state');
    const icon = document.createElement('i');
    icon.className = 'fas fa-check-circle validation-icon success-icon';
    container.appendChild(icon);
    return true;
  }
}

// Initialize Profile Forms
function initProfileForm() {
  const fullnameInput = document.getElementById('info-fullname');
  const usernameInput = document.getElementById('info-username');
  const emailInput = document.getElementById('info-email');
  const bioInput = document.getElementById('info-bio');
  const homecityInput = document.getElementById('info-homecity');
  
  if (fullnameInput) fullnameInput.value = activeUser.name || '';
  if (usernameInput) usernameInput.value = activeUser.username || '';
  if (emailInput) emailInput.value = activeUser.email || '';
  if (bioInput) {
    bioInput.value = activeUser.bio || '';
    document.getElementById('bio-char-counter').textContent = `${bioInput.value.length} / 160`;
    
    // Live char count listener
    bioInput.addEventListener('input', () => {
      const len = bioInput.value.length;
      const counter = document.getElementById('bio-char-counter');
      counter.textContent = `${len} / 160`;
      if (len > 160) {
        counter.classList.add('danger-limit');
      } else {
        counter.classList.remove('danger-limit');
      }
    });
  }
  if (homecityInput) homecityInput.value = activeUser.homecity || '';

  // Register live validators on blur
  registerInputValidator('info-fullname', 
    (val) => val.length >= 2 && val.length <= 50 && /^[a-zA-Z\s\-]+$/.test(val),
    'Full name must be 2-50 characters, letters only.'
  );
  registerInputValidator('info-username', 
    (val) => val.length >= 3 && val.length <= 20 && /^[a-zA-Z0-9_]+$/.test(val),
    'Username must be 3-20 characters, alphanumeric & underscores only.'
  );

}

// Handle Profile Form Submit Action
async function handleSaveProfile() {
  const fullnameInput = document.getElementById('info-fullname');
  const usernameInput = document.getElementById('info-username');
  const bioInput = document.getElementById('info-bio');
  const homecityInput = document.getElementById('info-homecity');

  // Trigger all validations
  const isNameVal = validateField(fullnameInput, (val) => val.length >= 2 && val.length <= 50 && /^[a-zA-Z\s\-]+$/.test(val), 'Full name must be 2-50 characters, letters only.');
  const isUserVal = validateField(usernameInput, (val) => val.length >= 3 && val.length <= 20 && /^[a-zA-Z0-9_]+$/.test(val), 'Username must be 3-20 characters, alphanumeric & underscores only.');

  if (bioInput.value.length > 160) {
    showToast('Bio cannot exceed 160 characters.', 'error');
    return;
  }

  if (!isNameVal || !isUserVal) {
    showToast('Please correct validation errors.', 'error');
    return;
  }

  showToast('Saving profile updates...', 'info');

  const profileData = {
    name: fullnameInput.value.trim(),
    username: usernameInput.value.trim(),
    bio: bioInput.value.trim(),
    homecity: homecityInput.value.trim()
  };

  const response = await api.updateProfile(profileData);
  if (response.success) {
    activeUser = response.user;
    initSidebar(); // Update name and initials
    showToast('Profile updated successfully.', 'success');
    
    // Clean success/error border highlights
    document.querySelectorAll('.input-container-custom').forEach(c => {
      c.classList.remove('success-state', 'error-state');
      const icon = c.querySelector('.validation-icon');
      if (icon) icon.remove();
    });
  }
}

// Cancel Profile Edit
function handleCancelProfile() {
  initProfileForm();
  showToast('Changes discarded.', 'info');
  document.querySelectorAll('.input-container-custom').forEach(c => {
    c.classList.remove('success-state', 'error-state');
    const msg = c.nextElementSibling;
    if (msg && msg.classList.contains('error-message-text')) msg.remove();
    const icon = c.querySelector('.validation-icon');
    if (icon) icon.remove();
  });
}

// Initialize Preferences Form
function initPreferencesForm() {
  const languageSelect = document.getElementById('pref-language');
  const currencySelect = document.getElementById('pref-currency');
  const dateFormatSelect = document.getElementById('pref-dateformat');
  const timeFormatSelect = document.getElementById('pref-timeformat');
  const unitsSelect = document.getElementById('pref-units');
  
  const settings = activeUser.settings || defaultSettings;
  
  if (languageSelect) languageSelect.value = settings.language || 'English';
  if (currencySelect) currencySelect.value = settings.currency || 'INR';
  if (dateFormatSelect) dateFormatSelect.value = settings.dateFormat || 'DD/MM/YYYY';
  if (timeFormatSelect) timeFormatSelect.value = settings.timeFormat || '12 hour';
  if (unitsSelect) unitsSelect.value = settings.units || 'Metric';
}

// Handle Save Preferences Action
async function handleSavePreferences() {
  const language = document.getElementById('pref-language').value;
  const currency = document.getElementById('pref-currency').value;
  const dateFormat = document.getElementById('pref-dateformat').value;
  const timeFormat = document.getElementById('pref-timeformat').value;
  const units = document.getElementById('pref-units').value;

  showToast('Saving preferences...', 'info');

  const settingsData = { language, currency, dateFormat, timeFormat, units };
  const response = await api.updateSettings(settingsData);
  
  if (response.success) {
    activeUser.settings = { ...activeUser.settings, ...settingsData };
    showToast('Preferences saved successfully.', 'success');
  }
}

// Initialize Notifications tab toggles
function initNotifications() {
  const settings = activeUser.settings || defaultSettings;
  const notifs = settings.notifications || defaultSettings.notifications;
  
  setToggleState('toggle-notif-email', notifs.email);
  setToggleState('toggle-notif-reminders', notifs.reminders);
  setToggleState('toggle-notif-recommendations', notifs.recommendations);
  setToggleState('toggle-notif-budget', notifs.budget);
}

function setToggleState(id, isActive) {
  const toggle = document.getElementById(id);
  if (!toggle) return;
  if (isActive) {
    toggle.classList.add('active');
  } else {
    toggle.classList.remove('active');
  }
}

// Handle Notification Toggle Action
async function handleNotificationToggle(key, element) {
  const isActive = !element.classList.contains('active');
  
  // Optimistic UI toggle
  if (isActive) {
    element.classList.add('active');
  } else {
    element.classList.remove('active');
  }

  try {
    const response = await api.updateNotifications({ [key]: isActive });
    if (response.success) {
      activeUser.settings.notifications[key] = isActive;
      showToast('Notification settings updated.', 'success');
    }
  } catch (error) {
    // Revert state
    if (isActive) {
      element.classList.remove('active');
    } else {
      element.classList.add('active');
    }
    showToast('Failed to update notification settings.', 'error');
  }
}

// Security Tab Logic (Password and 2FA)
function initSecurityTab() {
  const pwdInput = document.getElementById('pwd-new');
  if (pwdInput) {
    pwdInput.addEventListener('keyup', () => {
      checkPasswordStrength(pwdInput.value);
    });
  }

  // Toggle visible characters in inputs
  setupPasswordVisibilityToggle('toggle-pwd-current', 'pwd-current');
  setupPasswordVisibilityToggle('toggle-pwd-new', 'pwd-new');
  setupPasswordVisibilityToggle('toggle-pwd-confirm', 'pwd-confirm');

  // Render 2FA state Card
  renderTwoFactorCard();
}

function setupPasswordVisibilityToggle(btnId, inputId) {
  const btn = document.getElementById(btnId);
  const input = document.getElementById(inputId);
  if (!btn || !input) return;
  
  btn.addEventListener('click', () => {
    const icon = btn.querySelector('i');
    if (input.type === 'password') {
      input.type = 'text';
      icon.className = 'far fa-eye-slash';
    } else {
      input.type = 'password';
      icon.className = 'far fa-eye';
    }
  });
}

// Password Strength Meter checker
function checkPasswordStrength(password) {
  const ruleMinChar = document.getElementById('rule-min-char');
  const ruleUppercase = document.getElementById('rule-uppercase');
  const ruleNumber = document.getElementById('rule-number');
  const ruleSpecial = document.getElementById('rule-special');
  
  const rules = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[^A-Za-z0-9]/.test(password)
  };

  // Update list icons
  updateRuleUI(ruleMinChar, rules.length);
  updateRuleUI(ruleUppercase, rules.uppercase);
  updateRuleUI(ruleNumber, rules.number);
  updateRuleUI(ruleSpecial, rules.special);

  // Count met rules
  const score = Object.values(rules).filter(Boolean).length;
  
  const bars = document.getElementById('strength-bars').children;
  const strengthText = document.getElementById('strength-text');
  
  // Reset all bars
  for (let i = 0; i < 4; i++) {
    bars[i].className = 'strength-bar';
  }

  if (password === '') {
    strengthText.textContent = 'Weak';
    return;
  }

  // Update scores visual segments
  if (score === 1) {
    bars[0].classList.add('filled-red');
    strengthText.textContent = 'Weak';
    strengthText.style.color = 'var(--danger)';
  } else if (score === 2) {
    bars[0].classList.add('filled-orange');
    bars[1].classList.add('filled-orange');
    strengthText.textContent = 'Fair';
    strengthText.style.color = '#E67E22';
  } else if (score === 3) {
    bars[0].classList.add('filled-yellow');
    bars[1].classList.add('filled-yellow');
    bars[2].classList.add('filled-yellow');
    strengthText.textContent = 'Good';
    strengthText.style.color = '#F1C40F';
  } else if (score === 4) {
    bars[0].classList.add('filled-green');
    bars[1].classList.add('filled-green');
    bars[2].classList.add('filled-green');
    bars[3].classList.add('filled-green');
    strengthText.textContent = 'Strong';
    strengthText.style.color = 'var(--success)';
  }
}

function updateRuleUI(element, isMet) {
  if (!element) return;
  const icon = element.querySelector('i');
  if (isMet) {
    element.classList.add('met');
    icon.className = 'fas fa-check-circle';
  } else {
    element.classList.remove('met');
    icon.className = 'fas fa-times-circle';
  }
}

// Change Password Handler
async function handleChangePassword() {
  const currentPwd = document.getElementById('pwd-current');
  const newPwd = document.getElementById('pwd-new');
  const confirmPwd = document.getElementById('pwd-confirm');

  if (!currentPwd.value) {
    showToast('Please enter your current password.', 'error');
    return;
  }

  // Verify strong rules
  const score = [
    newPwd.value.length >= 8,
    /[A-Z]/.test(newPwd.value),
    /[0-9]/.test(newPwd.value),
    /[^A-Za-z0-9]/.test(newPwd.value)
  ].filter(Boolean).length;

  if (score < 4) {
    showToast('New password does not meet security rules.', 'error');
    return;
  }

  if (newPwd.value !== confirmPwd.value) {
    showToast('Password confirmation does not match.', 'error');
    return;
  }

  showToast('Updating password...', 'info');

  try {
    const response = await api.changePassword(currentPwd.value, newPwd.value);
    if (response.success) {
      showToast('Password updated successfully.', 'success');
      currentPwd.value = '';
      newPwd.value = '';
      confirmPwd.value = '';
      checkPasswordStrength(''); // Reset meter
    }
  } catch (error) {
    showToast(error.message || 'Failed to update password.', 'error');
  }
}

// Two-Factor Authentication Card Render
function renderTwoFactorCard() {
  const container = document.getElementById('two-factor-card-container');
  if (!container) return;
  
  const is2faActive = activeUser.settings.twoFactorEnabled;

  if (is2faActive) {
    container.innerHTML = `
      <div class="status-card-2fa enabled-2fa">
        <div class="icon-box-2fa"><i class="fas fa-shield-halved"></i></div>
        <div class="info-box-2fa">
          <span class="title-2fa">Two-Factor Authentication is active</span>
          <span class="desc-2fa">Your account is secured with 2FA code verification.</span>
          <div class="profile-btn-row" style="margin-top: 0;">
            <button type="button" class="profile-btn profile-btn-danger" style="padding: 0.5rem 1rem;" onclick="handleDisable2FA()">Disable 2FA</button>
          </div>
        </div>
      </div>
    `;
  } else {
    container.innerHTML = `
      <div class="status-card-2fa disabled-2fa">
        <div class="icon-box-2fa"><i class="fas fa-shield-halved"></i></div>
        <div class="info-box-2fa">
          <span class="title-2fa">Two-Factor Authentication is disabled</span>
          <span class="desc-2fa">Add an extra layer of protection to your account settings.</span>
          <div class="profile-btn-row" style="margin-top: 0;">
            <button type="button" class="profile-btn profile-btn-primary" style="padding: 0.5rem 1rem;" onclick="handleEnable2FA()">Enable 2FA</button>
          </div>
        </div>
      </div>
    `;
  }
}

// Two-Factor Authentication Action Buttons
function handleEnable2FA() {
  const modal = document.getElementById('two-factor-setup-modal');
  if (modal) {
    document.getElementById('two-factor-code-input').value = '';
    modal.classList.add('active');
  }
}

function close2FAModal() {
  const modal = document.getElementById('two-factor-setup-modal');
  if (modal) modal.classList.remove('active');
}

async function submitEnable2FA() {
  const code = document.getElementById('two-factor-code-input').value.trim();
  if (code.length !== 6 || !/^\d+$/.test(code)) {
    showToast('Please enter a valid 6-digit code.', 'error');
    return;
  }

  showToast('Enabling 2FA...', 'info');
  try {
    const response = await api.toggle2FA(true);
    if (response.success) {
      activeUser.settings.twoFactorEnabled = true;
      Store.setCurrentUser(activeUser);
      close2FAModal();
      renderTwoFactorCard();
      showToast('Two-factor authentication enabled successfully.', 'success');
    }
  } catch (err) {
    showToast('Failed to enable 2FA.', 'error');
  }
}

async function handleDisable2FA() {
  if (confirm('Disable Two-Factor Authentication? Your account will be less secure.')) {
    showToast('Disabling 2FA...', 'info');
    try {
      const response = await api.toggle2FA(false);
      if (response.success) {
        activeUser.settings.twoFactorEnabled = false;
        Store.setCurrentUser(activeUser);
        renderTwoFactorCard();
        showToast('Two-factor authentication disabled.', 'info');
      }
    } catch (err) {
      showToast('Failed to disable 2FA.', 'error');
    }
  }
}

// Active Sessions List Renders
async function initSessions() {
  const wrapper = document.getElementById('sessions-list-wrapper');
  if (!wrapper) return;
  
  // Render skeletons
  wrapper.innerHTML = `
    <div class="session-item skeleton-shimmer" style="height: 60px;"></div>
    <div class="session-item skeleton-shimmer" style="height: 60px;"></div>
  `;

  const sessions = await api.getSessions();
  renderSessionsList(sessions);
}

function renderSessionsList(sessions) {
  const wrapper = document.getElementById('sessions-list-wrapper');
  if (!wrapper) return;

  if (sessions.length === 0) {
    wrapper.innerHTML = `
      <div style="text-align: center; padding: 2rem; color: var(--text-secondary);">
        <i class="fas fa-desktop" style="font-size: 2rem; opacity: 0.15; margin-bottom: 0.5rem;"></i>
        <div>No active sessions found</div>
      </div>
    `;
    document.getElementById('revoke-all-sessions-btn-container').style.display = 'none';
    return;
  }

  document.getElementById('revoke-all-sessions-btn-container').style.display = 'block';

  wrapper.innerHTML = sessions.map(s => {
    let devIcon = 'fa-desktop';
    if (s.device === 'mobile') devIcon = 'fa-mobile-screen-button';
    if (s.device === 'tablet') devIcon = 'fa-tablet-screen-button';

    return `
      <div class="session-item" id="session-card-${s.id}">
        <div class="session-item-left">
          <div class="session-icon"><i class="fas ${devIcon}"></i></div>
          <div class="session-details">
            <span class="session-device-name">
              ${s.name}
              ${s.current ? '<span class="current-session-badge">Current device</span>' : ''}
            </span>
            <span class="session-location-time">${s.location} • ${s.lastActive}</span>
          </div>
        </div>
        ${!s.current ? `
          <button type="button" class="profile-btn profile-btn-secondary" style="padding: 0.4rem 0.85rem;" onclick="revokeSession('${s.id}')">
            Revoke
          </button>
        ` : ''}
      </div>
    `;
  }).join('');
}

// Revoke Device Session Actions
async function revokeSession(id) {
  const card = document.getElementById(`session-card-${id}`);
  if (card) {
    card.style.opacity = '0.5';
    card.style.pointerEvents = 'none';
  }

  const response = await api.revokeSession(id);
  if (response.success) {
    showToast('Device session revoked.', 'success');
    // Fetch and re-render list
    const sessions = await api.getSessions();
    renderSessionsList(sessions);
  }
}

function handleRevokeAllSessions() {
  const modal = document.getElementById('revoke-sessions-modal');
  if (modal) modal.classList.add('active');
}

function closeRevokeSessionsModal() {
  const modal = document.getElementById('revoke-sessions-modal');
  if (modal) modal.classList.remove('active');
}

async function submitRevokeAllSessions() {
  closeRevokeSessionsModal();
  showToast('Revoking other active sessions...', 'info');
  
  const response = await api.revokeAllSessions();
  if (response.success) {
    showToast('All other sessions revoked successfully.', 'success');
    const sessions = await api.getSessions();
    renderSessionsList(sessions);
  }
}

// Saved Places Bookmarks Load
async function initSavedPlaces() {
  const container = document.getElementById('saved-cities-grid-container');
  if (!container) return;

  container.innerHTML = `
    <div class="saved-city-card skeleton-shimmer" style="height: 80px;"></div>
    <div class="saved-city-card skeleton-shimmer" style="height: 80px;"></div>
    <div class="saved-city-card skeleton-shimmer" style="height: 80px;"></div>
  `;

  const cities = await api.getSavedCities();
  renderSavedCities(cities);
}

function renderSavedCities(cities) {
  const container = document.getElementById('saved-cities-grid-container');
  if (!container) return;

  if (cities.length === 0) {
    container.innerHTML = `
      <div style="grid-column: span 3; text-align: center; padding: 3rem 1.5rem; color: var(--text-secondary); border: 1px dashed var(--border); border-radius: var(--radius);">
        <i class="fas fa-bookmark" style="font-size: 2rem; opacity: 0.15; margin-bottom: 0.5rem;"></i>
        <div>No saved destinations. Browse activities to bookmark places!</div>
      </div>
    `;
    return;
  }

  container.innerHTML = cities.map(c => {
    return `
      <div class="saved-city-card" id="city-card-${c.id}">
        <h4 class="saved-city-name">${c.name}</h4>
        <span class="saved-city-country">${c.country}</span>
        <button type="button" class="remove-saved-city-btn" onclick="removeSavedCity('${c.id}')">
          <i class="fas fa-xmark"></i>
        </button>
      </div>
    `;
  }).join('');
}

// Remove Saved Cities Action
async function removeSavedCity(id) {
  const card = document.getElementById(`city-card-${id}`);
  if (card) {
    card.style.opacity = '0';
    card.style.transform = 'scale(0.8)';
    await new Promise(r => setTimeout(r, 200));
  }

  try {
    const response = await api.removeSavedCity(id);
    if (response.success) {
      showToast('Destination removed from bookmarks.', 'success');
      const cities = await api.getSavedCities();
      renderSavedCities(cities);
    }
  } catch (err) {
    showToast(err.message, 'error');
    if (card) {
      card.style.opacity = '1';
      card.style.transform = 'none';
    }
  }
}

// Initialize Privacy Settings
function initPrivacyForm() {
  const settings = activeUser.settings || defaultSettings;
  const privacy = settings.privacy || defaultSettings.privacy;
  
  setToggleState('toggle-priv-public', privacy.publicProfile);
  setToggleState('toggle-priv-search', privacy.searchResults);
  setToggleState('toggle-priv-stats', privacy.travelStats);
}

// Handle Save Privacy Settings Action
async function handleSavePrivacy() {
  const publicProfile = document.getElementById('toggle-priv-public').classList.contains('active');
  const searchResults = document.getElementById('toggle-priv-search').classList.contains('active');
  const travelStats = document.getElementById('toggle-priv-stats').classList.contains('active');

  showToast('Saving privacy configurations...', 'info');

  const privacyData = { publicProfile, searchResults, travelStats };
  const response = await api.updatePrivacy(privacyData);

  if (response.success) {
    activeUser.settings.privacy = privacyData;
    showToast('Privacy settings updated.', 'success');
  }
}

// Archive Data Exporter Simulators
async function handleExportData(type) {
  showToast(`Preparing export for your ${type} data...`, 'info');
  
  try {
    const res = await fetch(`${API_BASE}/profile/export`, {
      headers: {
        'Authorization': `Bearer ${Store.getToken()}`
      }
    });
    if (!res.ok) throw new Error('Failed to export data');
    const data = await res.json();

    let dataToExport = {};
    let filename = `traveloop_export_${type}_${new Date().toISOString().split('T')[0]}.json`;

    if (type === 'personal') {
      dataToExport = {
        name: data.profile.name,
        email: data.profile.email,
        username: data.profile.username,
        bio: data.profile.bio,
        phone: data.profile.phone,
        dob: data.profile.dob,
        homecity: data.profile.homecity,
        website: data.profile.website,
        preferences: data.profile.settings,
        savedPlaces: data.savedCities
      };
    } else if (type === 'trips') {
      dataToExport = data.trips;
    } else {
      // Export All as single package
      dataToExport = data;
    }

    const jsonStr = JSON.stringify(dataToExport, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showToast('Archive downloaded successfully.', 'success');
  } catch (err) {
    console.error(err);
    showToast('Failed to export data.', 'error');
  }
}

// Danger Zone Account Deletions
function initModalListeners() {
  const confirmEmailInput = document.getElementById('confirm-email-input');
  const confirmBtn = document.getElementById('modal-confirm-delete-btn');
  
  if (confirmEmailInput && confirmBtn) {
    confirmEmailInput.addEventListener('input', () => {
      if (confirmEmailInput.value.trim() === activeUser.email) {
        confirmBtn.removeAttribute('disabled');
      } else {
        confirmBtn.setAttribute('disabled', 'true');
      }
    });
  }
}

function handleDeleteAccount() {
  const modal = document.getElementById('delete-account-modal');
  if (modal) {
    document.getElementById('confirm-email-input').value = '';
    document.getElementById('confirm-email-label').textContent = `Please type your email (${activeUser.email}) to confirm`;
    document.getElementById('modal-confirm-delete-btn').setAttribute('disabled', 'true');
    modal.classList.add('active');
  }
}

function closeDeleteAccountModal() {
  const modal = document.getElementById('delete-account-modal');
  if (modal) modal.classList.remove('active');
}

async function submitDeleteAccount() {
  const confirmEmailInput = document.getElementById('confirm-email-input').value.trim();
  if (confirmEmailInput !== activeUser.email) {
    showToast('Incorrect email address.', 'error');
    return;
  }

  closeDeleteAccountModal();
  showToast('Permanently deleting your account and travel logs...', 'info');

  const response = await api.deleteAccount();
  if (response.success) {
    showToast('Account deleted. Redirecting to home...', 'success');
    setTimeout(() => {
      window.location.href = '../index.html';
    }, 1500);
  }
}

// Dark Mode Toggle Logic
function initDarkMode() {
  const toggleBtn = document.getElementById('dark-mode-toggle');
  
  const isDark = localStorage.getItem('traveloop_dark_mode') === 'true';
  if (isDark) {
    document.body.classList.add('dark-mode');
    if (toggleBtn) {
      const icon = toggleBtn.querySelector('i');
      if (icon) {
        icon.classList.remove('fa-moon');
        icon.classList.add('fa-sun');
      }
    }
  }

  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      document.body.classList.toggle('dark-mode');
      const currentlyDark = document.body.classList.contains('dark-mode');
      localStorage.setItem('traveloop_dark_mode', currentlyDark);
      
      const icon = toggleBtn.querySelector('i');
      if (icon) {
        if (currentlyDark) {
          icon.classList.remove('fa-moon');
          icon.classList.add('fa-sun');
        } else {
          icon.classList.remove('fa-sun');
          icon.classList.add('fa-moon');
        }
      }
    });
  }
}
document.addEventListener('DOMContentLoaded', initDarkMode);
