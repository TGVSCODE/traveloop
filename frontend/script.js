/**
  Traveloop Frontend JavaScript
  Implements Router Guards, Mock Data Store, Responsive Nav, Toasts, 
  and all 16 page initializers using Vanilla JavaScript.
 */

// --- UTILS & GLOBAL HELPERS ---

// Toast Notifications Helper
function showToast(message, type = 'info') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  let iconClass = 'fa-info-circle';
  if (type === 'success') iconClass = 'fa-check-circle';
  if (type === 'warning') iconClass = 'fa-exclamation-triangle';
  if (type === 'error') iconClass = 'fa-exclamation-circle';

  toast.innerHTML = `
    <i class="fas ${iconClass} toast-icon"></i>
    <div class="toast-message">${message}</div>
  `;

  container.appendChild(toast);

  // Auto remove toast
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// --- WEATHER SAFETY SYSTEM ---
function ensureWeatherRiskModal() {
  if (document.getElementById('weather-risk-modal')) return;
  const modalHTML = `
    <div class="modal" id="weather-risk-modal">
      <div class="modal-content" style="max-width:450px;">
        <div class="modal-header">
          <h3 style="color:var(--warning); display:flex; align-items:center; gap:8px;"><i class="fas fa-exclamation-triangle"></i> Weather Safety Warning</h3>
          <button class="modal-close" onclick="document.getElementById('weather-risk-modal').classList.remove('active')"><i class="fas fa-times"></i></button>
        </div>
        <div class="modal-body" style="padding-top:1rem; display:flex; flex-direction:column; gap:1rem;">
          <p id="weather-risk-reason" style="font-weight:600; color:var(--text-primary); margin:0;"></p>
          <div style="background:rgba(255,255,255,0.05); padding:1rem; border-radius:8px; border-left:3px solid var(--accent);">
            <p id="weather-risk-alternate" style="color:var(--text-secondary); font-size:0.9rem; line-height:1.5; margin:0;"></p>
          </div>
          <div style="background:rgba(255,193,7,0.1); border:1px solid rgba(255,193,7,0.3); border-radius:8px; padding:0.75rem; font-size:0.85rem; color:var(--warning);">
            Are you sure you want to schedule this activity despite the forecasted conditions?
          </div>
        </div>
        <div class="modal-footer" style="display:flex; justify-content:flex-end; gap:0.5rem; margin-top:1rem;">
          <button type="button" class="btn btn-secondary" onclick="document.getElementById('weather-risk-modal').classList.remove('active')" style="width:auto;">Cancel</button>
          <button type="button" class="btn btn-primary" id="weather-risk-proceed-btn" style="width:auto; background:var(--warning); border-color:var(--warning); color:#000; font-weight:bold;">Add Anyway</button>
        </div>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', modalHTML);
}

async function assessWeatherRisk(city, targetDate, category) {
  try {
    const isOutdoor = (cat) => {
      const c = (cat || '').toLowerCase();
      return c.includes('adventure') || c.includes('nature') || c.includes('sightseeing') || c.includes('park') || c.includes('water') || c.includes('tour') || c.includes('landmark');
    };
    if (!isOutdoor(category)) return { isRisky: false };

    // Geocode city
    const geoRes = await fetch(`https://geocode.maps.co/search?q=${encodeURIComponent(city)}`);
    const geoData = await geoRes.json();
    if (!geoData || geoData.length === 0) return { isRisky: false };
    const { lat, lon } = geoData[0];

    // Fetch up to 14 days forecast
    const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=weathercode,uv_index_max&timezone=auto&forecast_days=14`);
    const weatherData = await weatherRes.json();
    if (!weatherData.daily) return { isRisky: false };

    const dateStr = new Date(targetDate).toISOString().split('T')[0];
    const dateIdx = weatherData.daily.time.indexOf(dateStr);
    
    // If we have a forecast for that day
    if (dateIdx !== -1) {
      const weathercode = weatherData.daily.weathercode[dateIdx];
      const uv = weatherData.daily.uv_index_max[dateIdx];
      const isRainy = (weathercode >= 51 && weathercode <= 67) || (weathercode >= 80 && weathercode <= 82) || (weathercode >= 95);

      if (isRainy) {
        return {
          isRisky: true,
          reason: "Heavy rain or severe storms are forecasted on this date.",
          alternate: "Outdoor/nature activities are highly risky. We recommend choosing an indoor activity like a Museum, Art Gallery, or Cooking Workshop."
        };
      }
      if (uv > 8) {
        return {
          isRisky: true,
          reason: "Extreme heatwave (High UV) is forecasted.",
          alternate: "Thermal exhaustion risk. We recommend scheduling this for early morning or switching to an indoor/shaded activity."
        };
      }
    }
  } catch (err) {
    console.warn("Weather risk check failed:", err);
  }
  return { isRisky: false };
}

function handleWeatherRiskWarning(riskData, onProceed) {
  ensureWeatherRiskModal();
  const modal = document.getElementById('weather-risk-modal');
  document.getElementById('weather-risk-reason').innerText = riskData.reason;
  document.getElementById('weather-risk-alternate').innerText = riskData.alternate;
  
  const proceedBtn = document.getElementById('weather-risk-proceed-btn');
  // Remove old listeners by cloning
  const newProceedBtn = proceedBtn.cloneNode(true);
  proceedBtn.parentNode.replaceChild(newProceedBtn, proceedBtn);
  
  newProceedBtn.addEventListener('click', () => {
    modal.classList.remove('active');
    onProceed();
  });
  
  modal.classList.add('active');
}


// Get Page Name from URL
function getPageName() {
  const path = window.location.pathname;
  // Split on either slash or backslash and get the last element
  let filename = path.split(/[/\\]/).pop();
  
  // Strip query parameters
  if (filename.includes('?')) {
    filename = filename.split('?')[0];
  }
  // Strip hash tags
  if (filename.includes('#')) {
    filename = filename.split('#')[0];
  }
  
  const resolvedPage = filename || 'index.html';
  console.log('[Traveloop Router] Resolved page name:', resolvedPage);
  return resolvedPage;
}

// Vercel handles production routing via vercel.json rewrite
const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:5000/api'
  : '/api';

// Data Management Store connecting to MySQL Backend via Express API
const Store = {
  getUsers: async () => {
    try {
      const res = await fetch(`${API_BASE}/auth/users`);
      if (!res.ok) throw new Error('Failed to fetch user list');
      return await res.json();
    } catch (err) {
      console.error(err);
      return [];
    }
  },
  saveUsers: (users) => {
    // Users are saved in the DB via signup, this function is a stub for compatibility
  },

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
      if (!res.ok) throw new Error('Failed to load trips');
      return await res.json();
    } catch (err) {
      console.error(err);
      return [];
    }
  },
  saveTrips: async (userTrips) => {
    const token = Store.getToken();
    if (!token) return;

    try {
      const dbTrips = await Store.getTrips();
      const dbTripsMap = {};
      dbTrips.forEach(t => dbTripsMap[t.id] = t);
      
      const userTripsMap = {};
      userTrips.forEach(t => userTripsMap[t.id] = t);

      // Handle Deleted Trips
      for (const dbTrip of dbTrips) {
        if (!userTripsMap[dbTrip.id]) {
          await fetch(`${API_BASE}/trips/${dbTrip.id}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
        }
      }

      // Handle Additions and Updates
      for (const userTrip of userTrips) {
        const dbTrip = dbTripsMap[userTrip.id];
        
        if (!dbTrip) {
          // New trip
          const res = await fetch(`${API_BASE}/trips`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(userTrip)
          });
          if (res.ok) {
            await fetch(`${API_BASE}/trips/${userTrip.id}/sync`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify(userTrip)
            });
          }
        } else {
          // Existing trip, update metadata and sync
          await fetch(`${API_BASE}/trips/${userTrip.id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(userTrip)
          });
          
          await fetch(`${API_BASE}/trips/${userTrip.id}/sync`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(userTrip)
          });
        }
      }
    } catch (err) {
      console.error('Error syncing trips to backend:', err);
    }
  },

  clearAuth: () => {
    localStorage.removeItem('traveloop_token');
    localStorage.removeItem('traveloop_user');
    localStorage.removeItem('traveloop_active_trip_id');
  }
};

// Global Auth Guard
function initAuthGuard() {
  const page = getPageName();
  const token = Store.getToken();
  const user = Store.getCurrentUser();

  const publicPages = ['index.html', 'login.html', 'signup.html', 'shared.html'];
  const isPublic = publicPages.includes(page);

  // If user tries to access a protected page without a token, redirect to landing page.
  if (!token && !isPublic) {
    window.location.href = 'index.html';
    return;
  }
  
  // Protect admin panel
  if (page === 'admin.html' && (!user || user.role !== 'admin')) {
    window.location.href = 'dashboard.html';
    return;
  }

  // Restrict admin from traveler tools
  const travelerPages = ['dashboard.html', 'trips.html', 'create-trip.html', 'itinerary.html', 'activities.html', 'weather.html', 'budget.html', 'checklist.html', 'notes.html'];
  if (user && user.role === 'admin' && travelerPages.includes(page)) {
    window.location.href = 'admin.html';
    return;
  }
}

// Render Sidebar Header & Footer User Details
function initSidebarNav() {
  const sidebar = document.querySelector('.sidebar');
  if (!sidebar) return;

  // Insert sidebar user info dynamically
  const user = Store.getCurrentUser();
  const userSnippet = sidebar.querySelector('.user-snippet');
  if (userSnippet && user) {
    const initials = user.name ? user.name.split(' ').map(n => n[0]).join('').toUpperCase() : 'U';
    const avatarHtml = user.avatar && user.avatar.startsWith('data:image') 
      ? `<img src="${user.avatar}" alt="Avatar" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`
      : initials;
      
    userSnippet.innerHTML = `
      <div class="user-avatar" style="overflow:hidden;">${avatarHtml}</div>
      <div class="user-info">
        <span class="user-name">${user.name || 'Traveler'}</span>
        <span class="user-role">${user.email || 'traveler@traveloop.com'}</span>
      </div>
    `;
    userSnippet.style.cursor = 'pointer';
    userSnippet.onclick = () => window.location.href = 'profile.html';
  }

  // Handle link visibility based on role
  if (!user || user.role !== 'admin') {
    const adminLinks = document.querySelectorAll('a[href="admin.html"]');
    adminLinks.forEach(link => {
      if (link.parentElement && link.parentElement.tagName.toUpperCase() === 'LI') {
        link.parentElement.style.display = 'none';
      } else {
        link.style.display = 'none';
      }
    });
  } else {
    const travelerLinks = document.querySelectorAll('a[href="dashboard.html"], a[href="trips.html"], a[href="create-trip.html"], a[href="itinerary.html"], a[href="activities.html"], a[href="weather.html"], a[href="budget.html"], a[href="checklist.html"], a[href="notes.html"]');
    travelerLinks.forEach(link => {
      if (link.parentElement && link.parentElement.tagName.toUpperCase() === 'LI') {
        link.parentElement.style.display = 'none';
      } else {
        link.style.display = 'none';
      }
    });
  }

  // Handle Logout Button click
  const logoutBtn = sidebar.querySelector('.btn-logout');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      Store.clearAuth();
      showToast('Logged out successfully', 'success');
      setTimeout(() => {
        window.location.href = 'index.html';
      }, 1000);
    });
  }

  // Bind Sidebar Toggle Button (Hamburger Menu)
  const toggleBtn = document.querySelector('.sidebar-toggle-btn');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      sidebar.classList.toggle('active');
    });
  }
}

// Helper to show visual loading state
function toggleLoading(elementId, show, skeletonCount = 3) {
  const container = document.getElementById(elementId);
  if (!container) return;

  if (show) {
    container.innerHTML = Array(skeletonCount).fill(0).map(() => `
      <div class="card" style="opacity: 0.6; min-height: 120px; display:flex; flex-direction:column; gap: 10px; animation: pulse 1.5s infinite ease-in-out;">
        <div style="background: rgba(255,255,255,0.08); height: 20px; width: 60%; border-radius: 4px;"></div>
        <div style="background: rgba(255,255,255,0.04); height: 16px; width: 80%; border-radius: 4px;"></div>
        <div style="background: rgba(255,255,255,0.04); height: 16px; width: 40%; border-radius: 4px;"></div>
      </div>
    `).join('');
  }
}

// Add animation keyframe rule for skeletons dynamically
(function addPulseKeyframes() {
  const style = document.createElement('style');
  style.innerHTML = `
    @keyframes pulse {
      0% { opacity: 0.4; }
      50% { opacity: 0.8; }
      100% { opacity: 0.4; }
    }
  `;
  document.head.appendChild(style);
})();

// Global Trip Selection Guard & UI Orchestrator
async function initGlobalTripSelection() {
  const page = getPageName();
  
  const tripPages = {
    'itinerary.html': 'Itinerary Builder',
    'budget.html': 'Budget Tracker',
    'checklist.html': 'Packing Checklist',
    'notes.html': 'Travel Journal',
    'activities.html': 'Find Activities',
    'weather.html': 'Weather Advisory',
    'shared.html': 'Shared Trip'
  };

  const isTripPage = page in tripPages;
  if (!isTripPage) return;

  const urlParams = new URLSearchParams(window.location.search);
  let tripId = urlParams.get('tripId');
  const trips = await Store.getTrips();

  // If tripId is passed in URL, update active trip ID
  if (tripId && trips.find(t => t.id === tripId)) {
    localStorage.setItem('traveloop_active_trip_id', tripId);
  } else {
    // Check localStorage
    tripId = localStorage.getItem('traveloop_active_trip_id');
  }

  // Validate tripId exists in user's trips
  const selectedTrip = trips.find(t => t.id === tripId);
  
  if (!selectedTrip) {
    // Remove invalid ID
    localStorage.removeItem('traveloop_active_trip_id');
  }

  const pageHeader = document.querySelector('.page-header');
  const mainContent = document.querySelector('.main-content');

  // 1. Inject Breadcrumb & Selector Dropdown
  if (pageHeader && mainContent) {
    // Breadcrumbs
    let breadcrumb = document.querySelector('.breadcrumb-container');
    if (!breadcrumb) {
      breadcrumb = document.createElement('div');
      breadcrumb.className = 'breadcrumb-container';
      mainContent.insertBefore(breadcrumb, pageHeader);
    }
    const tripName = selectedTrip ? selectedTrip.name : 'No Selected Trip';
    const pageTitleText = tripPages[page];
    breadcrumb.innerHTML = `
      <div class="breadcrumb-item"><a href="dashboard.html" class="breadcrumb-link">Dashboard</a></div>
      <span class="breadcrumb-separator"><i class="fas fa-chevron-right"></i></span>
      <div class="breadcrumb-item"><a href="trips.html" class="breadcrumb-link">My Trips</a></div>
      <span class="breadcrumb-separator"><i class="fas fa-chevron-right"></i></span>
      <div class="breadcrumb-item"><span class="breadcrumb-link">${tripName}</span></div>
      <span class="breadcrumb-separator"><i class="fas fa-chevron-right"></i></span>
      <div class="breadcrumb-item"><span class="breadcrumb-current">${pageTitleText}</span></div>
    `;

    // Selector Dropdown inside .page-header right button group
    const rightGroup = pageHeader.querySelector('div[style*="display:flex"]') || pageHeader.querySelector('div:last-child');
    if (rightGroup) {
      let selectorWrapper = rightGroup.querySelector('.trip-selector-dropdown-wrapper');
      if (!selectorWrapper) {
        selectorWrapper = document.createElement('div');
        selectorWrapper.className = 'trip-selector-dropdown-wrapper';
        rightGroup.insertBefore(selectorWrapper, rightGroup.firstChild);
      }

      const currentTripName = selectedTrip ? selectedTrip.name : 'Select a Trip';
      const currentTripIcon = selectedTrip ? 'fa-plane-departure' : 'fa-compass';

      selectorWrapper.innerHTML = `
        <button class="trip-selector-btn">
          <i class="fas ${currentTripIcon}"></i>
          <span class="trip-selector-label">${currentTripName}</span>
          <i class="fas fa-chevron-down"></i>
        </button>
        <div class="trip-selector-dropdown-menu">
          <div class="trip-dropdown-search-wrapper">
            <i class="fas fa-search"></i>
            <input type="text" class="trip-dropdown-search" placeholder="Search trips...">
          </div>
          <div class="trip-dropdown-list">
            <!-- Populated dynamically -->
          </div>
          <div class="trip-dropdown-footer">
            <button class="trip-dropdown-footer-btn create-new-trip-btn">
              <i class="fas fa-plus"></i> Plan New Trip
            </button>
          </div>
        </div>
      `;

      const btn = selectorWrapper.querySelector('.trip-selector-btn');
      const menu = selectorWrapper.querySelector('.trip-selector-dropdown-menu');
      const searchInput = selectorWrapper.querySelector('.trip-dropdown-search');
      const listContainer = selectorWrapper.querySelector('.trip-dropdown-list');
      const createBtn = selectorWrapper.querySelector('.create-new-trip-btn');

      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        btn.classList.toggle('active');
        menu.classList.toggle('active');
      });

      document.addEventListener('click', (e) => {
        if (!selectorWrapper.contains(e.target)) {
          btn.classList.remove('active');
          menu.classList.remove('active');
        }
      });

      const selectTripAndReload = (id) => {
        localStorage.setItem('traveloop_active_trip_id', id);
        showToast(`Switched trip to ${trips.find(t => t.id === id).name}!`, 'success');
        
        if (mainContent) {
          mainContent.style.opacity = '0';
          mainContent.style.transform = 'translateY(8px)';
          mainContent.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
        }
        
        setTimeout(() => {
          const url = new URL(window.location.href);
          url.searchParams.set('tripId', id);
          window.location.href = url.toString();
        }, 200);
      };

      const populateDropdownList = (query = '') => {
        const filtered = trips.filter(t => t.name.toLowerCase().includes(query.toLowerCase()) || t.destination.toLowerCase().includes(query.toLowerCase()));
        if (filtered.length === 0) {
          listContainer.innerHTML = `<div style="text-align:center; padding:1rem; font-size:0.8rem; color:var(--text-secondary);">No trips found</div>`;
          return;
        }
        listContainer.innerHTML = filtered.map(t => {
          const isActive = selectedTrip && selectedTrip.id === t.id;
          return `
            <div class="trip-dropdown-item ${isActive ? 'active' : ''}" data-id="${t.id}">
              <div class="trip-dropdown-item-details">
                <span class="trip-dropdown-item-name">${t.name}</span>
                <span class="trip-dropdown-item-dest"><i class="fas fa-map-marker-alt" style="margin-right:4px;"></i>${t.destination}</span>
              </div>
              ${isActive ? '<i class="fas fa-check" style="font-size:0.8rem;"></i>' : ''}
            </div>
          `;
        }).join('');

        listContainer.querySelectorAll('.trip-dropdown-item').forEach(item => {
          item.addEventListener('click', () => {
            selectTripAndReload(item.getAttribute('data-id'));
          });
        });
      };

      searchInput.addEventListener('input', () => {
        populateDropdownList(searchInput.value);
      });

      populateDropdownList();

      createBtn.addEventListener('click', () => {
        window.location.href = 'create-trip.html';
      });
    }
  }

  // 2. Sidebar Selected Trip Indicator
  const sidebar = document.querySelector('.sidebar');
  if (sidebar) {
    const existingIndicator = sidebar.querySelector('.sidebar-active-trip');
    if (existingIndicator) existingIndicator.remove();

    const sidebarHeader = sidebar.querySelector('.sidebar-header');
    if (sidebarHeader) {
      const indicator = document.createElement('div');
      indicator.className = 'sidebar-active-trip';

      const statusDotClass = selectedTrip ? '' : 'inactive';
      const statusText = selectedTrip ? 'Selected Trip' : 'No Trip Selected';
      const tripNameText = selectedTrip ? selectedTrip.name : 'None';

      indicator.innerHTML = `
        <div class="sidebar-active-trip-header">
          <span class="sidebar-active-trip-status-dot ${statusDotClass}"></span>
          <span>${statusText}</span>
        </div>
        <div class="sidebar-active-trip-name">${tripNameText}</div>
      `;

      sidebarHeader.parentNode.insertBefore(indicator, sidebarHeader.nextSibling);
    }
  }

  // 3. Hide details and show empty state if no selected trip
  if (!selectedTrip) {
    // Hide page contents
    if (mainContent) {
      const children = Array.from(mainContent.children);
      children.forEach(child => {
        if (child !== pageHeader && child !== breadcrumb && child.id !== 'global-trip-empty-state' && !child.classList.contains('mobile-nav')) {
          child.classList.add('trip-content-hidden');
        }
      });

      // Render Empty State UI
      let emptyState = document.getElementById('global-trip-empty-state');
      if (!emptyState) {
        emptyState = document.createElement('div');
        emptyState.id = 'global-trip-empty-state';
        emptyState.className = 'trip-empty-state-card';
        mainContent.appendChild(emptyState);
      }

      emptyState.innerHTML = `
        <div class="trip-empty-icon-wrapper">
          <i class="fas fa-compass trip-empty-icon"></i>
        </div>
        <h2 class="trip-empty-title">Please select a trip to continue</h2>
        <p class="trip-empty-description">
          To view and manage your itineraries, travel budgets, checklists, or journal logs, please select one of your existing trips or create a new planning card.
        </p>

        <div class="trip-empty-search-container">
          <i class="fas fa-search"></i>
          <input type="text" class="trip-empty-search-input" placeholder="Search your trips by name or destination...">
        </div>

        <div class="trip-empty-recent-header">
          <span>Recent Planned Trips</span>
          <i class="fas fa-clock-rotate-left"></i>
        </div>

        <div class="trip-empty-recent-list">
          <!-- Rendered dynamically -->
        </div>

        <div class="trip-empty-actions">
          <a href="create-trip.html" class="btn btn-primary"><i class="fas fa-plus"></i> Create New Trip</a>
          <a href="trips.html" class="btn btn-secondary"><i class="fas fa-map-marked-alt"></i> View All Trips</a>
        </div>
      `;

      const emptySearchInput = emptyState.querySelector('.trip-empty-search-input');
      const recentListContainer = emptyState.querySelector('.trip-empty-recent-list');

      const selectTripAndReload = (id) => {
        localStorage.setItem('traveloop_active_trip_id', id);
        showToast(`Switched trip to ${trips.find(t => t.id === id).name}!`, 'success');
        
        mainContent.style.opacity = '0';
        mainContent.style.transform = 'translateY(8px)';
        mainContent.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
        
        setTimeout(() => {
          const url = new URL(window.location.href);
          url.searchParams.set('tripId', id);
          window.location.href = url.toString();
        }, 200);
      };

      const populateRecentList = (query = '') => {
        const filtered = trips.filter(t => t.name.toLowerCase().includes(query.toLowerCase()) || t.destination.toLowerCase().includes(query.toLowerCase()));
        
        if (filtered.length === 0) {
          recentListContainer.innerHTML = `
            <div style="padding:1.5rem; text-align:center; color:var(--text-secondary); border: 1px dashed var(--glass-border); border-radius:12px; font-size:0.9rem;">
              No trips found matching "${query}".
            </div>`;
          return;
        }

        const recentTrips = [...filtered].reverse().slice(0, 3);

        recentListContainer.innerHTML = recentTrips.map(t => `
          <div class="trip-empty-recent-item" data-id="${t.id}">
            <div class="trip-empty-recent-details">
              <span class="trip-empty-recent-name">${t.name}</span>
              <span class="trip-empty-recent-dest"><i class="fas fa-map-marker-alt"></i> ${t.destination}</span>
            </div>
            <span class="trip-empty-recent-dates">${t.startDate} - ${t.endDate}</span>
          </div>
        `).join('');

        recentListContainer.querySelectorAll('.trip-empty-recent-item').forEach(item => {
          item.addEventListener('click', () => {
            selectTripAndReload(item.getAttribute('data-id'));
          });
        });
      };

      emptySearchInput.addEventListener('input', () => {
        populateRecentList(emptySearchInput.value);
      });

      populateRecentList();
    }
  } else {
    // If selected, ensure empty state is hidden/removed
    const emptyState = document.getElementById('global-trip-empty-state');
    if (emptyState) emptyState.remove();

    // Show contents
    if (mainContent) {
      const children = Array.from(mainContent.children);
      children.forEach(child => {
        child.classList.remove('trip-content-hidden');
      });
    }

    // Update dynamic headings with selected trip name
    if (page === 'itinerary.html') {
      const titleEl = document.getElementById('itinerary-trip-title');
      if (titleEl) titleEl.textContent = `Itinerary: ${selectedTrip.name}`;
    } else if (page === 'budget.html') {
      const titleEl = document.getElementById('budget-trip-title');
      if (titleEl) titleEl.textContent = `Budgeting: ${selectedTrip.name}`;
    } else if (page === 'checklist.html') {
      const titleEl = document.getElementById('checklist-trip-title');
      if (titleEl) titleEl.textContent = `Packing Checklist: ${selectedTrip.name}`;
    }
  }
}

// --- PAGE INITIALIZERS ---

// 1. Landing Page (index.html)
function initLandingPage() {
  // Empty content, just redirects handled by auth check.
}

// 2. Signup Page (signup.html)
function initSignupPage() {
  const form = document.getElementById('signup-form');
  if (!form) return;

  // Password visibility toggle
  const passToggle = document.getElementById('toggle-password');
  const confirmPassToggle = document.getElementById('toggle-confirm-password');
  const passwordInput = document.getElementById('password');
  const confirmPasswordInput = document.getElementById('confirm-password');

  if (passToggle && passwordInput) {
    passToggle.addEventListener('click', () => {
      const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
      passwordInput.setAttribute('type', type);
      passToggle.querySelector('i').classList.toggle('fa-eye');
      passToggle.querySelector('i').classList.toggle('fa-eye-slash');
    });
  }

  if (confirmPassToggle && confirmPasswordInput) {
    confirmPassToggle.addEventListener('click', () => {
      const type = confirmPasswordInput.getAttribute('type') === 'password' ? 'text' : 'password';
      confirmPasswordInput.setAttribute('type', type);
      confirmPassToggle.querySelector('i').classList.toggle('fa-eye');
      confirmPassToggle.querySelector('i').classList.toggle('fa-eye-slash');
    });
  }

  const checkSignupPasswordStrength = (password) => {
    const rules = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      number: /[0-9]/.test(password),
      special: /[^A-Za-z0-9]/.test(password)
    };

    const updateRuleUI = (id, isMet) => {
      const el = document.getElementById(id);
      if (!el) return;
      const icon = el.querySelector('i');
      if (isMet) {
        el.classList.add('met');
        el.style.color = 'var(--success)';
        icon.className = 'fas fa-check-circle';
      } else {
        el.classList.remove('met');
        el.style.color = 'var(--text-secondary)';
        icon.className = 'fas fa-times-circle';
      }
    };

    updateRuleUI('rule-min-char', rules.length);
    updateRuleUI('rule-uppercase', rules.uppercase);
    updateRuleUI('rule-number', rules.number);
    updateRuleUI('rule-special', rules.special);
    
    return rules.length && rules.uppercase && rules.number && rules.special;
  };

  if (passwordInput) {
    passwordInput.addEventListener('keyup', () => {
      checkSignupPasswordStrength(passwordInput.value);
    });
  }

  // Form Submit Handler
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fullName = document.getElementById('fullname').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirm-password').value;

    // Validation checks
    if (!fullName || !email || !password || !confirmPassword) {
      showToast('Please fill in all fields', 'error');
      return;
    }

    if (!/\S+@\S+\.\S+/.test(email)) {
      showToast('Please enter a valid email address', 'error');
      return;
    }

    if (!checkSignupPasswordStrength(password)) {
      showToast('Password does not meet all requirements', 'error');
      return;
    }

    if (password !== confirmPassword) {
      showToast('Passwords do not match', 'error');
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: fullName, email, password })
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.message || 'Registration failed', 'error');
        return;
      }

      showToast('Registration successful! Redirecting to login...', 'success');
      setTimeout(() => {
        window.location.href = 'login.html';
      }, 1500);
    } catch (err) {
      console.error(err);
      showToast('Registration error, please try again', 'error');
    }
  });
}

// 3. Login Page (login.html)
function initLoginPage() {
  const form = document.getElementById('login-form');
  if (!form) return;

  const savedEmail = localStorage.getItem('traveloop_saved_email');
  if (savedEmail) {
    const emailInput = document.getElementById('email');
    const rememberCheckbox = document.getElementById('remember-me');
    if (emailInput) emailInput.value = savedEmail;
    if (rememberCheckbox) rememberCheckbox.checked = true;
  }

  // Password visibility toggle
  const passToggle = document.getElementById('toggle-password');
  const passwordInput = document.getElementById('password');

  if (passToggle && passwordInput) {
    passToggle.addEventListener('click', () => {
      const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
      passwordInput.setAttribute('type', type);
      passToggle.querySelector('i').classList.toggle('fa-eye');
      passToggle.querySelector('i').classList.toggle('fa-eye-slash');
    });
  }

  // Form Submit Handler
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const rememberMe = document.getElementById('remember-me').checked;

    if (!email || !password) {
      showToast('Please fill in all fields', 'error');
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.message || 'Invalid email or password', 'error');
        return;
      }

      // Save credentials
      Store.setCurrentUser(data.user);
      Store.setToken(data.token);

      if (rememberMe) {
        localStorage.setItem('traveloop_saved_email', email);
      } else {
        localStorage.removeItem('traveloop_saved_email');
      }

      if (data.user.role === 'admin') {
        showToast('Login successful! Redirecting to Admin Panel...', 'success');
        setTimeout(() => {
          window.location.href = 'admin.html';
        }, 1200);
      } else {
        showToast('Login successful! Redirecting to dashboard...', 'success');
        setTimeout(() => {
          window.location.href = 'dashboard.html';
        }, 1200);
      }
    } catch (err) {
      console.error(err);
      showToast('Login error, please try again', 'error');
    }
  });
}

// 4. Dashboard (dashboard.html)
async function initDashboardPage() {
  const user = Store.getCurrentUser();
  const trips = await Store.getTrips();

  // Fetch Announcement
  try {
    const annRes = await fetch(`${API_BASE}/profile/announcements`, {
      headers: { 'Authorization': `Bearer ${Store.getToken()}` }
    });
    if (annRes.ok) {
      const announcements = await annRes.json();
      if (announcements && announcements.length > 0) {
        const ann = announcements[0];
        const mainContent = document.querySelector('.main-content');
        const annDiv = document.createElement('div');
        annDiv.className = `alert alert-${ann.type === 'error' || ann.type === 'warning' ? 'warning' : 'info'}`;
        annDiv.style.cssText = `background: rgba(${ann.type === 'warning' ? '255,152,0' : ann.type === 'success' ? '22,199,154' : '233,69,96'}, 0.1); border-left: 4px solid var(--${ann.type === 'warning' ? 'warning' : ann.type === 'success' ? 'success' : 'info'}); padding: 1rem; margin-bottom: 1.5rem; border-radius: 4px; display: flex; align-items: center; justify-content: space-between;`;
        annDiv.innerHTML = `
          <div><i class="fas fa-bullhorn" style="margin-right: 10px; color: var(--${ann.type === 'warning' ? 'warning' : ann.type === 'success' ? 'success' : 'info'});"></i> <strong>Announcement:</strong> ${ann.message}</div>
          <button style="background:none; border:none; color:inherit; cursor:pointer;" onclick="this.parentElement.style.display='none';"><i class="fas fa-times"></i></button>
        `;
        // Insert right after page-header
        const pageHeader = mainContent.querySelector('.page-header');
        if (pageHeader) {
          pageHeader.after(annDiv);
        }
      }
    }
  } catch (err) {
    console.error('Failed to load announcement', err);
  }

  // Welcome user name
  const greeting = document.getElementById('dashboard-greeting');
  if (greeting && user) {
    greeting.textContent = `Welcome back, ${user.name.split(' ')[0]}!`;
  }

  // Stats calculation
  const totalTripsVal = document.getElementById('stat-total-trips');
  const totalBudgetVal = document.getElementById('stat-total-budget');
  const totalSpentVal = document.getElementById('stat-total-spent');
  const checklistProgressVal = document.getElementById('stat-checklist-progress');

  if (totalTripsVal) totalTripsVal.textContent = trips.length;

  let totalBudget = 0;
  let totalSpent = 0;
  let checklistTotal = 0;
  let checklistPacked = 0;

  trips.forEach(trip => {
    totalBudget += parseFloat(trip.budget) || 0;
    if (trip.expenses) {
      trip.expenses.forEach(exp => totalSpent += parseFloat(exp.amount) || 0);
    }
    if (trip.checklist) {
      trip.checklist.forEach(item => {
        checklistTotal++;
        if (item.packed) checklistPacked++;
      });
    }
  });

  if (totalBudgetVal) totalBudgetVal.textContent = `$${totalBudget.toLocaleString()}`;
  if (totalSpentVal) totalSpentVal.textContent = `$${totalSpent.toLocaleString()}`;

  if (checklistProgressVal) {
    const pct = checklistTotal > 0 ? Math.round((checklistPacked / checklistTotal) * 100) : 0;
    checklistProgressVal.textContent = `${pct}%`;
  }

  // Recent trips container
  const recentTripsContainer = document.getElementById('recent-trips-list');
  if (recentTripsContainer) {
    if (trips.length === 0) {
      recentTripsContainer.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-route empty-icon"></i>
          <h4 class="empty-title">No upcoming trips</h4>
          <p class="empty-description">You haven't planned any trips yet. Get started by creating one!</p>
          <a href="create-trip.html" class="btn btn-primary" style="width: auto; padding: 0.6rem 1.2rem;">Plan New Trip</a>
        </div>
      `;
    } else {
      // Show up to 3 recent/upcoming trips
      const sortedTrips = [...trips].reverse().slice(0, 3);
      recentTripsContainer.innerHTML = sortedTrips.map(trip => {
        const remainingBudget = parseFloat(trip.budget) - (trip.expenses ? trip.expenses.reduce((sum, e) => sum + parseFloat(e.amount), 0) : 0);
        return `
          <div class="card" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem; flex-wrap:wrap; gap:1rem;">
            <div>
              <h4 style="margin-bottom:0.25rem;">${trip.name}</h4>
              <p style="color:var(--text-secondary); font-size:0.85rem;"><i class="fas fa-map-marker-alt" style="color:var(--accent); margin-right:5px;"></i> ${trip.destination}</p>
            </div>
            <div>
              <p style="font-size:0.8rem; color:var(--text-secondary);">Dates</p>
              <p style="font-size:0.9rem; font-family:var(--font-mono);">${trip.startDate} to ${trip.endDate}</p>
            </div>
            <div>
              <p style="font-size:0.8rem; color:var(--text-secondary);">Rem. Budget</p>
              <p style="font-size:0.9rem; font-family:var(--font-mono); color:${remainingBudget < 0 ? 'var(--accent)' : 'var(--success)'}">$${remainingBudget.toLocaleString()}</p>
            </div>
            <a href="itinerary.html?tripId=${trip.id}" class="btn btn-secondary" style="width:auto; padding: 0.5rem 1rem; font-size:0.85rem;">View Plan</a>
          </div>
        `;
      }).join('');
    }
  }

  // Recommended Destinations (Empty state by default, awaiting API)
  /*const recsContainer = document.getElementById('recommended-destinations');
  if (recsContainer) {
    recsContainer.innerHTML = `
      <div class="empty-state" style="padding: 2rem 1rem;">
        <i class="fas fa-globe-americas empty-icon" style="font-size: 2rem;"></i>
        <h5 class="empty-title">Ready for API integration</h5>
        <p class="empty-description" style="font-size: 0.85rem; margin-bottom: 0;">Connect to REST Countries API or GeoDB API to render personalized recommendations based on travel preferences.</p>
      </div>
    `;
  }*/

  // Budget Highlights (Empty state by default, awaiting data)
  const budgetHighlights = document.getElementById('budget-highlights');
  if (budgetHighlights) {
    if (trips.length === 0 || totalSpent === 0) {
      budgetHighlights.innerHTML = `
        <div class="empty-state" style="padding: 2rem 1rem;">
          <i class="fas fa-wallet empty-icon" style="font-size: 2rem;"></i>
          <h5 class="empty-title">No expense data yet</h5>
          <p class="empty-description" style="font-size: 0.85rem; margin-bottom: 0;">Expenses and budget utilization graphs will appear here once trips are planned and budgets tracked.</p>
        </div>
      `;
    } else {
      // Show simple percentage bar
      const pctSpent = Math.min(Math.round((totalSpent / totalBudget) * 100), 100);
      budgetHighlights.innerHTML = `
        <div style="display:flex; flex-direction:column; gap: 1rem;">
          <div style="display:flex; justify-content:space-between; font-size:0.9rem;">
            <span>Total Spent vs Budget</span>
            <span style="font-weight:700;">${pctSpent}% ($${totalSpent.toLocaleString()} / $${totalBudget.toLocaleString()})</span>
          </div>
          <div class="progress-bar-bg">
            <div class="progress-bar-fill" style="width: ${pctSpent}%; background: ${pctSpent > 90 ? 'var(--accent)' : 'var(--success)'}"></div>
          </div>
          <p style="font-size:0.8rem; color:var(--text-secondary); line-height: 1.4;"><i class="fas fa-info-circle"></i> Highlight shows average expenses grouped across all planned trips in your dashboard.</p>
        </div>
      `;
    }
  }
}

// 5. Create Trip (create-trip.html)
function initCreateTripPage() {
  const form = document.getElementById('create-trip-form');
  if (!form) return;

  const destinationInput = document.getElementById('destination');
  const budgetInput = document.getElementById('budget');
  const suggestionsContent = document.getElementById('suggestions-content');

  let allSuggestions = { places: [], activities: [] };
  let selectedSuggestions = [];
  let debounceTimeout = null;

  // Set min dates to today
  const today = new Date().toISOString().split('T')[0];
  const startInput = document.getElementById('start-date');
  const endInput = document.getElementById('end-date');

  if (startInput) startInput.setAttribute('min', today);
  if (endInput) endInput.setAttribute('min', today);

  if (startInput && endInput) {
    startInput.addEventListener('change', () => {
      endInput.setAttribute('min', startInput.value);
    });
  }

  const fetchSuggestions = async (city) => {
    console.log('[Traveloop Suggestions] Fetching for city:', city);
    const token = Store.getToken();

    // Render loading shimmer states
    suggestionsContent.innerHTML = `
      <div class="suggestions-section">
        <h4 class="suggestions-section-title"><i class="fas fa-spinner fa-spin"></i> Finding places...</h4>
        <div class="suggestion-shimmer-container">
          <div class="suggestion-shimmer-card"></div>
          <div class="suggestion-shimmer-card"></div>
        </div>
      </div>
      <div class="suggestions-section">
        <h4 class="suggestions-section-title"><i class="fas fa-spinner fa-spin"></i> Loading activities...</h4>
        <div class="suggestion-shimmer-container">
          <div class="suggestion-shimmer-card"></div>
          <div class="suggestion-shimmer-card"></div>
        </div>
      </div>
    `;

    try {
      const headers = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const fetchUrl = `${API_BASE}/trips/suggestions?city=${encodeURIComponent(city)}`;
      console.log('[Traveloop Suggestions] Fetching URL:', fetchUrl);
      
      const res = await fetch(fetchUrl, { headers });
      console.log('[Traveloop Suggestions] API HTTP Status:', res.status);
      
      if (!res.ok) throw new Error(`HTTP Error ${res.status}`);
      
      const data = await res.json();
      console.log('[Traveloop Suggestions] Fetched items count:', {
        places: data.places ? data.places.length : 0,
        activities: data.activities ? data.activities.length : 0
      });
      
      allSuggestions = data;
      renderSuggestions();
    } catch (err) {
      console.error('[Traveloop Suggestions] Error during fetch:', err);
      suggestionsContent.innerHTML = `
        <div class="suggestions-empty-state">
          <i class="fas fa-triangle-exclamation suggestions-empty-icon" style="color: var(--accent);"></i>
          <p>Unable to load recommendations. Please check your network or try again later.</p>
        </div>
      `;
    }
  };

  const renderSuggestions = () => {
    const budgetVal = parseFloat(budgetInput.value) || 0;
    
    // Filter suggestions based on budget limit (0 means no limit/all shown)
    const filteredPlaces = allSuggestions.places.filter(item => budgetVal === 0 || item.cost <= budgetVal);
    const filteredActivities = allSuggestions.activities.filter(item => budgetVal === 0 || item.cost <= budgetVal);

    if (filteredPlaces.length === 0 && filteredActivities.length === 0) {
      suggestionsContent.innerHTML = `
        <div class="suggestions-empty-state">
          <i class="fas fa-filter-circle-xmark suggestions-empty-icon" style="color: var(--accent);"></i>
          <p>No places or activities found under your budget ($${budgetVal}). Try increasing your budget to unlock options!</p>
        </div>
      `;
      return;
    }

    let html = '';

    // Render Suggested Places
    if (filteredPlaces.length > 0) {
      html += `
        <div class="suggestions-section">
          <h4 class="suggestions-section-title"><i class="fas fa-map-location-dot" style="color: var(--accent);"></i> Suggested Places</h4>
          <div class="suggestions-list">
            ${filteredPlaces.map(item => {
              const isAdded = selectedSuggestions.some(s => s.name === item.name);
              const priceText = item.cost === 0 ? '<span class="suggestion-price free">Free</span>' : `<span class="suggestion-price">$${item.cost}</span>`;
              return `
                <div class="suggestion-card">
                  <div class="suggestion-card-left">
                    <span class="suggestion-card-title">${item.name}</span>
                    <span class="suggestion-card-desc">${item.description}</span>
                    <div class="suggestion-card-meta">
                      <span class="suggestion-tag">${item.category}</span>
                      ${priceText}
                    </div>
                  </div>
                  <button type="button" class="btn-add-suggestion ${isAdded ? 'added' : ''}" data-name="${item.name}" data-type="place">
                    <i class="fas ${isAdded ? 'fa-check' : 'fa-plus'}"></i> ${isAdded ? 'Added' : 'Add'}
                  </button>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;
    }

    // Render Suggested Activities
    if (filteredActivities.length > 0) {
      html += `
        <div class="suggestions-section">
          <h4 class="suggestions-section-title"><i class="fas fa-hiking" style="color: var(--accent);"></i> Suggested Activities</h4>
          <div class="suggestions-list">
            ${filteredActivities.map(item => {
              const isAdded = selectedSuggestions.some(s => s.name === item.name);
              const priceText = item.cost === 0 ? '<span class="suggestion-price free">Free</span>' : `<span class="suggestion-price">$${item.cost}</span>`;
              return `
                <div class="suggestion-card">
                  <div class="suggestion-card-left">
                    <span class="suggestion-card-title">${item.name}</span>
                    <span class="suggestion-card-desc">${item.description}</span>
                    <div class="suggestion-card-meta">
                      <span class="suggestion-tag">${item.category}</span>
                      ${priceText}
                    </div>
                  </div>
                  <button type="button" class="btn-add-suggestion ${isAdded ? 'added' : ''}" data-name="${item.name}" data-type="activity">
                    <i class="fas ${isAdded ? 'fa-check' : 'fa-plus'}"></i> ${isAdded ? 'Added' : 'Add'}
                  </button>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;
    }

    suggestionsContent.innerHTML = html;

    // Attach click listeners to + Add buttons
    suggestionsContent.querySelectorAll('.btn-add-suggestion').forEach(btn => {
      btn.addEventListener('click', async () => {
        const name = btn.getAttribute('data-name');
        const type = btn.getAttribute('data-type');
        
        let item;
        if (type === 'place') {
          item = allSuggestions.places.find(p => p.name === name);
        } else {
          item = allSuggestions.activities.find(a => a.name === name);
        }

        if (!item) return;

        const index = selectedSuggestions.findIndex(s => s.name === name);
        if (index === -1) {
          const startDateVal = document.getElementById('start-date').value;
          const destVal = document.getElementById('destination').value;
          
          const proceedAddSuggestion = () => {
            selectedSuggestions.push(item);
            btn.classList.add('added');
            btn.innerHTML = '<i class="fas fa-check"></i> Added';
            showToast(`Added "${item.name}" to trip initial plan.`, 'success');
          };
          
          if (startDateVal && destVal) {
            const risk = await assessWeatherRisk(destVal, startDateVal, item.category);
            if (risk.isRisky) {
              handleWeatherRiskWarning(risk, proceedAddSuggestion);
              return;
            }
          }
          proceedAddSuggestion();
        } else {
          selectedSuggestions.splice(index, 1);
          btn.classList.remove('added');
          btn.innerHTML = '<i class="fas fa-plus"></i> Add';
          showToast(`Removed "${item.name}" from trip initial plan.`, 'info');
        }
      });
    });
  };

  // Destination Input debounced event listener
  destinationInput.addEventListener('input', () => {
    const val = destinationInput.value.trim();
    clearTimeout(debounceTimeout);
    
    if (val.length < 3) {
      allSuggestions = { places: [], activities: [] };
      suggestionsContent.innerHTML = `
        <div class="suggestions-empty-state">
          <i class="fas fa-map-location-dot suggestions-empty-icon"></i>
          <p>Type a city in "Destination" above (e.g. Paris, Tokyo) to view popular activities & places.</p>
        </div>
      `;
      return;
    }

    debounceTimeout = setTimeout(() => {
      fetchSuggestions(val);
    }, 500);
  });

  // Budget Input event listener for live filtering
  budgetInput.addEventListener('input', () => {
    if (allSuggestions.places.length > 0 || allSuggestions.activities.length > 0) {
      renderSuggestions();
    }
  });

  // Form Submit Handler
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('trip-name').value.trim();
    const destination = document.getElementById('destination').value.trim();
    const startDate = document.getElementById('start-date').value;
    const endDate = document.getElementById('end-date').value;
    const travelers = parseInt(document.getElementById('travelers').value) || 1;
    const budget = parseFloat(document.getElementById('budget').value) || 0;
    const flightCost = parseFloat(document.getElementById('flight-cost').value) || 0;
    const lodgingCost = parseFloat(document.getElementById('lodging-cost').value) || 0;
    const description = document.getElementById('description').value.trim();

    if (!name || !destination || !startDate || !endDate || !budget) {
      showToast('Please fill in all required fields (*)', 'error');
      return;
    }

    if (new Date(startDate) > new Date(endDate)) {
      showToast('End Date must be after Start Date', 'error');
      return;
    }

    const trips = await Store.getTrips();
    const user = Store.getCurrentUser();

    // Generate initial itinerary and expenses logs from selected suggestions
    const initialItinerary = [];
    const initialExpenses = [];

    if (flightCost > 0) {
      initialExpenses.push({
        description: `Flight to ${destination}`,
        amount: flightCost,
        category: 'Flights',
        date: startDate,
        status: 'Paid'
      });
    }

    if (lodgingCost > 0) {
      initialExpenses.push({
        description: `Accommodation in ${destination}`,
        amount: lodgingCost,
        category: 'Lodging',
        date: startDate,
        status: 'Paid'
      });
    }

    // Calculate total days to distribute suggestions across them for a balanced timeline
    const start = new Date(startDate);
    const end = new Date(endDate);
    const totalDays = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1);

    selectedSuggestions.forEach((item, idx) => {
      // Calculate target date for this suggestion (e.g. Day 1, Day 2, etc.)
      const itemDate = new Date(start);
      itemDate.setDate(start.getDate() + (idx % totalDays));
      const itemDateStr = itemDate.toISOString().split('T')[0];

      const isPlace = allSuggestions.places.some(p => p.name === item.name);
      
      if (isPlace) {
        initialItinerary.push({
          city: destination,
          date: itemDateStr,
          activity: `Visit ${item.name}`,
          category: item.category || 'Sightseeing',
          cost: item.cost,
          duration: '2 hours'
        });

        if (item.cost > 0) {
          initialExpenses.push({
            description: `${item.name} Entry Tickets`,
            amount: item.cost,
            category: 'Sightseeing',
            date: itemDateStr,
            status: 'Pending'
          });
        }
      } else {
        initialItinerary.push({
          city: destination,
          date: itemDateStr,
          activity: item.name,
          category: item.category || 'Activity',
          cost: item.cost,
          duration: '3 hours'
        });

        if (item.cost > 0) {
          initialExpenses.push({
            description: item.name,
            amount: item.cost,
            category: 'Activities',
            date: itemDateStr,
            status: 'Pending'
          });
        }
      }
    });

    const newTrip = {
      id: 'trip-' + Date.now(),
      userId: user ? user.email : '',
      name,
      destination,
      startDate,
      endDate,
      travelers,
      budget,
      description,
      itinerary: initialItinerary,
      expenses: initialExpenses,
      checklist: [],
      notes: []
    };

    trips.push(newTrip);
    await Store.saveTrips(trips);

    // Save as active trip
    localStorage.setItem('traveloop_active_trip_id', newTrip.id);

    showToast('Trip created successfully! Redirecting to trips page...', 'success');
    setTimeout(() => {
      window.location.href = 'trips.html';
    }, 1500);
  });
}

// 6. My Trips (trips.html)
async function initTripsPage() {
  const container = document.getElementById('trips-list-container');
  if (!container) return;

  let trips = await Store.getTrips();

  function renderTrips() {
    if (trips.length === 0) {
      container.innerHTML = `
        <div class="span-12">
          <div class="empty-state">
            <i class="fas fa-map-marked-alt empty-icon"></i>
            <h4 class="empty-title">No planned trips</h4>
            <p class="empty-description">Your upcoming adventures will appear here once you start planning.</p>
            <a href="create-trip.html" class="btn btn-primary" style="width: auto;">Plan New Trip</a>
          </div>
        </div>
      `;
      return;
    }

    const today = new Date().toISOString().split('T')[0];

    container.innerHTML = trips.map(trip => {
      // Determine trip status badge
      let status = 'Upcoming';
      let badgeClass = 'badge-upcoming';
      if (today >= trip.startDate && today <= trip.endDate) {
        status = 'Ongoing';
        badgeClass = 'badge-ongoing';
      } else if (today > trip.endDate) {
        status = 'Completed';
        badgeClass = 'badge-completed';
      }

      return `
        <div class="trip-card" id="card-${trip.id}">
          <div class="trip-card-header">
            <span class="trip-status-badge ${badgeClass}">${status}</span>
            <h3 class="trip-title">${trip.name}</h3>
            <span class="trip-destination"><i class="fas fa-location-dot"></i> ${trip.destination}</span>
          </div>
          <div class="trip-card-body">
            <div class="trip-meta-row">
              <div class="trip-meta-item">
                <i class="fas fa-calendar-alt"></i>
                <span class="trip-meta-val" style="font-family:var(--font-mono);">${trip.startDate}</span>
              </div>
              <div class="trip-meta-item">
                <i class="fas fa-user-friends"></i>
                <span class="trip-meta-val">${trip.travelers} Traveler${trip.travelers > 1 ? 's' : ''}</span>
              </div>
            </div>
            <div class="trip-meta-row">
              <div class="trip-meta-item">
                <i class="fas fa-wallet"></i>
                <span class="trip-meta-val" style="font-family:var(--font-mono); font-weight:600;">$${parseFloat(trip.budget).toLocaleString()}</span>
              </div>
              <div class="trip-meta-item">
                <i class="fas fa-suitcase"></i>
                <span class="trip-meta-val">${trip.checklist ? trip.checklist.length : 0} items</span>
              </div>
            </div>
            ${trip.description ? `<p class="trip-description-text">${trip.description}</p>` : ''}
          </div>
          <div class="trip-card-actions">
            <a href="itinerary.html?tripId=${trip.id}" class="btn btn-primary" style="flex:1;"><i class="fas fa-compass"></i> Itinerary</a>
            <button class="btn btn-secondary edit-trip-btn" data-id="${trip.id}"><i class="fas fa-edit"></i></button>
            <button class="btn btn-secondary btn-danger delete-trip-btn" data-id="${trip.id}" style="color:var(--accent);"><i class="fas fa-trash-alt"></i></button>
          </div>
        </div>
      `;
    }).join('');

    // Attach button event listeners
    document.querySelectorAll('.delete-trip-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const tripId = btn.getAttribute('data-id');
        openDeleteModal(tripId);
      });
    });

    document.querySelectorAll('.edit-trip-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const tripId = btn.getAttribute('data-id');
        openEditModal(tripId);
      });
    });
  }

  // Delete Modal handling
  const deleteModal = document.getElementById('delete-modal');
  const confirmDeleteBtn = document.getElementById('confirm-delete');
  let tripIdToDelete = null;

  function openDeleteModal(tripId) {
    tripIdToDelete = tripId;
    deleteModal.classList.add('active');
  }

  if (confirmDeleteBtn) {
    confirmDeleteBtn.addEventListener('click', async () => {
      if (tripIdToDelete) {
        trips = trips.filter(t => t.id !== tripIdToDelete);
        await Store.saveTrips(trips);
        deleteModal.classList.remove('active');
        showToast('Trip deleted successfully', 'success');

        // Remove item from UI dynamically or re-render
        const card = document.getElementById(`card-${tripIdToDelete}`);
        if (card) {
          card.style.opacity = '0';
          card.style.transform = 'scale(0.8)';
          setTimeout(() => {
            renderTrips();
          }, 300);
        } else {
          renderTrips();
        }
      }
    });
  }

  // Edit Modal handling
  const editModal = document.getElementById('edit-modal');
  const editForm = document.getElementById('edit-trip-form');
  let tripIdToEdit = null;

  function openEditModal(tripId) {
    tripIdToEdit = tripId;
    const trip = trips.find(t => t.id === tripId);
    if (!trip) return;

    document.getElementById('edit-trip-name').value = trip.name;
    document.getElementById('edit-destination').value = trip.destination;
    document.getElementById('edit-start-date').value = trip.startDate;
    document.getElementById('edit-end-date').value = trip.endDate;
    document.getElementById('edit-travelers').value = trip.travelers;
    document.getElementById('edit-budget').value = trip.budget;
    document.getElementById('edit-description').value = trip.description || '';

    editModal.classList.add('active');
  }

  if (editForm) {
    editForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const tripIndex = trips.findIndex(t => t.id === tripIdToEdit);
      if (tripIndex === -1) return;

      const name = document.getElementById('edit-trip-name').value.trim();
      const destination = document.getElementById('edit-destination').value.trim();
      const startDate = document.getElementById('edit-start-date').value;
      const endDate = document.getElementById('edit-end-date').value;
      const travelers = parseInt(document.getElementById('edit-travelers').value) || 1;
      const budget = parseFloat(document.getElementById('edit-budget').value) || 0;
      const description = document.getElementById('edit-description').value.trim();

      if (!name || !destination || !startDate || !endDate || !budget) {
        showToast('Please fill in all required fields', 'error');
        return;
      }

      trips[tripIndex] = {
        ...trips[tripIndex],
        name,
        destination,
        startDate,
        endDate,
        travelers,
        budget,
        description
      };

      await Store.saveTrips(trips);
      editModal.classList.remove('active');
      showToast('Trip updated successfully', 'success');
      renderTrips();
    });
  }

  // Close Modals
  document.querySelectorAll('.modal-close, .modal-cancel').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.modal').forEach(m => m.classList.remove('active'));
    });
  });

  renderTrips();
}

// 7. Itinerary Builder (itinerary.html)
async function initItineraryPage() {
  const urlParams = new URLSearchParams(window.location.search);
  let tripId = urlParams.get('tripId') || localStorage.getItem('traveloop_active_trip_id');
  const trips = await Store.getTrips();

  let trip = trips.find(t => t.id === tripId);
  if (!trip && trips.length > 0) {
    // Auto-select the first (most recent) trip if none is selected yet
    trip = trips[0];
    localStorage.setItem('traveloop_active_trip_id', trip.id);
  }

  if (!trip) return;

  // Set active trip ID
  localStorage.setItem('traveloop_active_trip_id', trip.id);

  // Set page headers
  const tripTitle = document.getElementById('itinerary-trip-title');
  if (tripTitle) tripTitle.textContent = `Itinerary: ${trip.name}`;

  const tripDest = document.getElementById('itinerary-trip-destination');
  if (tripDest) tripDest.innerHTML = `<i class="fas fa-map-marker-alt"></i> ${trip.destination} &nbsp;|&nbsp; <i class="fas fa-calendar"></i> ${trip.startDate} to ${trip.endDate}`;

  // Form input restrictions
  const stopDateInput = document.getElementById('stop-date');
  if (stopDateInput) {
    stopDateInput.setAttribute('min', trip.startDate);
    stopDateInput.setAttribute('max', trip.endDate);
    stopDateInput.value = trip.startDate;
  }

  const timelineContainer = document.getElementById('timeline-container');
  const form = document.getElementById('add-stop-form');

  let activeDayFilter = 'all';

  function formatTimeWithIcon(timeStr) {
    if (!timeStr) return '';
    const [hourStr, minStr] = timeStr.split(':');
    const hour = parseInt(hourStr);
    const min = parseInt(minStr);
    
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    const displayMin = min < 10 ? '0' + min : min;
    
    // 6 AM to 6 PM is day ☀️, other times is night 🌙
    const isDay = hour >= 6 && hour < 18;
    const icon = isDay ? '<i class="fas fa-sun" style="color:#eab308; margin-right:4px;"></i>' : '<i class="fas fa-moon" style="color:#818cf8; margin-right:4px;"></i>';
    
    return `<span>${icon}${displayHour}:${displayMin} ${ampm}</span>`;
  }

  function renderItinerary() {
    // Render Stats Bar
    const statsBar = document.getElementById('timeline-stats-bar');
    if (statsBar) {
      const totalStops = trip.itinerary.length;
      const totalHours = trip.itinerary.reduce((sum, item) => sum + (parseFloat(item.duration) || 0), 0);
      const totalCost = trip.itinerary.reduce((sum, item) => sum + (parseFloat(item.cost) || 0), 0);
      statsBar.innerHTML = `
        <span class="stat-badge"><i class="fas fa-map-pin"></i> <strong>${totalStops}</strong> stops</span>
        <span class="stat-badge"><i class="far fa-clock"></i> <strong>${totalHours}</strong> hrs</span>
        <span class="stat-badge"><i class="fas fa-wallet"></i> <strong>$${totalCost.toLocaleString()}</strong></span>
      `;
    }

    // Render Day Tabs
    const dayTabsContainer = document.getElementById('day-tabs-container');
    if (dayTabsContainer) {
      const start = new Date(trip.startDate);
      const end = new Date(trip.endDate);
      const diffTime = Math.abs(end - start);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

      let tabsHtml = `<button class="day-tab ${activeDayFilter === 'all' ? 'active' : ''}" data-day="all">All Days</button>`;
      
      for (let i = 0; i < diffDays; i++) {
        const currentDate = new Date(start);
        currentDate.setDate(start.getDate() + i);
        const dateStr = currentDate.toISOString().split('T')[0];
        const displayDate = currentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const isSelected = activeDayFilter === dateStr;
        tabsHtml += `<button class="day-tab ${isSelected ? 'active' : ''}" data-day="${dateStr}">Day ${i + 1} (${displayDate})</button>`;
      }
      
      dayTabsContainer.innerHTML = tabsHtml;

      dayTabsContainer.querySelectorAll('.day-tab').forEach(tab => {
        tab.addEventListener('click', () => {
          activeDayFilter = tab.getAttribute('data-day');
          renderItinerary();
        });
      });
    }

    if (!trip.itinerary || trip.itinerary.length === 0) {
      timelineContainer.innerHTML = `
        <div class="empty-state" style="padding: 2rem;">
          <i class="fas fa-hourglass-start empty-icon"></i>
          <h4 class="empty-title">Your timeline is empty</h4>
          <p class="empty-description">Add your first city stop, activity, or lodging to map out your journey.</p>
        </div>
      `;
      updateWeatherRecommendations(null);
      return;
    }

    // Sort itinerary by date, then start_time
    trip.itinerary.sort((a, b) => {
      const dateDiff = new Date(a.date) - new Date(b.date);
      if (dateDiff !== 0) return dateDiff;
      
      if (a.start_time && b.start_time) {
        return a.start_time.localeCompare(b.start_time);
      }
      if (a.start_time) return -1;
      if (b.start_time) return 1;
      return 0;
    });

    const filteredStops = trip.itinerary.filter(stop => activeDayFilter === 'all' || stop.date === activeDayFilter);

    if (filteredStops.length === 0) {
      timelineContainer.innerHTML = `
        <div class="empty-state" style="padding: 2rem; border: 1px dashed var(--border-light); border-radius: 12px; background: rgba(0,0,0,0.01);">
          <i class="fas fa-calendar-day empty-icon" style="font-size:1.75rem; color:var(--text-secondary);"></i>
          <h5 class="empty-title" style="margin-top:0.5rem; font-size:0.95rem;">No stops scheduled for this day</h5>
          <p class="empty-description" style="font-size:0.8rem;">Use the "Add Itinerary Item" form on the left to add activities for this date.</p>
        </div>
      `;
      updateWeatherRecommendations(trip.itinerary);
      return;
    }

    timelineContainer.innerHTML = filteredStops.map((stop) => {
      // Find the index of this stop in the master list for deletion/movement
      const index = trip.itinerary.findIndex(s => s === stop);

      let icon = 'fa-map-pin';
      if (stop.category === 'Adventure') icon = 'fa-mountain';
      if (stop.category === 'Food') icon = 'fa-utensils';
      if (stop.category === 'Shopping') icon = 'fa-shopping-bag';
      if (stop.category === 'Historical') icon = 'fa-landmark';
      if (stop.category === 'Culture') icon = 'fa-theater-masks';
      if (stop.category === 'Nature') icon = 'fa-leaf';

      return `
        <div class="timeline-item" id="stop-${index}">
          <div class="timeline-dot"><i class="fas ${icon}"></i></div>
          <div class="timeline-content">
            <div class="timeline-info" style="flex:1;">
              <span class="category-badge cat-${stop.category.toLowerCase()}">${stop.category}</span>
              <h4 style="margin-top: 0.5rem;">${stop.activity}</h4>
              <p style="font-size:0.9rem; margin-top: 0.25rem;"><i class="fas fa-city" style="color:var(--accent); font-size:0.8rem; margin-right:5px;"></i>${stop.city}</p>
              <div class="timeline-meta">
                <span><i class="far fa-calendar-alt"></i> ${stop.date}</span>
                ${stop.start_time ? formatTimeWithIcon(stop.start_time) : ''}
                ${stop.duration ? `<span><i class="far fa-clock"></i> ${stop.duration} hrs</span>` : ''}
                ${stop.cost ? `<span><i class="fas fa-tag"></i> $${parseFloat(stop.cost).toLocaleString()}</span>` : ''}
              </div>
            </div>
            <div class="timeline-actions">
              <button class="timeline-btn move-up-btn" data-index="${index}" ${index === 0 ? 'disabled style="opacity:0.3; cursor:default;"' : ''}><i class="fas fa-chevron-up"></i></button>
              <button class="timeline-btn move-down-btn" data-index="${index}" ${index === trip.itinerary.length - 1 ? 'disabled style="opacity:0.3; cursor:default;"' : ''}><i class="fas fa-chevron-down"></i></button>
              <button class="timeline-btn delete-stop-btn" data-index="${index}" style="color:var(--accent);"><i class="fas fa-trash-alt"></i></button>
            </div>
          </div>
        </div>
      `;
    }).join('');

    // Bind event listeners
    document.querySelectorAll('.delete-stop-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.getAttribute('data-index'));
        trip.itinerary.splice(idx, 1);
        saveAndUpdate();
        showToast('Itinerary stop removed', 'success');
      });
    });

    document.querySelectorAll('.move-up-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.getAttribute('data-index'));
        if (idx > 0) {
          const temp = trip.itinerary[idx];
          trip.itinerary[idx] = trip.itinerary[idx - 1];
          trip.itinerary[idx - 1] = temp;
          saveAndUpdate();
        }
      });
    });

    document.querySelectorAll('.move-down-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.getAttribute('data-index'));
        if (idx < trip.itinerary.length - 1) {
          const temp = trip.itinerary[idx];
          trip.itinerary[idx] = trip.itinerary[idx + 1];
          trip.itinerary[idx + 1] = temp;
          saveAndUpdate();
        }
      });
    });

    // Update dynamic weather recommendations based on the itinerary stops
    updateWeatherRecommendations(trip.itinerary);
  }

  async function saveAndUpdate() {
    const allTrips = await Store.getTrips();
    const idx = allTrips.findIndex(t => t.id === trip.id);
    if (idx !== -1) {
      allTrips[idx] = trip;
      await Store.saveTrips(allTrips);
    }
    renderItinerary();
  }

  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const city = document.getElementById('stop-city').value.trim();
      const date = document.getElementById('stop-date').value;
      const activity = document.getElementById('stop-activity').value.trim();
      const category = document.getElementById('stop-category').value;
      const cost = parseFloat(document.getElementById('stop-cost').value) || 0;
      const duration = document.getElementById('stop-duration').value || '';
      const start_time = document.getElementById('stop-start-time').value || null;

      if (!city || !date || !activity) {
        showToast('Please fill in city, date, and activity details', 'error');
        return;
      }

      trip.itinerary.push({
        city,
        date,
        activity,
        category,
        cost,
        duration,
        start_time
      });

      saveAndUpdate();
      form.reset();
      document.getElementById('stop-date').value = trip.startDate; // restore default
      if (document.getElementById('stop-start-time')) {
        document.getElementById('stop-start-time').value = '';
      }
      showToast('Activity added to timeline!', 'success');
    });
  }

  // Weather Recommendations Section Handler (empty initially, updates when items added)
  function updateWeatherRecommendations(itinerary) {
    const recContainer = document.getElementById('weather-recs-container');
    if (!recContainer) return;

    if (!itinerary || itinerary.length === 0) {
      recContainer.innerHTML = `
        <div class="empty-state" style="padding: 1.5rem; text-align:center;">
          <i class="fas fa-cloud-sun-rain empty-icon" style="font-size: 2rem;"></i>
          <h5 class="empty-title" style="font-size: 1rem;">No weather alerts yet</h5>
          <p class="empty-description" style="font-size: 0.8rem; margin-bottom: 0;">Add city stops to see automated weather warnings and activity suggestions.</p>
        </div>
      `;
      return;
    }

    // Generate weather recommendations reactively (frontend simulation)
    // We choose the latest city stop to simulate advisory
    const latestStop = itinerary[itinerary.length - 1];

    // Simulate dynamic weather results based on city name characters (simple hash logic for seed)
    const charCodeSum = latestStop.city.split('').reduce((sum, c) => sum + c.charCodeAt(0), 0);
    const weatherType = charCodeSum % 3; // 0 = rainy, 1 = hot, 2 = pleasant

    let weatherTitle = "Pleasant Weather";
    let weatherTemp = "24°C";
    let icon = "fa-sun";
    let color = "var(--success)";
    let recommended = [];
    let risky = [];
    let packing = [];
    let advisory = "";

    if (weatherType === 0) {
      weatherTitle = "Heavy Rain Warning";
      weatherTemp = "18°C";
      icon = "fa-cloud-showers-heavy";
      color = "var(--accent)";
      recommended = ["Museum visits", "Indoors art tasting", "Local café hopping"];
      risky = ["Mountain trekking", "Open beach surfing", "Boat cruises"];
      packing = ["Windbreaker jacket", "Waterproof umbrella", "Quick-dry clothes"];
      advisory = "Yellow Alert: Low visibility and slippery trails in mountainous routes. Keep indoor alternatives ready.";
    } else if (weatherType === 1) {
      weatherTitle = "Heatwave Alert";
      weatherTemp = "38°C";
      icon = "fa-temperature-high";
      color = "var(--warning)";
      recommended = ["Indoor shopping malls", "Early morning walk", "Hotel spa therapy"];
      risky = ["Noon desert safari", "Strenuous cycling tours", "Outdoor archaeological sightseeing"];
      packing = ["High SPF Sunscreen", "Polarized sunglasses", "Light linen shirt"];
      advisory = "Orange Alert: Extreme UV indexes. Hydrate constantly and avoid sun exposure between 11:00 AM and 4:00 PM.";
    } else {
      weatherTitle = "Clear Sightseeing Climate";
      weatherTemp = "22°C";
      icon = "fa-cloud-sun";
      color = "var(--success)";
      recommended = ["Historical walking tour", "Outdoor nature photography", "Rooftop dinner"];
      risky = ["None - Ideal for all scheduled trip stops"];
      packing = ["Light jacket", "Comfortable sneakers", "DSLR Camera"];
      advisory = "Normal: Perfect weather conditions. No flight or transport disruptions expected.";
    }

    recContainer.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.5rem; border-bottom: 1px solid var(--glass-border); padding-bottom: 1rem;">
        <div>
          <h4 style="color:${color}"><i class="fas ${icon}"></i> ${weatherTitle}</h4>
          <p style="font-size:0.85rem; color:var(--text-secondary); margin-top:0.25rem;">Simulated weather outlook for stop <strong>${latestStop.city}</strong></p>
        </div>
        <div style="font-family:var(--font-mono); font-size:1.8rem; font-weight:700;">${weatherTemp}</div>
      </div>
      <div class="dashboard-grid">
        <div class="span-6" style="margin-bottom:1rem;">
          <h5 style="color:var(--success); margin-bottom:0.5rem;"><i class="fas fa-thumbs-up"></i> Recommended Activities</h5>
          <ul style="padding-left:1.25rem; font-size:0.85rem; line-height: 1.6; color:var(--text-secondary);">
            ${recommended.map(r => `<li>${r}</li>`).join('')}
          </ul>
        </div>
        <div class="span-6" style="margin-bottom:1rem;">
          <h5 style="color:var(--accent); margin-bottom:0.5rem;"><i class="fas fa-thumbs-down"></i> Risky Activities</h5>
          <ul style="padding-left:1.25rem; font-size:0.85rem; line-height: 1.6; color:var(--text-secondary);">
            ${risky.map(r => `<li>${r}</li>`).join('')}
          </ul>
        </div>
        <div class="span-12" style="margin-bottom:1rem; border-top: 1px solid rgba(255,255,255,0.05); padding-top:1rem;">
          <h5 style="margin-bottom:0.5rem;"><i class="fas fa-briefcase"></i> Smart Packing Suggestions</h5>
          <div style="display:flex; gap:0.5rem; flex-wrap:wrap; margin-top:0.5rem;">
            ${packing.map(p => `<span class="checklist-category-lbl" style="background:rgba(255,255,255,0.05); border:1px solid var(--glass-border); color:white; text-transform:none;">${p}</span>`).join('')}
          </div>
        </div>
        <div class="span-12" style="background:rgba(255,255,255,0.02); padding: 0.75rem 1rem; border-radius: 8px; border-left:3px solid ${color}; font-size:0.85rem; line-height: 1.4;">
          <strong>Travel Safety Advisory:</strong> ${advisory}
        </div>
      </div>
    `;
  }

  // Quick Action navigation shortcuts inside Itinerary Page
  const shareBtn = document.getElementById('share-itinerary-shortcut');
  if (shareBtn) {
    shareBtn.addEventListener('click', () => {
      window.location.href = `shared.html?tripId=${trip.id}`;
    });
  }

  renderItinerary();
}

/* 8. Smart City Search (search.html)
function initSearchPage() {
  const searchInput = document.getElementById('city-search-input');
  const suggestions = document.getElementById('suggestions-dropdown');
  const addModal = document.getElementById('add-to-trip-modal');
  const addForm = document.getElementById('add-to-trip-form');
  const trips = Store.getTrips();

  let selectedDestination = null;

  if (!searchInput || !suggestions) return;

  // Render trips options in modal
  const tripSelect = document.getElementById('select-trip-dest');
  if (tripSelect) {
    tripSelect.innerHTML = trips.map(t => `<option value="${t.id}">${t.name} (${t.destination})</option>`).join('');
  }

  // Debounced typing handler
  let debounceTimeout = null;
  searchInput.addEventListener('input', () => {
    clearTimeout(debounceTimeout);
    const query = searchInput.value.trim();

    if (query.length < 2) {
      suggestions.classList.remove('active');
      return;
    }

    // Show suggestion list with loading state placeholder
    suggestions.classList.add('active');
    suggestions.innerHTML = `
      <div style="padding: 1rem; text-align:center; color:var(--text-secondary);">
        <i class="fas fa-spinner fa-spin" style="margin-right:8px;"></i> Searching destinations...
      </div>
    `;

    debounceTimeout = setTimeout(() => {
      // Mock Search API fetch call (filtering mock array)
      const mockDestinations = [
        { city: "Paris", country: "France", code: "FR" },
        { city: "Tokyo", country: "Japan", code: "JP" },
        { city: "Rome", country: "Italy", code: "IT" },
        { city: "New York", country: "United States", code: "US" },
        { city: "Sydney", country: "Australia", code: "AU" },
        { city: "Bali", country: "Indonesia", code: "ID" },
        { city: "Cape Town", country: "South Africa", code: "ZA" },
        { city: "Rio de Janeiro", country: "Brazil", code: "BR" },
        { city: "Mumbai", country: "India", code: "IN" },
        { city: "Delhi", country: "India", code: "IN" },
        { city: "Bengaluru", country: "India", code: "IN" },
        { city: "Goa", country: "India", code: "IN" },
        { city: "Jaipur", country: "India", code: "IN" },
        { city: "Kerala", country: "India", code: "IN" }
      ];

      const filtered = mockDestinations.filter(d => 
        d.city.toLowerCase().includes(query.toLowerCase()) || 
        d.country.toLowerCase().includes(query.toLowerCase())
      );

      if (filtered.length === 0) {
        suggestions.innerHTML = `
          <div style="padding: 1rem; text-align:center; color:var(--text-secondary);">
            No matching destinations found.
          </div>
        `;
      } else {
        suggestions.innerHTML = filtered.map(d => `
          <div class="suggestion-item" data-city="${d.city}" data-country="${d.country}">
            <span class="suggestion-city"><i class="fas fa-plane-arrival" style="color:var(--accent); margin-right:8px;"></i>${d.city}</span>
            <span class="suggestion-country">${d.country}</span>
          </div>
        `).join('');

        // Add suggestion click handlers
        suggestions.querySelectorAll('.suggestion-item').forEach(item => {
          item.addEventListener('click', () => {
            const city = item.getAttribute('data-city');
            const country = item.getAttribute('data-country');
            
            selectedDestination = { city, country };
            searchInput.value = `${city}, ${country}`;
            suggestions.classList.remove('active');
            
            // Show result card
            renderDestinationCard(selectedDestination);
          });
        });
      }
    }, 600); // 600ms debounce
  } );

  const resultContainer = document.getElementById('search-result-card');

  function renderDestinationCard(dest) {
    if (!resultContainer) return;
    
    resultContainer.innerHTML = `
      <div class="card" style="margin-top: 2rem; display:flex; flex-direction:column; gap:1.25rem;">
        <div style="display:flex; justify-content:space-between; align-items:start;">
          <div>
            <span class="category-badge" style="background:rgba(22, 199, 154, 0.1); color:var(--success); border: 1px solid var(--success)">API CONNECTED</span>
            <h3 style="margin-top: 0.5rem; font-size:1.5rem;">${dest.city}, ${dest.country}</h3>
          </div>
          <button class="btn btn-primary add-to-trip-btn-trigger" style="width:auto; padding: 0.5rem 1rem;"><i class="fas fa-plus"></i> Add to Trip</button>
        </div>
        <p style="font-size:0.9rem; color:var(--text-secondary); line-height: 1.5;">
          This city is ready to load API metrics dynamically. We will query <strong>GeoDB Cities API</strong> for coordinates and <strong>REST Countries API</strong> for language, currency, and regional indices.
        </p>
        <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; text-align:center;">
          <div style="background:rgba(255,255,255,0.02); padding: 0.75rem; border-radius: 8px; border:1px solid var(--glass-border);">
            <div style="font-size:0.75rem; color:var(--text-secondary);">Currency</div>
            <div style="font-size:1.1rem; font-weight:700; margin-top:0.25rem; font-family:var(--font-mono);">EUR</div>
          </div>
          <div style="background:rgba(255,255,255,0.02); padding: 0.75rem; border-radius: 8px; border:1px solid var(--glass-border);">
            <div style="font-size:0.75rem; color:var(--text-secondary);">Language</div>
            <div style="font-size:1.1rem; font-weight:700; margin-top:0.25rem;">French</div>
          </div>
          <div style="background:rgba(255,255,255,0.02); padding: 0.75rem; border-radius: 8px; border:1px solid var(--glass-border);">
            <div style="font-size:0.75rem; color:var(--text-secondary);">Plug Type</div>
            <div style="font-size:1.1rem; font-weight:700; margin-top:0.25rem; font-family:var(--font-mono);">Type C/E</div>
          </div>
        </div>
      </div>
    `;

    resultContainer.querySelector('.add-to-trip-btn-trigger').addEventListener('click', () => {
      if (trips.length === 0) {
        showToast('Create a trip first before adding destinations', 'error');
        return;
      }
      addModal.classList.add('active');
    });
  }

  // Modal Submit Add City to Trip
  if (addForm) {
    addForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const tripId = document.getElementById('select-trip-dest').value;
      const targetTrip = trips.find(t => t.id === tripId);
      
      if (!targetTrip) return;

      if (!targetTrip.itinerary) targetTrip.itinerary = [];
      
      targetTrip.itinerary.push({
        city: selectedDestination.city,
        date: targetTrip.startDate, // default to trip start
        activity: `Arrive in ${selectedDestination.city}`,
        category: 'Nature',
        cost: 0,
        duration: ''
      });

      // Save changes
      const allTrips = Store.getTrips();
      const idx = allTrips.findIndex(t => t.id === targetTrip.id);
      allTrips[idx] = targetTrip;
      Store.saveTrips(allTrips);

      addModal.classList.remove('active');
      showToast(`Added ${selectedDestination.city} to itinerary of ${targetTrip.name}!`, 'success');
    });
  }

  // Close modals
  document.querySelectorAll('.modal-close, .modal-cancel').forEach(btn => {
    btn.addEventListener('click', () => {
      addModal.classList.remove('active');
    });
  });

  // Hide suggestions dropdown on click outside
  document.addEventListener('click', (e) => {
    if (!searchInput.contains(e.target) && !suggestions.contains(e.target)) {
      suggestions.classList.remove('active');
    }
  });
}*/

// 9. Smart Activity Discovery (activities.html)
async function initActivitiesPage() {
  const activeTripId = localStorage.getItem('traveloop_active_trip_id');
  const trips = await Store.getTrips();
  const selectedTrip = trips.find(t => t.id === activeTripId);
  if (!selectedTrip) return;
  
  const activityList = document.getElementById('activity-list');
  const searchInput = document.getElementById('activity-search');

  if (!activityList) return;

  const addModal = document.getElementById('add-activity-modal');
  const addForm = document.getElementById('add-activity-form');
  let selectedActivityData = null;
  const tripSelect = document.getElementById('select-trip-activity');
  
  if (tripSelect) {
    tripSelect.innerHTML = `<option value="${selectedTrip.id}">${selectedTrip.name}</option>`;
    tripSelect.disabled = true;
  }
  
  const activityDateInput = document.getElementById('activity-date');
  if (activityDateInput) {
    activityDateInput.setAttribute('min', selectedTrip.startDate);
    activityDateInput.setAttribute('max', selectedTrip.endDate);
    activityDateInput.value = selectedTrip.startDate;
  }

  let currentCategory = "All";
  let searchQuery = "";
  let activities = [];

  function getFilterCategory(itemCat) {
    const cat = (itemCat || '').toLowerCase();
    if (cat.includes('amusement') || cat.includes('adventure') || cat.includes('biking') || cat.includes('hiking')) {
      return 'Adventure';
    }
    if (cat.includes('historic') || cat.includes('museum') || cat.includes('heritage') || cat.includes('landmark')) {
      return 'Historical';
    }
    if (cat.includes('nature') || cat.includes('outdoor') || cat.includes('garden') || cat.includes('park') || cat.includes('lake') || cat.includes('beach')) {
      return 'Nature';
    }
    if (cat.includes('food') || cat.includes('drink') || cat.includes('cuisine') || cat.includes('dining') || cat.includes('cook') || cat.includes('workshop')) {
      return 'Food';
    }
    if (cat.includes('shop') || cat.includes('market') || cat.includes('mall') || cat.includes('boutique')) {
      return 'Shopping';
    }
    return 'Culture';
  }

  function renderCatalog() {
    const filtered = currentCategory === "All"
      ? activities
      : activities.filter(act => act.category === currentCategory);

    if (filtered.length === 0) {
      activityList.innerHTML = `
        <div class="span-12">
          <div class="empty-state">
            <i class="fas fa-search-location empty-icon"></i>
            <h4 class="empty-title">No activities found</h4>
            <p class="empty-description">Try adjusting your filters or search terms to discover more items.</p>
          </div>
        </div>
      `;
      return;
    }
    
    activityList.innerHTML = filtered.map((act, index) => {
      const priceText = act.cost === 0 ? 'Free' : `$${act.cost}`;
      return `
        <div class="span-4 card" style="display:flex; flex-direction:column; gap:1rem; border:1px solid var(--glass-border); padding:1.25rem;">
          <div style="display:flex; justify-content:space-between; align-items:start;">
            <span class="category-badge cat-${act.category.toLowerCase()}">${act.category}</span>
            <span style="font-family:var(--font-mono); font-weight:700; color:var(--success);">${priceText}</span>
          </div>
          <div>
            <h4 style="margin-bottom:0.25rem; font-size:1.1rem; min-height:2.2rem; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;">${act.title}</h4>
            <p style="color:var(--text-secondary); font-size:0.85rem; line-height:1.4; display:-webkit-box; -webkit-line-clamp:3; -webkit-box-orient:vertical; overflow:hidden; min-height:3.6rem;">${act.desc}</p>
          </div>
          <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid rgba(255,255,255,0.05); padding-top:0.75rem; font-size:0.8rem; color:var(--text-secondary);">
            <span><i class="far fa-clock"></i> ${act.duration} hrs</span>
            ${(selectedTrip && selectedTrip.itinerary && selectedTrip.itinerary.some(i => i.activity === act.title)) 
              ? `<span style="font-size:0.75rem; color:var(--success); font-weight:600;"><i class="fas fa-check-circle"></i> Already Selected</span>` 
              : `<button class="btn btn-secondary add-catalog-act-btn" data-name="${act.title}" style="width:auto; padding:0.4rem 0.8rem; font-size:0.8rem;"><i class="fas fa-plus"></i> Add</button>`}
          </div>
        </div>
      `;
    }).join('');

    activityList.querySelectorAll('.add-catalog-act-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const name = btn.getAttribute('data-name');
        selectedActivityData = filtered.find(act => act.title === name);
        if (trips.length === 0) {
          showToast('Create a trip first to add itinerary activities', 'error');
          return;
        }
        addModal.classList.add('active');
      });
    });
  }

  const fetchLiveActivities = async (query) => {
    activityList.innerHTML = `
      <div class="span-12" style="text-align:center; padding:3rem 0;">
        <i class="fas fa-circle-notch fa-spin" style="font-size:2.5rem; color:var(--accent);"></i>
        <p style="margin-top:1rem; color:var(--text-secondary);">Searching activities for "${query}"...</p>
      </div>
    `;
    
    try {
      const res = await fetch(`${API_BASE}/trips/suggestions?city=${encodeURIComponent(query)}`);
      if (!res.ok) throw new Error(`HTTP Error ${res.status}`);
      const data = await res.json();
      
      const combined = [];

      if (data.places) {
        data.places.forEach(p => {
          combined.push({
            title: p.name,
            desc: p.description,
            cost: p.cost,
            duration: 2,
            category: getFilterCategory(p.category)
          });
        });
      }
      
      if (data.activities) {
        data.activities.forEach(a => {
          combined.push({
            title: a.name,
            desc: a.description,
            cost: a.cost,
            duration: a.name.toLowerCase().includes('tour') ? 3 : 2,
            category: getFilterCategory(a.category)
          });
        });
      }

      activities = combined;
      renderCatalog();
    } catch (err) {
      console.warn('Live API fetch failed, falling back to templates:', err);
      // Construct dynamic activities based on Foursquare mock style
      const capitalizedCity = query.charAt(0).toUpperCase() + query.slice(1);
      activities = [
        { title: `Zipline Canopy Tour in ${capitalizedCity}`, cost: 45, duration: 3, desc: `Fly through the scenic treetops of ${capitalizedCity} on a high-speed zipline.`, category: 'Adventure' },
        { title: `Guided Bicycle City Tour`, cost: 25, duration: 4, desc: `Explore the hidden alleys and top landmarks of ${capitalizedCity} on two wheels.`, category: 'Adventure' },
        { title: `Old Town Walking History Tour`, cost: 15, duration: 2, desc: `Learn about the foundations, historic events, and legends of ancient ${capitalizedCity}.`, category: 'Historical' },
        { title: `Museum of Art & Heritage Entry`, cost: 20, duration: 3, desc: `Discover historic artifacts, paintings, and cultural treasures of ${capitalizedCity}.`, category: 'Historical' },
        { title: `${capitalizedCity} Botanical Gardens Walk`, cost: 8, duration: 2, desc: `Stroll through exotic plant collections, glasshouses, and tranquil water lily ponds.`, category: 'Nature' },
        { title: `Sunset Hiking Trail`, cost: 0, duration: 3, desc: `Moderate trek to the highest scenic viewpoint overlooking ${capitalizedCity}.`, category: 'Nature' },
        { title: `Traditional Culinary Tasting Tour`, cost: 50, duration: 3, desc: `Sample authentic local street foods and sweets unique to ${capitalizedCity}.`, category: 'Food' },
        { title: `Rooftop Sunset Lounge & Dinner`, cost: 70, duration: 3, desc: `Fine dining experience with local ingredients and a panoramic view of the skyline.`, category: 'Food' }
      ];
      renderCatalog();
    }
  };

  const filterChips = document.querySelectorAll('.filter-chip');
  filterChips.forEach(chip => {
    chip.addEventListener('click', () => {
      filterChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      currentCategory = chip.getAttribute('data-category');
      renderCatalog();
    });
  });

  if (searchInput) {
    let debounceTimer = null;
    searchInput.addEventListener('input', () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        searchQuery = searchInput.value.trim();
        if (searchQuery) {
          fetchLiveActivities(searchQuery);
        } else {
          activities = [];
          renderCatalog();
        }
      }, 500);
    });
  }

  // Pre-load current trip's destination automatically!
  if (selectedTrip && selectedTrip.destination) {
    const dest = selectedTrip.destination.split(',')[0].trim();
    searchInput.value = dest;
    searchQuery = dest;
    fetchLiveActivities(dest);
  } else {
    renderCatalog();
  }

  if (addForm) {
    addForm.addEventListener('submit', async e => {
      e.preventDefault();
      const tripId = document.getElementById('select-trip-activity').value;
      const targetTrip = trips.find(t => t.id === tripId);
      const activityDate = document.getElementById('activity-date').value;
      if (!targetTrip || !activityDate || !selectedActivityData) {
        showToast('Please select trip and date details', 'error');
        return;
      }
      
      const proceedAddActivity = async () => {
        if (!targetTrip.itinerary) targetTrip.itinerary = [];
        if (!targetTrip.expenses) targetTrip.expenses = [];

        targetTrip.itinerary.push({
          city: targetTrip.destination,
          date: activityDate,
          activity: selectedActivityData.title,
          category: selectedActivityData.category,
          cost: selectedActivityData.cost,
          duration: selectedActivityData.duration + ' hours'
        });

        if (selectedActivityData.cost > 0) {
          targetTrip.expenses.push({
            description: selectedActivityData.title,
            amount: parseFloat(selectedActivityData.cost) || 0,
            category: 'Activities',
            date: activityDate,
            status: 'Pending'
          });
        }
        
        const allTrips = await Store.getTrips();
        const idx = allTrips.findIndex(t => t.id === targetTrip.id);
        if (idx !== -1) {
          allTrips[idx] = targetTrip;
          await Store.saveTrips(allTrips);
        }
        
        addModal.classList.remove('active');
        showToast('Activity added to trip itinerary!', 'success');
        
        setTimeout(() => {
          window.location.href = 'itinerary.html';
        }, 500);
      };

      const risk = await assessWeatherRisk(targetTrip.destination, activityDate, selectedActivityData.category);
      if (risk.isRisky) {
        addModal.classList.remove('active');
        handleWeatherRiskWarning(risk, proceedAddActivity);
      } else {
        proceedAddActivity();
      }
    });
  }

  document.querySelectorAll('.modal-close, .modal-cancel').forEach(btn => {
    btn.addEventListener('click', () => { addModal.classList.remove('active'); });
  });
}

// 10. Weather Advisory (weather.html)
async function initWeatherPage() {
  const activeTripId = localStorage.getItem('traveloop_active_trip_id');
  const trips = await Store.getTrips();
  const selectedTrip = trips.find(t => t.id === activeTripId);
  if (!selectedTrip) return;

  const searchInput = document.getElementById('weather-city-input');
  const searchBtn = document.getElementById('weather-search-btn');
  const details = document.getElementById('weather-details-section');

  if (!searchInput || !searchBtn || !details) return;

  const addWeatherForm = document.getElementById('add-weather-activity-form');
  const addWeatherModal = document.getElementById('add-weather-activity-modal');
  
  if (addWeatherForm) {
    // Remove existing listener to prevent duplicates if init runs multiple times
    const newForm = addWeatherForm.cloneNode(true);
    addWeatherForm.parentNode.replaceChild(newForm, addWeatherForm);
    const updatedForm = document.getElementById('add-weather-activity-form');
    const updatedModal = document.getElementById('add-weather-activity-modal');
    
    updatedForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = updatedModal.getAttribute('data-target-name');
      const cost = parseFloat(updatedModal.getAttribute('data-target-cost')) || 0;
      const cat = updatedModal.getAttribute('data-target-cat') || 'Sightseeing';
      const dateVal = document.getElementById('weather-activity-date').value;
      
      const proceedAddWeatherActivity = async () => {
        if (!selectedTrip.itinerary) selectedTrip.itinerary = [];
        if (!selectedTrip.expenses) selectedTrip.expenses = [];
        
        selectedTrip.itinerary.push({
          city: selectedTrip.destination,
          date: dateVal,
          activity: name,
          category: cat,
          cost: cost,
          duration: '2 hours',
          start_time: ''
        });
        
        if (cost > 0) {
          selectedTrip.expenses.push({
            description: name,
            amount: cost,
            category: 'Activities',
            date: dateVal,
            status: 'Pending'
          });
        }
        
        try {
          const allTrips = await Store.getTrips();
          const idx = allTrips.findIndex(t => t.id === selectedTrip.id);
          if (idx !== -1) {
            allTrips[idx] = selectedTrip;
            await Store.saveTrips(allTrips);
          }
          showToast(`${name} added to your itinerary!`, 'success');
          updatedModal.classList.remove('active');
        } catch (err) {
          showToast('Failed to save activity', 'error');
        }
      };

      const risk = await assessWeatherRisk(selectedTrip.destination, dateVal, cat);
      if (risk.isRisky) {
        updatedModal.classList.remove('active');
        handleWeatherRiskWarning(risk, proceedAddWeatherActivity);
      } else {
        proceedAddWeatherActivity();
      }
    });
  }

  // Render Itinerary City Chips
  const citiesContainer = document.getElementById('itinerary-cities-container');
  const citiesChips = document.getElementById('itinerary-cities-chips');

  if (citiesContainer && citiesChips && selectedTrip && selectedTrip.itinerary && selectedTrip.itinerary.length > 0) {
    // Get unique cities from the itinerary
    const cities = [...new Set(selectedTrip.itinerary.map(item => item.city))].filter(Boolean);
    if (cities.length > 0) {
      citiesContainer.style.display = 'block';
      citiesChips.innerHTML = cities.map(city => `
        <button class="btn btn-secondary itinerary-city-chip" style="width:auto; padding: 0.35rem 0.75rem; font-size: 0.8rem; border-radius: 20px; cursor: pointer; display: flex; align-items: center; gap: 4px;">
          <i class="fas fa-map-pin" style="color: var(--accent);"></i> ${city}
        </button>
      `).join('');

      // Add click handlers to chips
      citiesChips.querySelectorAll('.itinerary-city-chip').forEach(btn => {
        btn.addEventListener('click', () => {
          const cityName = btn.innerText.trim();
          searchInput.value = cityName;
          triggerSearch();
        });
      });
    }
  }

  // Auto-fetch for the selected trip destination by default
  if (selectedTrip && selectedTrip.destination) {
    searchInput.value = selectedTrip.destination;
    setTimeout(() => {
      triggerSearch();
    }, 100);
  }

  searchBtn.addEventListener('click', triggerSearch);
  searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') triggerSearch();
  });

  function triggerSearch() {
    const city = searchInput.value.trim();
    if (!city) {
      showToast('Please enter a city name', 'warning');
      return;
    }

    // Show loading spinner
    details.innerHTML = `
      <div style="text-align:center; padding: 4rem 0;">
        <i class="fas fa-snowflake fa-spin" style="font-size: 3rem; color:var(--accent); margin-bottom: 1rem;"></i>
        <h4>Fetching weather data...</h4>
        <p style="color:var(--text-secondary); margin-top:0.5rem;">Retrieving information for ${city}.</p>
      </div>`;

    // First, get coordinates via geocoding API and suggestions from backend in parallel
    Promise.all([
      fetch(`https://geocode.maps.co/search?q=${encodeURIComponent(city)}`).then(res => res.json()),
      fetch(`${API_BASE}/trips/suggestions?city=${encodeURIComponent(city)}`).then(res => res.json()).catch(() => ({ places: [], activities: [] }))
    ])
      .then(([data, suggestionsData]) => {
        if (!data || data.length === 0) throw new Error('Location not found');
        const { lat, lon } = data[0];
        
        // Categorize live suggestions into indoor/outdoor
        const allSugg = [...(suggestionsData.places || []), ...(suggestionsData.activities || [])];
        const indoorSugg = [];
        const outdoorSugg = [];
        // Deduplicate suggestions by name
        const uniqueSugg = Array.from(new Map(allSugg.map(item => [item.name, item])).values());
        
        uniqueSugg.forEach(s => {
          const cat = (s.category || '').toLowerCase();
          if (cat.includes('museum') || cat.includes('gallery') || cat.includes('food') || cat.includes('workshop') || cat.includes('shopping') || cat.includes('culture') || cat.includes('historic')) {
            indoorSugg.push(s);
          } else {
            outdoorSugg.push(s);
          }
        });

        // Then fetch weather using Open-Meteo
        return fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,relativehumidity_2m,uv_index&current_weather=true`)
          .then(res => res.json())
          .then(weather => ({ weather, indoorSugg, outdoorSugg }));
      })
      .then(({ weather, indoorSugg, outdoorSugg }) => {
        const { temperature, windspeed, weathercode } = weather.current_weather;
        const uv = weather.hourly && weather.hourly.uv_index ? weather.hourly.uv_index[0] : 0;
        const humidity = weather.hourly && weather.hourly.relativehumidity_2m ? weather.hourly.relativehumidity_2m[0] : 50;
        
        let alertBannerHTML = '';
        let summary = "Mild scattered clouds, moderate wind speeds.";
        let packingList = [];
        let safetyAlerts = "";
        let weatherTitle = "Clear Sightseeing Climate";
        let color = "var(--success)";
        let icon = "fa-cloud-sun";
        let recommendedItems = [];
        let riskyItems = [];

        const isRainy = (weathercode >= 51 && weathercode <= 67) || (weathercode >= 80 && weathercode <= 82) || (weathercode >= 95);

        if (uv > 8) {
          weatherTitle = "Heatwave Alert";
          icon = "fa-temperature-high";
          color = "var(--warning)";
          alertBannerHTML = `
            <div class="weather-alert-banner banner-heatwave">
              <i class="fas fa-sun"></i>
              <div>
                <strong>Heatwave Alert Advisory:</strong> Ultraviolet indexes exceed Level 8. Thermal exhaustion risk during active outdoor activities.
              </div>
            </div>
          `;
          packingList = ["Wide brim straw sunhat", "Electrolyte hydration packs", "UPF 50 Sunscreen lotion", "Linen garments"];
          safetyAlerts = "Avoid outdoors activity between 11:00 AM and 4:00 PM. Hydrate continuously. Wear UV protection.";
          summary = `Intense direct solar rays. UV index: ${uv}.`;
          recommendedItems = [...indoorSugg];
          riskyItems = [...outdoorSugg];
          if (recommendedItems.length === 0) recommendedItems = [{name: "Indoor shopping malls", cost: 0}, {name: "Hotel spa therapy", cost: 0}];
          if (riskyItems.length === 0) riskyItems = [{name: "Noon desert safari"}, {name: "Strenuous cycling tours"}];
        } else if (isRainy) {
          weatherTitle = "Precipitation Storm Warning";
          icon = "fa-cloud-showers-heavy";
          color = "var(--accent)";
          alertBannerHTML = `
            <div class="weather-alert-banner banner-rainfall">
              <i class="fas fa-cloud-showers-heavy"></i>
              <div>
                <strong>Rainfall Warning Alert:</strong> Severe precipitation detected. Roads and outdoor routes might be slippery or restricted.
              </div>
            </div>
          `;
          packingList = ["Windproof umbrella", "Water-resistant mudboots", "Raincoat shell", "Quick-dry socks"];
          safetyAlerts = "Avoid water bodies. Do not trek or schedule outdoor canyon activities. Maintain indoor stay.";
          summary = `Precipitation detected. Wind speed: ${windspeed} km/h.`;
          recommendedItems = [...indoorSugg];
          riskyItems = [...outdoorSugg];
          if (recommendedItems.length === 0) recommendedItems = [{name: "Museum visits", cost: 0}, {name: "Local café hopping", cost: 0}];
          if (riskyItems.length === 0) riskyItems = [{name: "Mountain trekking"}, {name: "Boat cruises"}];
        } else {
          weatherTitle = "Clear Sightseeing Climate";
          icon = "fa-cloud-sun";
          color = "var(--success)";
          alertBannerHTML = `
            <div class="weather-alert-banner" style="background: rgba(22, 199, 154, 0.1); border: 1px solid var(--success); color:#22d8a9;">
              <i class="fas fa-check-circle"></i>
              <div>
                <strong>Ideal Travel Advisory:</strong> Perfect climatological conditions. Open for all sight-seeing, outdoor hiking, and flight schedules.
              </div>
            </div>
          `;
          packingList = ["Breathable active sneakers", "Sunglasses", "Camera set", "Light cardigan"];
          safetyAlerts = "No climate risks. Fully clear and recommended for sightseeing, camping, and beach activities.";
          summary = `Comfortable conditions. Wind speed: ${windspeed} km/h.`;
          recommendedItems = [...outdoorSugg, ...indoorSugg];
          riskyItems = [];
          if (recommendedItems.length === 0) recommendedItems = [{name: "Historical walking tour", cost: 0}, {name: "Outdoor nature photography", cost: 0}];
        }

        const renderItems = (items, isRecommended) => {
          if (items.length === 0) return `<li>None specified.</li>`;
          return items.slice(0, 5).map(item => `
            <li style="margin-bottom: 0.75rem; display: flex; justify-content: space-between; align-items: start; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 0.5rem;">
              <div>
                <strong style="display:block; margin-bottom: 0.2rem;">${item.name}</strong>
                ${item.cost !== undefined ? `<span style="font-size: 0.8rem; color: var(--success);">${item.cost === 0 ? 'Free' : '$' + item.cost}</span>` : ''}
              </div>
              ${isRecommended && item.cost !== undefined ? `<button class="btn btn-secondary add-weather-act-btn" data-name="${item.name}" data-cost="${item.cost}" data-cat="${item.category || 'Sightseeing'}" style="padding: 0.3rem 0.6rem; font-size: 0.75rem; width: auto;"><i class="fas fa-plus"></i> Add</button>` : ''}
            </li>
          `).join('');
        };

        details.innerHTML = `
          ${alertBannerHTML}
          <div class="dashboard-grid" style="margin-top: 1.5rem;">
            <div class="span-4 card" style="text-align:center; display: flex; flex-direction: column; justify-content: center; align-items: center;">
              <span style="color:var(--text-secondary); font-size:0.9rem;">Current Temperature</span>
              <div class="weather-metric-val" style="font-size:3rem; font-weight:bold; margin: 1rem 0; color:var(--text-primary);">${temperature}°C</div>
              <p style="font-size:0.85rem; color:var(--text-secondary); margin-top:0.5rem;">${summary}</p>
            </div>
            <div class="span-8 card">
              <h4 style="margin-bottom:0.75rem;"><i class="fas fa-shield-alt"></i> Safety & Commute Advisories</h4>
              <p style="font-size:0.95rem; line-height: 1.5; color:var(--text-secondary);">${safetyAlerts}</p>
              
              <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(100px, 1fr)); gap: 1rem; margin-top: 1.2rem; border-top: 1px solid rgba(120,120,120,0.15); padding-top: 1rem;">
                <div style="text-align: center;">
                  <span style="font-size: 0.8rem; color: var(--text-secondary); display: block; margin-bottom: 0.25rem;"><i class="fas fa-wind" style="color: var(--accent);"></i> Wind</span>
                  <strong style="font-size: 0.95rem; color: var(--text-primary); font-family: var(--font-mono);">${windspeed} km/h</strong>
                </div>
                <div style="text-align: center;">
                  <span style="font-size: 0.8rem; color: var(--text-secondary); display: block; margin-bottom: 0.25rem;"><i class="fas fa-droplet" style="color: var(--success);"></i> Humidity</span>
                  <strong style="font-size: 0.95rem; color: var(--text-primary); font-family: var(--font-mono);">${humidity}%</strong>
                </div>
                <div style="text-align: center;">
                  <span style="font-size: 0.8rem; color: var(--text-secondary); display: block; margin-bottom: 0.25rem;"><i class="fas fa-sun" style="color: var(--warning);"></i> UV Index</span>
                  <strong style="font-size: 0.95rem; color: var(--text-primary); font-family: var(--font-mono);">${uv}</strong>
                </div>
                <div style="text-align: center;">
                  <span style="font-size: 0.8rem; color: var(--text-secondary); display: block; margin-bottom: 0.25rem;"><i class="fas fa-compass" style="color: var(--success);"></i> Suitability</span>
                  <strong style="font-size: 0.95rem; color: ${isRainy ? 'var(--accent)' : uv > 8 ? 'var(--warning)' : 'var(--success)'};">${isRainy ? 'Poor (30%)' : uv > 8 ? 'Caution (65%)' : 'Excellent (95%)'}</strong>
                </div>
              </div>
            </div>
            
            <div class="span-6 card">
              <h4 style="color:var(--success); margin-bottom:0.75rem;"><i class="fas fa-thumbs-up"></i> Recommended Activities</h4>
              <ul style="padding-left:0; margin:0; font-size:0.9rem; line-height: 1.6; color:var(--text-secondary); list-style: none;">
                ${renderItems(recommendedItems, true)}
              </ul>
            </div>
            <div class="span-6 card">
              <h4 style="color:var(--accent); margin-bottom:0.75rem;"><i class="fas fa-thumbs-down"></i> Risky Activities</h4>
              <ul style="padding-left:0; margin:0; font-size:0.9rem; line-height: 1.6; color:var(--text-secondary); list-style: none;">
                ${renderItems(riskyItems, false)}
              </ul>
            </div>
            <div class="span-12 card">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem; flex-wrap:wrap; gap:0.5rem;">
                <h4 style="margin:0;"><i class="fas fa-luggage-cart"></i> Weather-Optimized Packing Recommendations</h4>
                <button id="add-all-packing-btn" class="btn btn-secondary" style="width:auto; padding:0.4rem 0.8rem; font-size:0.8rem; display:flex; align-items:center; gap:5px;"><i class="fas fa-plus"></i> Add to Packing List</button>
              </div>
              <div style="display:flex; flex-wrap:wrap; gap:0.5rem;">
                ${packingList.map(item => `
                  <span class="weather-packing-pill" style="background:rgba(120,120,120,0.1); border:1px solid var(--glass-border); padding: 0.4rem 0.8rem; color:var(--text-primary); font-size:0.85rem; text-transform:none; border-radius:30px; display:inline-flex; align-items:center;">
                    <i class="fas fa-check" style="color:var(--success); margin-right:5px;"></i>${item}
                  </span>
                `).join('')}
              </div>
            </div>
          </div>
        `;
        
        // Attach listener for dynamic weather activity adding
        details.querySelectorAll('.add-weather-act-btn').forEach(btn => {
          btn.addEventListener('click', () => {
            const name = btn.getAttribute('data-name');
            const cost = parseFloat(btn.getAttribute('data-cost')) || 0;
            const cat = btn.getAttribute('data-cat') || 'Sightseeing';
            
            if (!selectedTrip) {
              showToast('No active trip found.', 'error');
              return;
            }
            
            const updatedModal = document.getElementById('add-weather-activity-modal');
            const tripSelect = document.getElementById('select-trip-weather');
            const dateInput = document.getElementById('weather-activity-date');
            
            if (tripSelect) {
              tripSelect.innerHTML = `<option value="${selectedTrip.id}">${selectedTrip.name}</option>`;
              tripSelect.disabled = true;
            }
            if (dateInput) {
              dateInput.setAttribute('min', selectedTrip.startDate);
              dateInput.setAttribute('max', selectedTrip.endDate);
              dateInput.value = selectedTrip.startDate;
            }
            
            updatedModal.setAttribute('data-target-name', name);
            updatedModal.setAttribute('data-target-cost', cost);
            updatedModal.setAttribute('data-target-cat', cat);
            updatedModal.classList.add('active');
          });
        });

        // Attach listener for packing recommendations adding
        const addAllPackingBtn = details.querySelector('#add-all-packing-btn');
        if (addAllPackingBtn) {
          addAllPackingBtn.addEventListener('click', async () => {
            if (!selectedTrip) {
              showToast('No active trip found.', 'error');
              return;
            }
            if (!selectedTrip.checklist) selectedTrip.checklist = [];
            
            let addedCount = 0;
            packingList.forEach(item => {
              const exists = selectedTrip.checklist.some(c => c.name.toLowerCase() === item.toLowerCase());
              if (!exists) {
                selectedTrip.checklist.push({
                  name: item,
                  category: 'Clothing',
                  packed: false
                });
                addedCount++;
              }
            });

            if (addedCount > 0) {
              try {
                const allTrips = await Store.getTrips();
                const idx = allTrips.findIndex(t => t.id === selectedTrip.id);
                if (idx !== -1) {
                  allTrips[idx] = selectedTrip;
                  await Store.saveTrips(allTrips);
                }
                showToast(`Added ${addedCount} items to your packing checklist!`, 'success');
              } catch (err) {
                showToast('Failed to save packing list items', 'error');
              }
            } else {
              showToast('All items are already in your packing list!', 'info');
            }
          });
        }

      })
      .catch(err => {
        console.warn("API fetch failed, falling back to mock weather simulation:", err);
        // Fallback simulation
        const charCodeSum = city.split('').reduce((sum, c) => sum + c.charCodeAt(0), 0);
        const weatherType = charCodeSum % 3; // 0 = rainy, 1 = hot, 2 = pleasant

        let weatherTitle = "Clear Sightseeing Climate";
        let weatherTemp = "22°C";
        let icon = "fa-cloud-sun";
        let color = "var(--success)";
        let alertBannerHTML = `
            <div class="weather-alert-banner" style="background: rgba(22, 199, 154, 0.1); border: 1px solid var(--success); color:#22d8a9;">
              <i class="fas fa-check-circle"></i>
              <div>
                <strong>Ideal Travel Advisory:</strong> Perfect climatological conditions. Open for all sight-seeing, outdoor hiking, and flight schedules.
              </div>
            </div>`;
        let recommendedItems = [
          {name: "Historical walking tour", cost: 0, category: "Sightseeing"},
          {name: "Outdoor nature photography", cost: 0, category: "Nature"},
          {name: "Rooftop dinner", cost: 45, category: "Food"}
        ];
        let riskyItems = [];
        let packingList = ["Breathable active sneakers", "Sunglasses", "Camera set", "Light cardigan"];
        let safetyAlerts = "No climate risks. Fully clear and recommended for sightseeing, camping, and beach activities.";
        let summary = "Comfortable sightseeing conditions.";

        let simulatedWind = "15 km/h";
        let simulatedHumidity = "55%";
        let simulatedUV = "4";
        let simulatedSuitability = "Excellent (95%)";
        let suitabilityColor = "var(--success)";
        let isRainySim = false;

        if (weatherType === 0) {
          isRainySim = true;
          weatherTitle = "Precipitation Storm Warning";
          weatherTemp = "18°C";
          icon = "fa-cloud-showers-heavy";
          color = "var(--accent)";
          alertBannerHTML = `
            <div class="weather-alert-banner banner-rainfall">
              <i class="fas fa-cloud-showers-heavy"></i>
              <div>
                <strong>Rainfall Warning Alert:</strong> Severe precipitation detected. Roads and outdoor routes might be slippery or restricted.
              </div>
            </div>`;
          recommendedItems = [
            {name: "Museum visits", cost: 20, category: "Sightseeing"},
            {name: "Indoors art tasting", cost: 15, category: "Sightseeing"},
            {name: "Local café hopping", cost: 10, category: "Food"}
          ];
          riskyItems = [
            {name: "Mountain trekking"},
            {name: "Open beach surfing"},
            {name: "Boat cruises"}
          ];
          packingList = ["Windproof umbrella", "Water-resistant mudboots", "Raincoat shell", "Quick-dry socks"];
          safetyAlerts = "Avoid water bodies. Do not trek or schedule outdoor canyon activities. Maintain indoor stay.";
          summary = "Precipitation detected. Slippery paths alert.";

          simulatedWind = "25 km/h";
          simulatedHumidity = "90%";
          simulatedUV = "2";
          simulatedSuitability = "Poor (30%)";
          suitabilityColor = "var(--accent)";
        } else if (weatherType === 1) {
          weatherTitle = "Heatwave Alert";
          weatherTemp = "38°C";
          icon = "fa-temperature-high";
          color = "var(--warning)";
          alertBannerHTML = `
            <div class="weather-alert-banner banner-heatwave">
              <i class="fas fa-sun"></i>
              <div>
                <strong>Heatwave Alert Advisory:</strong> Ultraviolet indexes exceed Level 8. Thermal exhaustion risk during active outdoor activities.
              </div>
            </div>`;
          recommendedItems = [
            {name: "Indoor shopping malls", cost: 0, category: "Shopping"},
            {name: "Early morning walk", cost: 0, category: "Nature"},
            {name: "Hotel spa therapy", cost: 80, category: "Wellness"}
          ];
          riskyItems = [
            {name: "Noon desert safari"},
            {name: "Strenuous cycling tours"},
            {name: "Outdoor archaeological sightseeing"}
          ];
          packingList = ["Wide brim straw sunhat", "Electrolyte hydration packs", "UPF 50 Sunscreen lotion", "Linen garments"];
          safetyAlerts = "Avoid outdoors activity between 11:00 AM and 4:00 PM. Hydrate continuously. Wear UV protection.";
          summary = "Intense direct solar rays. High UV index warning.";

          simulatedWind = "10 km/h";
          simulatedHumidity = "30%";
          simulatedUV = "9";
          simulatedSuitability = "Caution (65%)";
          suitabilityColor = "var(--warning)";
        }

        const renderItems = (items, isRecommended) => {
          if (items.length === 0) return `<li>None specified.</li>`;
          return items.slice(0, 5).map(item => `
            <li style="margin-bottom: 0.75rem; display: flex; justify-content: space-between; align-items: start; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 0.5rem;">
              <div>
                <strong style="display:block; margin-bottom: 0.2rem;">${item.name}</strong>
                ${item.cost !== undefined ? `<span style="font-size: 0.8rem; color: var(--success);">${item.cost === 0 ? 'Free' : '$' + item.cost}</span>` : ''}
              </div>
              ${isRecommended && item.cost !== undefined ? `<button class="btn btn-secondary add-weather-act-btn" data-name="${item.name}" data-cost="${item.cost}" data-cat="${item.category || 'Sightseeing'}" style="padding: 0.3rem 0.6rem; font-size: 0.75rem; width: auto;"><i class="fas fa-plus"></i> Add</button>` : ''}
            </li>
          `).join('');
        };

        details.innerHTML = `
          ${alertBannerHTML}
          <div class="dashboard-grid" style="margin-top: 1.5rem;">
            <div class="span-4 card" style="text-align:center; display: flex; flex-direction: column; justify-content: center; align-items: center;">
              <span style="color:var(--text-secondary); font-size:0.9rem;">Current Temperature</span>
              <div class="weather-metric-val" style="font-size:3rem; font-weight:bold; margin: 1rem 0; color:var(--text-primary);">${weatherTemp}</div>
              <p style="font-size:0.85rem; color:var(--text-secondary); margin-top:0.5rem;">${summary} (Simulated)</p>
            </div>
            <div class="span-8 card">
              <h4 style="margin-bottom:0.75rem;"><i class="fas fa-shield-alt"></i> Safety & Commute Advisories</h4>
              <p style="font-size:0.95rem; line-height: 1.5; color:var(--text-secondary);">${safetyAlerts}</p>
              
              <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(100px, 1fr)); gap: 1rem; margin-top: 1.2rem; border-top: 1px solid rgba(120,120,120,0.15); padding-top: 1rem;">
                <div style="text-align: center;">
                  <span style="font-size: 0.8rem; color: var(--text-secondary); display: block; margin-bottom: 0.25rem;"><i class="fas fa-wind" style="color: var(--accent);"></i> Wind</span>
                  <strong style="font-size: 0.95rem; color: var(--text-primary); font-family: var(--font-mono);">${simulatedWind}</strong>
                </div>
                <div style="text-align: center;">
                  <span style="font-size: 0.8rem; color: var(--text-secondary); display: block; margin-bottom: 0.25rem;"><i class="fas fa-droplet" style="color: var(--success);"></i> Humidity</span>
                  <strong style="font-size: 0.95rem; color: var(--text-primary); font-family: var(--font-mono);">${simulatedHumidity}</strong>
                </div>
                <div style="text-align: center;">
                  <span style="font-size: 0.8rem; color: var(--text-secondary); display: block; margin-bottom: 0.25rem;"><i class="fas fa-sun" style="color: var(--warning);"></i> UV Index</span>
                  <strong style="font-size: 0.95rem; color: var(--text-primary); font-family: var(--font-mono);">${simulatedUV}</strong>
                </div>
                <div style="text-align: center;">
                  <span style="font-size: 0.8rem; color: var(--text-secondary); display: block; margin-bottom: 0.25rem;"><i class="fas fa-compass" style="color: var(--success);"></i> Suitability</span>
                  <strong style="font-size: 0.95rem; color: ${suitabilityColor};">${simulatedSuitability}</strong>
                </div>
              </div>
            </div>
            
            <div class="span-6 card">
              <h4 style="color:var(--success); margin-bottom:0.75rem;"><i class="fas fa-thumbs-up"></i> Recommended Activities</h4>
              <ul style="padding-left:0; margin:0; font-size:0.9rem; line-height: 1.6; color:var(--text-secondary); list-style: none;">
                ${renderItems(recommendedItems, true)}
              </ul>
            </div>
            <div class="span-6 card">
              <h4 style="color:var(--accent); margin-bottom:0.75rem;"><i class="fas fa-thumbs-down"></i> Risky Activities</h4>
              <ul style="padding-left:0; margin:0; font-size:0.9rem; line-height: 1.6; color:var(--text-secondary); list-style: none;">
                ${renderItems(riskyItems, false)}
              </ul>
            </div>
            <div class="span-12 card">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem; flex-wrap:wrap; gap:0.5rem;">
                <h4 style="margin:0;"><i class="fas fa-luggage-cart"></i> Weather-Optimized Packing Recommendations</h4>
                <button id="add-all-packing-btn" class="btn btn-secondary" style="width:auto; padding:0.4rem 0.8rem; font-size:0.8rem; display:flex; align-items:center; gap:5px;"><i class="fas fa-plus"></i> Add to Packing List</button>
              </div>
              <div style="display:flex; flex-wrap:wrap; gap:0.5rem;">
                ${packingList.map(item => `
                  <span class="weather-packing-pill" style="background:rgba(120,120,120,0.1); border:1px solid var(--glass-border); padding: 0.4rem 0.8rem; color:var(--text-primary); font-size:0.85rem; text-transform:none; border-radius:30px; display:inline-flex; align-items:center;">
                    <i class="fas fa-check" style="color:var(--success); margin-right:5px;"></i>${item}
                  </span>
                `).join('')}
              </div>
            </div>
          </div>
        `;
        
        // Attach listener for dynamic weather activity adding
        details.querySelectorAll('.add-weather-act-btn').forEach(btn => {
          btn.addEventListener('click', () => {
            const name = btn.getAttribute('data-name');
            const cost = parseFloat(btn.getAttribute('data-cost')) || 0;
            const cat = btn.getAttribute('data-cat') || 'Sightseeing';
            
            if (!selectedTrip) {
              showToast('No active trip found.', 'error');
              return;
            }
            
            const updatedModal = document.getElementById('add-weather-activity-modal');
            const tripSelect = document.getElementById('select-trip-weather');
            const dateInput = document.getElementById('weather-activity-date');
            
            if (tripSelect) {
              tripSelect.innerHTML = `<option value="${selectedTrip.id}">${selectedTrip.name}</option>`;
              tripSelect.disabled = true;
            }
            if (dateInput) {
              dateInput.setAttribute('min', selectedTrip.startDate);
              dateInput.setAttribute('max', selectedTrip.endDate);
              dateInput.value = selectedTrip.startDate;
            }
            
            updatedModal.setAttribute('data-target-name', name);
            updatedModal.setAttribute('data-target-cost', cost);
            updatedModal.setAttribute('data-target-cat', cat);
            updatedModal.classList.add('active');
          });
        });

        // Attach listener for packing recommendations adding
        const addAllPackingBtnCatch = details.querySelector('#add-all-packing-btn');
        if (addAllPackingBtnCatch) {
          addAllPackingBtnCatch.addEventListener('click', async () => {
            if (!selectedTrip) {
              showToast('No active trip found.', 'error');
              return;
            }
            if (!selectedTrip.checklist) selectedTrip.checklist = [];

            let addedCount = 0;
            packingList.forEach(item => {
              const exists = selectedTrip.checklist.some(c => c.name.toLowerCase() === item.toLowerCase());
              if (!exists) {
                selectedTrip.checklist.push({
                  name: item,
                  category: 'Clothing',
                  packed: false
                });
                addedCount++;
              }
            });

            if (addedCount > 0) {
              try {
                const allTrips = await Store.getTrips();
                const idx = allTrips.findIndex(t => t.id === selectedTrip.id);
                if (idx !== -1) {
                  allTrips[idx] = selectedTrip;
                  await Store.saveTrips(allTrips);
                }
                showToast(`Added ${addedCount} items to your packing checklist!`, 'success');
              } catch (err) {
                showToast('Failed to save packing list items', 'error');
              }
            } else {
              showToast('All items are already in your packing list!', 'info');
            }
          });
        }

      });
  }
}


// 12. Budget & Expenses (budget.html)
async function initBudgetPage() {
  const urlParams = new URLSearchParams(window.location.search);
  let tripId = urlParams.get('tripId') || localStorage.getItem('traveloop_active_trip_id');
  const trips = await Store.getTrips();

  const trip = trips.find(t => t.id === tripId);
  if (!trip) return;

  localStorage.setItem('traveloop_active_trip_id', trip.id);

  // Update header labels
  const tripTitle = document.getElementById('budget-trip-title');
  if (tripTitle) tripTitle.textContent = `Budgeting: ${trip.name}`;

  const budgetForm = document.getElementById('add-expense-form');
  const expenseTableBody = document.getElementById('expense-table-body');
  
  // Search & Filter State
  let currentSearch = "";
  let currentCategoryFilter = "All";

  // Set default expense date
  const expDateInput = document.getElementById('expense-date');
  if (expDateInput) {
    expDateInput.setAttribute('min', trip.startDate);
    expDateInput.setAttribute('max', trip.endDate);
    expDateInput.value = trip.startDate;
  }

  function renderBudgetOverview() {
    if (!trip.expenses) trip.expenses = [];

    const totalBudget = parseFloat(trip.budget) || 0;
    const spent = trip.expenses.filter(e => e.status !== 'Pending').reduce((sum, item) => sum + parseFloat(item.amount), 0);
    const remaining = totalBudget - spent;

    // Set text cards
    const limitLbl = document.getElementById('budget-limit-val');
    const spentLbl = document.getElementById('budget-spent-val');
    const remLbl = document.getElementById('budget-remaining-val');

    if (limitLbl) limitLbl.textContent = `$${totalBudget.toLocaleString()}`;
    if (spentLbl) spentLbl.textContent = `$${spent.toLocaleString()}`;
    if (remLbl) {
      remLbl.textContent = `$${remaining.toLocaleString()}`;
      remLbl.style.color = remaining < 0 ? 'var(--accent)' : 'var(--success)';
    }

    // Render alert banners
    const alertBox = document.getElementById('budget-alert-box');
    if (alertBox) {
      const pct = totalBudget > 0 ? (spent / totalBudget) * 100 : 0;
      if (spent > totalBudget) {
        alertBox.className = "weather-alert-banner banner-rainfall";
        alertBox.style.display = "flex";
        alertBox.innerHTML = `<i class="fas fa-exclamation-triangle"></i> <div><strong>Budget Overrun Danger:</strong> Your expenses have exceeded your set limit by $${Math.abs(remaining).toLocaleString()}! Review your items below.</div>`;
      } else if (pct >= 80) {
        alertBox.className = "weather-alert-banner banner-heatwave";
        alertBox.style.display = "flex";
        alertBox.innerHTML = `<i class="fas fa-exclamation-circle"></i> <div><strong>Budget Alert Limit:</strong> You have utilized ${Math.round(pct)}% of your available trip budget! Proceed with caution.</div>`;
      } else {
        alertBox.style.display = "none";
      }
    }

    // Filter expenses before rendering table rows
    const filteredExpenses = trip.expenses.filter(exp => {
      const matchSearch = exp.description.toLowerCase().includes(currentSearch.toLowerCase()) || 
                          exp.category.toLowerCase().includes(currentSearch.toLowerCase());
      const matchCategory = currentCategoryFilter === 'All' || exp.category === currentCategoryFilter;
      return matchSearch && matchCategory;
    });

    // Render Table list
    if (expenseTableBody) {
      if (filteredExpenses.length === 0) {
        expenseTableBody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:var(--text-secondary); padding: 2rem 0;">No matching expenses found.</td></tr>`;
      } else {
        // Sort reverse
        const sortedExp = [...filteredExpenses].reverse();
        expenseTableBody.innerHTML = sortedExp.map((exp, index) => {
          // Adjust idx based on absolute array index
          const realIdx = trip.expenses.findIndex(e => e === exp);
          const isPending = exp.status === 'Pending';
          const statusBadge = isPending 
            ? `<span style="font-size:0.7rem; background:rgba(245,166,35,0.1); border:1px solid var(--warning); color:var(--warning); text-transform:uppercase; margin-left:5px; padding:2px 8px; border-radius:12px;">Pending</span>`
            : `<span style="font-size:0.7rem; background:rgba(22,199,154,0.1); border:1px solid var(--success); color:var(--success); text-transform:uppercase; margin-left:5px; padding:2px 8px; border-radius:12px;">Paid</span>`;
          return `
            <tr>
              <td style="font-family:var(--font-mono);">${exp.date}</td>
              <td style="font-weight:600; display:flex; align-items:center; flex-wrap:wrap; gap:0.25rem;">
                <span>${exp.description}</span>
                ${statusBadge}
              </td>
              <td><span class="checklist-category-lbl" style="font-size:0.75rem; text-transform:none;">${exp.category}</span></td>
              <td style="font-family:var(--font-mono); font-weight:700;">$${parseFloat(exp.amount).toLocaleString()}</td>
              <td>
                <button class="btn btn-secondary delete-expense-btn" data-index="${realIdx}" style="padding: 0.25rem 0.5rem; width:auto; color:var(--accent); font-size:0.8rem; border-radius:4px; border:none; background:none;">
                  <i class="fas fa-trash-alt"></i>
                </button>
              </td>
            </tr>
          `;
        }).join('');

        // Bind delete action listeners
        expenseTableBody.querySelectorAll('.delete-expense-btn').forEach(btn => {
          btn.addEventListener('click', () => {
            const idx = parseInt(btn.getAttribute('data-index'));
            trip.expenses.splice(idx, 1);
            saveAndUpdate();
            showToast('Expense removed', 'success');
          });
        });

        // Render Pending Payments Section
        const pendingSection = document.getElementById('pending-payments-section');
        const pendingContainer = document.getElementById('pending-payments');
        if (pendingSection && pendingContainer) {
          const pendingExpenses = trip.expenses.filter(e => e.status === 'Pending');
          if (pendingExpenses.length > 0) {
            pendingSection.style.display = 'block';
            pendingContainer.innerHTML = pendingExpenses.map((exp) => {
              const rIdx = trip.expenses.findIndex(e => e === exp);
              return `
                <div class="card" style="padding:1rem; border-left: 3px solid var(--warning); display:flex; justify-content:space-between; align-items:center;">
                  <div>
                    <strong style="display:block; margin-bottom:0.2rem;">${exp.description}</strong>
                    <span style="font-size:0.8rem; color:var(--text-secondary);"><i class="fas fa-calendar-day"></i> Due: ${exp.date}</span>
                  </div>
                  <div style="text-align:right;">
                    <strong style="display:block; color:var(--text-primary); margin-bottom:0.4rem;">$${parseFloat(exp.amount).toLocaleString()}</strong>
                    <button class="btn btn-primary mark-paid-btn" data-index="${rIdx}" style="padding: 0.35rem 0.75rem; font-size:0.75rem;"><i class="fas fa-check"></i> Mark Paid</button>
                  </div>
                </div>
              `;
            }).join('');

            pendingContainer.querySelectorAll('.mark-paid-btn').forEach(btn => {
              btn.addEventListener('click', () => {
                const idx = parseInt(btn.getAttribute('data-index'));
                trip.expenses[idx].status = 'Paid';
                saveAndUpdate();
                showToast('Marked as Paid!', 'success');
              });
            });
          } else {
            pendingSection.style.display = 'none';
            pendingContainer.innerHTML = '';
          }
        }
      }
    }

    // Render Custom Pie SVG Chart
    renderPieChart(spent, totalBudget);
  }

  function renderPieChart(spent, limit) {
    const svgCircle = document.getElementById('pie-chart-stroke');
    const valText = document.getElementById('pie-chart-pct');
    if (!svgCircle || !valText) return;

    const pct = limit > 0 ? Math.min(Math.round((spent / limit) * 100), 100) : 0;
    valText.textContent = `${pct}%`;

    const circumference = 150.79;
    const strokeDashoffset = circumference - (pct / 100) * circumference;

    svgCircle.style.strokeDasharray = circumference;
    svgCircle.style.strokeDashoffset = strokeDashoffset;

    if (pct >= 100) {
      svgCircle.style.stroke = "var(--accent)";
    } else if (pct >= 80) {
      svgCircle.style.stroke = "var(--warning)";
    } else {
      svgCircle.style.stroke = "var(--success)";
    }
  }

  async function saveAndUpdate() {
    const allTrips = await Store.getTrips();
    const idx = allTrips.findIndex(t => t.id === trip.id);
    if (idx !== -1) {
      allTrips[idx] = trip;
      await Store.saveTrips(allTrips);
    }
    renderBudgetOverview();
  }

  // Bind Search and Filter actions
  const searchInput = document.getElementById('expense-search');
  const categoryFilterSelect = document.getElementById('expense-filter-category');

  if (searchInput) {
    searchInput.addEventListener('input', () => {
      currentSearch = searchInput.value;
      renderBudgetOverview();
    });
  }

  if (categoryFilterSelect) {
    categoryFilterSelect.addEventListener('change', () => {
      currentCategoryFilter = categoryFilterSelect.value;
      renderBudgetOverview();
    });
  }

  // Form Submit Handler
  if (budgetForm) {
    budgetForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const description = document.getElementById('expense-desc').value.trim();
      const amount = parseFloat(document.getElementById('expense-amount').value) || 0;
      const category = document.getElementById('expense-category').value;
      const date = document.getElementById('expense-date').value;
      const status = document.getElementById('expense-status')?.value || 'Paid';

      if (!description || !amount || !date) {
        showToast('Please fill in description, amount, and date', 'error');
        return;
      }

      trip.expenses.push({
        description,
        amount,
        category,
        date,
        status
      });

      saveAndUpdate();
      budgetForm.reset();
      if (document.getElementById('expense-date')) {
        document.getElementById('expense-date').value = trip.startDate; // reset date default
      }
      if (document.getElementById('expense-status')) {
        document.getElementById('expense-status').value = 'Paid'; // reset status default
      }
      showToast(status === 'Pending' ? 'Pending bill logged!' : 'Expense logged successfully', 'success');
    });
  }

  // --- INVOICE VIEW & DOWNLOAD FUNCTIONALITY ---
  const invoiceModal = document.getElementById('invoice-modal');
  const viewInvoiceBtn = document.getElementById('view-invoice-btn');
  const downloadInvoiceBtn = document.getElementById('download-invoice-btn');
  const printInvoiceBtn = document.getElementById('print-invoice-btn');
  const closeInvoiceBtn = document.getElementById('close-invoice-btn');
  const invoiceCloseBtn = document.getElementById('invoice-close-btn');
  const invoiceBody = document.getElementById('invoice-body');

  function calculateCategorySplits() {
    const categories = ["Flights", "Lodging", "Food", "Transport", "Activities", "Shopping", "Other"];
    const splits = {};
    categories.forEach(cat => splits[cat] = 0);
    
    trip.expenses.filter(e => e.status !== 'Pending').forEach(e => {
      const cat = e.category || 'Other';
      const cleanCat = categories.includes(cat) ? cat : 'Other';
      splits[cleanCat] += parseFloat(e.amount) || 0;
    });
    return splits;
  }

  function renderInvoiceHTML() {
    const user = Store.getCurrentUser();
    const totalBudget = parseFloat(trip.budget) || 0;
    const spent = trip.expenses.filter(e => e.status !== 'Pending').reduce((sum, item) => sum + parseFloat(item.amount), 0);
    const remaining = totalBudget - spent;
    const catSplits = calculateCategorySplits();

    invoiceBody.innerHTML = `
      <div class="invoice-container" style="color: var(--text-primary); font-family: var(--font-body); padding: 0.5rem 0;">
        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom: 2px solid var(--glass-border); padding-bottom: 1.5rem; margin-bottom: 1.5rem;">
          <div>
            <h2 style="font-family:var(--font-title); font-size: 1.8rem; margin: 0; color:var(--text-primary); display:flex; align-items:center; gap:0.5rem;">
              <i class="fas fa-compass" style="color:var(--accent);"></i> Traveloop
            </h2>
            <p style="color:var(--text-secondary); font-size: 0.85rem; margin: 4px 0 0 0;">Your Personal Travel Expense Statement</p>
          </div>
          <div style="text-align:right;">
            <h3 style="margin:0; font-size:1.1rem; color:var(--text-primary);">INVOICE / STATEMENT</h3>
            <p style="margin:4px 0 0 0; font-family:var(--font-mono); font-size:0.8rem; color:var(--text-secondary);">#TL-${trip.id.split('-')[1] || '0000'}</p>
            <p style="margin:2px 0 0 0; font-family:var(--font-mono); font-size:0.8rem; color:var(--text-secondary);">Date: ${new Date().toLocaleDateString()}</p>
          </div>
        </div>

        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:1.5rem; margin-bottom: 1.5rem;">
          <div>
            <h5 style="color:var(--text-secondary); text-transform:uppercase; margin-bottom: 0.5rem; font-size:0.75rem; letter-spacing:0.05em; font-weight:700;">Prepared For</h5>
            <strong style="font-size:0.95rem; color:var(--text-primary);">${user?.name || 'Traveler'}</strong>
            <p style="color:var(--text-secondary); font-size:0.85rem; margin: 4px 0 0 0;">${user?.email || 'traveler@traveloop.com'}</p>
          </div>
          <div>
            <h5 style="color:var(--text-secondary); text-transform:uppercase; margin-bottom: 0.5rem; font-size:0.75rem; letter-spacing:0.05em; font-weight:700;">Trip Summary</h5>
            <strong style="font-size:0.95rem; color:var(--text-primary);">${trip.name}</strong>
            <p style="color:var(--text-secondary); font-size:0.85rem; margin: 4px 0 0 0;">Destination: ${trip.destination}</p>
            <p style="color:var(--text-secondary); font-size:0.85rem; margin: 2px 0 0 0;">Dates: ${trip.startDate} to ${trip.endDate}</p>
          </div>
        </div>

        <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin-bottom: 1.5rem;">
          <div style="background:rgba(0,0,0,0.02); border:1px solid var(--glass-border); padding: 0.75rem; border-radius:10px; text-align:center;">
            <span style="font-size:0.75rem; color:var(--text-secondary);">Budget Limit</span>
            <div style="font-size:1.15rem; font-weight:700; margin-top:0.25rem; font-family:var(--font-mono);">$${totalBudget.toLocaleString()}</div>
          </div>
          <div style="background:rgba(0,0,0,0.02); border:1px solid var(--glass-border); padding: 0.75rem; border-radius:10px; text-align:center;">
            <span style="font-size:0.75rem; color:var(--text-secondary);">Total Expensed</span>
            <div style="font-size:1.15rem; font-weight:700; margin-top:0.25rem; font-family:var(--font-mono); color:var(--text-primary);">$${spent.toLocaleString()}</div>
          </div>
          <div style="background:rgba(0,0,0,0.02); border:1px solid var(--glass-border); padding: 0.75rem; border-radius:10px; text-align:center;">
            <span style="font-size:0.75rem; color:var(--text-secondary);">Remaining Balance</span>
            <div style="font-size:1.15rem; font-weight:700; margin-top:0.25rem; font-family:var(--font-mono); color:${remaining < 0 ? 'var(--accent)' : 'var(--success)'};">$${remaining.toLocaleString()}</div>
          </div>
        </div>

        <h4 style="margin:1.5rem 0 0.5rem 0; font-size:1rem; font-family:var(--font-title);"><i class="fas fa-chart-pie" style="color:var(--accent); margin-right:5px;"></i> Category Split</h4>
        <table style="width:100%; border-collapse:collapse; margin-bottom: 1.5rem; font-size:0.85rem;">
          <thead>
            <tr style="border-bottom:1px solid var(--glass-border); color:var(--text-secondary); text-align:left;">
              <th style="padding: 0.5rem 0.25rem;">Category</th>
              <th style="padding: 0.5rem 0.25rem; text-align:right;">Amount Expensed</th>
              <th style="padding: 0.5rem 0.25rem; text-align:right;">Percentage</th>
            </tr>
          </thead>
          <tbody>
            ${Object.keys(catSplits).map(cat => {
              const amt = catSplits[cat];
              const pct = spent > 0 ? Math.round((amt / spent) * 100) : 0;
              return `
                <tr style="border-bottom:1px solid rgba(0,0,0,0.03);">
                  <td style="padding: 0.5rem 0.25rem; font-weight:500;">${cat}</td>
                  <td style="padding: 0.5rem 0.25rem; text-align:right; font-family:var(--font-mono); font-weight:600;">$${amt.toLocaleString()}</td>
                  <td style="padding: 0.5rem 0.25rem; text-align:right; font-family:var(--font-mono); color:var(--text-secondary);">${pct}%</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>

        <h4 style="margin:1.5rem 0 0.5rem 0; font-size:1rem; font-family:var(--font-title);"><i class="fas fa-list-ul" style="color:var(--accent); margin-right:5px;"></i> Itemized Logs</h4>
        <table style="width:100%; border-collapse:collapse; font-size:0.85rem;">
          <thead>
            <tr style="border-bottom:1px solid var(--glass-border); color:var(--text-secondary); text-align:left;">
              <th style="padding: 0.5rem 0.25rem;">Date</th>
              <th style="padding: 0.5rem 0.25rem;">Description</th>
              <th style="padding: 0.5rem 0.25rem;">Category</th>
              <th style="padding: 0.5rem 0.25rem; text-align:right;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${trip.expenses.filter(e => e.status !== 'Pending').length === 0 
              ? `<tr><td colspan="4" style="text-align:center; padding: 1.5rem; color:var(--text-secondary);">No paid expenses tracked.</td></tr>`
              : trip.expenses.filter(e => e.status !== 'Pending').map(e => `
                <tr style="border-bottom:1px solid rgba(0,0,0,0.03);">
                  <td style="padding: 0.5rem 0.25rem; font-family:var(--font-mono);">${e.date}</td>
                  <td style="padding: 0.5rem 0.25rem; font-weight:500;">${e.description}</td>
                  <td style="padding: 0.5rem 0.25rem; color:var(--text-secondary);">${e.category}</td>
                  <td style="padding: 0.5rem 0.25rem; text-align:right; font-family:var(--font-mono); font-weight:600;">$${parseFloat(e.amount).toLocaleString()}</td>
                </tr>
              `).join('')}
          </tbody>
        </table>
        
        <div style="margin-top:2rem; border-top: 1px solid var(--glass-border); padding-top: 1rem; text-align:center; font-size:0.8rem; color:var(--text-secondary);">
          Generated by <strong>Traveloop</strong>. Thank you for using our travel management suite!
        </div>
      </div>
    `;
  }

  function downloadPDF() {
    if (!window.jspdf || !window.jspdf.jsPDF) {
      showToast('PDF Library loading, please wait.', 'warning');
      return;
    }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'a4');
    const user = Store.getCurrentUser();

    const totalBudget = parseFloat(trip.budget) || 0;
    const spent = trip.expenses.filter(e => e.status !== 'Pending').reduce((sum, item) => sum + parseFloat(item.amount), 0);
    const remaining = totalBudget - spent;
    const catSplits = calculateCategorySplits();

    const primaryColor = [26, 26, 46];
    const secondaryColor = [90, 107, 130];
    const accentColor = [233, 69, 96];

    // Document title
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text('TRAVELOOP EXPENSE STATEMENT', 14, 20);

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    doc.text('Your Personal Travel Expense Statement & Log Summary', 14, 25);

    // Invoice Meta
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text(`STATEMENT ID: #TL-${trip.id.split('-')[1] || '0000'}`, 140, 20);
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 140, 25);

    // Separator line
    doc.setDrawColor(220, 224, 230);
    doc.setLineWidth(0.5);
    doc.line(14, 28, 196, 28);

    // User/Trip Metadata
    doc.setFont('Helvetica', 'bold');
    doc.text('PREPARED FOR:', 14, 38);
    doc.setFont('Helvetica', 'normal');
    doc.text(`Name: ${user?.name || 'Traveler'}`, 14, 43);
    doc.text(`Email: ${user?.email || 'traveler@traveloop.com'}`, 14, 48);

    doc.setFont('Helvetica', 'bold');
    doc.text('TRIP DETAILS:', 110, 38);
    doc.setFont('Helvetica', 'normal');
    doc.text(`Trip: ${trip.name}`, 110, 43);
    doc.text(`Destination: ${trip.destination}`, 110, 48);
    doc.text(`Dates: ${trip.startDate} to ${trip.endDate}`, 110, 53);

    doc.line(14, 57, 196, 57);

    // Financial breakdown summary
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text('FINANCIAL OVERVIEW', 14, 67);

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Total Budget Limit: $${totalBudget.toLocaleString()}`, 14, 74);
    doc.text(`Total Paid Expenses: $${spent.toLocaleString()}`, 80, 74);
    doc.text(`Remaining Balance: $${remaining.toLocaleString()}`, 140, 74);

    doc.line(14, 79, 196, 79);

    // Render Category Split Table
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('CATEGORY EXPENDITURE BREAKDOWN', 14, 89);
    
    doc.setFontSize(9);
    doc.text('Category', 14, 96);
    doc.text('Amount Expensed', 100, 96);
    doc.text('Percentage', 160, 96);
    doc.line(14, 98, 196, 98);

    let cy = 104;
    doc.setFont('Helvetica', 'normal');
    Object.keys(catSplits).forEach(cat => {
      const amt = catSplits[cat];
      const pct = spent > 0 ? Math.round((amt / spent) * 100) : 0;
      doc.text(cat, 14, cy);
      doc.text(`$${amt.toLocaleString()}`, 100, cy);
      doc.text(`${pct}%`, 160, cy);
      cy += 6;
    });

    doc.line(14, cy + 2, 196, cy + 2);

    // Render itemized expense log
    let y = cy + 12;
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('ITEMIZED PAID LOGS', 14, y);

    y += 7;
    doc.setFontSize(9);
    doc.text('Date', 14, y);
    doc.text('Description', 40, y);
    doc.text('Category', 110, y);
    doc.text('Amount', 170, y);
    doc.line(14, y + 2, 196, y + 2);
    
    y += 8;
    doc.setFont('Helvetica', 'normal');
    const paidExpenses = trip.expenses.filter(e => e.status !== 'Pending');

    if (paidExpenses.length === 0) {
      doc.text('No paid expenses logged.', 14, y);
    } else {
      paidExpenses.forEach(e => {
        if (y > 270) {
          doc.addPage();
          y = 20;
          doc.setFont('Helvetica', 'bold');
          doc.text('Date', 14, y);
          doc.text('Description', 40, y);
          doc.text('Category', 110, y);
          doc.text('Amount', 170, y);
          doc.line(14, y + 2, 196, y + 2);
          y += 8;
          doc.setFont('Helvetica', 'normal');
        }
        doc.text(e.date || '', 14, y);
        doc.text(e.description || '', 40, y);
        doc.text(e.category || '', 110, y);
        doc.text(`$${parseFloat(e.amount || 0).toLocaleString()}`, 170, y);
        y += 6;
      });
    }

    doc.setFont('Helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    doc.text('Generated via Traveloop Planner Dashboard.', 14, 287);
    doc.text('Page 1 of 1', 180, 287);

    doc.save(`Invoice_${trip.name.replace(/\s+/g, '_')}.pdf`);
    showToast('Invoice PDF downloaded successfully!', 'success');
  }

  function printInvoice() {
    const printContent = invoiceBody.innerHTML;
    const printWindow = window.open('', '_blank', 'height=600,width=800');
    printWindow.document.write('<html><head><title>Print Invoice - Traveloop</title>');
    printWindow.document.write('<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">');
    printWindow.document.write('<style>body { font-family: "Helvetica Neue", Helvetica, Arial, sans-serif; padding: 40px; color: #1a1a2e; background-color: #fff; } table { width: 100%; border-collapse: collapse; margin-bottom: 20px; } th, td { padding: 10px; border-bottom: 1px solid #ddd; text-align: left; } th { color: #5a6b82; font-weight: bold; } .invoice-container { max-width: 800px; margin: 0 auto; }</style>');
    printWindow.document.write('</head><body>');
    printWindow.document.write(printContent);
    printWindow.document.write('</body></html>');
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  }

  if (viewInvoiceBtn) {
    viewInvoiceBtn.addEventListener('click', () => {
      renderInvoiceHTML();
      invoiceModal.classList.add('active');
    });
  }

  const closeInvoice = () => {
    invoiceModal.classList.remove('active');
  };

  if (closeInvoiceBtn) closeInvoiceBtn.addEventListener('click', closeInvoice);
  if (invoiceCloseBtn) invoiceCloseBtn.addEventListener('click', closeInvoice);
  
  // Close modal when clicking outside content
  window.addEventListener('click', (e) => {
    if (e.target === invoiceModal) {
      closeInvoice();
    }
  });

  if (downloadInvoiceBtn) {
    downloadInvoiceBtn.addEventListener('click', downloadPDF);
  }

  if (printInvoiceBtn) {
    printInvoiceBtn.addEventListener('click', printInvoice);
  }

  renderBudgetOverview();
}

// 13. Packing Checklist (checklist.html)
async function initChecklistPage() {
  const urlParams = new URLSearchParams(window.location.search);
  let tripId = urlParams.get('tripId') || localStorage.getItem('traveloop_active_trip_id');
  const trips = await Store.getTrips();

  const trip = trips.find(t => t.id === tripId);
  if (!trip) return;

  localStorage.setItem('traveloop_active_trip_id', trip.id);

  // Update header text
  const tripTitle = document.getElementById('checklist-trip-title');
  if (tripTitle) tripTitle.textContent = `Packing Checklist: ${trip.name}`;

  const itemForm = document.getElementById('add-checklist-form');
  const checklistList = document.getElementById('checklist-items-list');

  function renderChecklist() {
    if (!trip.checklist) trip.checklist = [];

    const total = trip.checklist.length;
    const packed = trip.checklist.filter(item => item.packed).length;
    const pct = total > 0 ? Math.round((packed / total) * 100) : 0;

    // Update Progress Indicators
    const countLbl = document.getElementById('checklist-count-lbl');
    const pctLbl = document.getElementById('checklist-pct-lbl');
    const fillBar = document.getElementById('checklist-progress-bar-fill');

    if (countLbl) countLbl.textContent = `${packed} of ${total} items packed`;
    if (pctLbl) pctLbl.textContent = `${pct}%`;
    if (fillBar) fillBar.style.width = `${pct}%`;

    if (total === 0) {
      checklistList.innerHTML = `
        <div class="empty-state" style="padding: 2rem 0;">
          <i class="fas fa-luggage-cart empty-icon" style="font-size:2rem;"></i>
          <h5 class="empty-title">Checklist is empty</h5>
          <p class="empty-description" style="font-size:0.85rem;">Add clothing, electronics, documents, or accessories below to begin packing.</p>
        </div>
      `;
      return;
    }

    checklistList.innerHTML = trip.checklist.map((item, index) => `
      <div class="checklist-item ${item.packed ? 'packed' : ''}">
        <div class="checklist-left">
          <label class="checkbox-container">
            <input type="checkbox" class="toggle-pack-checkbox" data-index="${index}" ${item.packed ? 'checked' : ''}>
            <span class="checkmark"></span>
          </label>
          <span class="checklist-label">${item.name}</span>
          <span class="checklist-category-lbl">${item.category}</span>
        </div>
        <button class="btn btn-secondary delete-item-btn" data-index="${index}" style="width:auto; padding: 0.25rem 0.5rem; color:var(--accent); font-size:0.8rem; border-radius:4px; border:none; background:none;">
          <i class="fas fa-trash-alt"></i>
        </button>
      </div>
    `).join('');

    // Bind Pack toggles
    checklistList.querySelectorAll('.toggle-pack-checkbox').forEach(box => {
      box.addEventListener('change', () => {
        const idx = parseInt(box.getAttribute('data-index'));
        trip.checklist[idx].packed = box.checked;
        saveAndUpdate();
        if (box.checked) {
          showToast('Packed item!', 'success');
        }
      });
    });

    // Bind Delete item button clicks
    checklistList.querySelectorAll('.delete-item-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.getAttribute('data-index'));
        trip.checklist.splice(idx, 1);
        saveAndUpdate();
        showToast('Checklist item removed', 'success');
      });
    });
  }

  async function saveAndUpdate() {
    const allTrips = await Store.getTrips();
    const idx = allTrips.findIndex(t => t.id === trip.id);
    if (idx !== -1) {
      allTrips[idx] = trip;
      await Store.saveTrips(allTrips);
    }
    renderChecklist();
  }

  if (itemForm) {
    itemForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('checklist-item-name').value.trim();
      const category = document.getElementById('checklist-item-category').value;

      if (!name) {
        showToast('Please type an item name', 'error');
        return;
      }

      trip.checklist.push({
        name,
        category,
        packed: false
      });

      saveAndUpdate();
      itemForm.reset();
      showToast(`Added ${name} to packing checklist`, 'success');
    });
  }

  renderChecklist();
}

// 14. Trip Notes (notes.html)
async function initNotesPage() {
  const activeTripId = localStorage.getItem('traveloop_active_trip_id');
  const trips = await Store.getTrips();
  const selectedTrip = trips.find(t => t.id === activeTripId);
  if (!selectedTrip) return;

  const noteForm = document.getElementById('add-note-form');
  const notesGrid = document.getElementById('notes-grid');

  if (!notesGrid) return;

  // Render trips dropdown select options
  const tripSelect = document.getElementById('note-trip');
  if (tripSelect) {
    tripSelect.innerHTML = `<option value="${selectedTrip.id}">${selectedTrip.name}</option>`;
    tripSelect.disabled = true;
  }

  // Load editing helper reference
  const editModal = document.getElementById('edit-note-modal');
  const editForm = document.getElementById('edit-note-form');
  let noteIndexToEdit = null;
  let tripIdToEdit = null;

  function renderNotes() {
    let allNotes = [];

    if (selectedTrip.notes) {
      selectedTrip.notes.forEach((note, index) => {
        allNotes.push({
          tripId: selectedTrip.id,
          tripName: selectedTrip.name,
          noteIndex: index,
          ...note
        });
      });
    }

    if (allNotes.length === 0) {
      notesGrid.innerHTML = `
        <div class="span-12">
          <div class="empty-state">
            <i class="far fa-edit empty-icon"></i>
            <h4 class="empty-title">Journal is empty</h4>
            <p class="empty-description">Create your first diary note, memory, or travel log to capture the journey.</p>
          </div>
        </div>
      `;
      return;
    }

    // Sort notes newest first
    allNotes.sort((a, b) => b.timestamp - a.timestamp);

    notesGrid.innerHTML = allNotes.map(n => {
      const formattedDate = new Date(n.timestamp).toLocaleString();
      return `
        <div class="span-4 card" style="display:flex; flex-direction:column; gap:1rem; border:1px solid var(--glass-border); padding:1.25rem;">
          <div style="display:flex; justify-content:space-between; align-items:start;">
            <span class="checklist-category-lbl" style="font-size:0.75rem; text-transform:none;">${n.tripName}</span>
            <span style="font-family:var(--font-mono); font-size:0.75rem; color:var(--text-secondary);">${formattedDate}</span>
          </div>
          <div>
            <h4 style="margin-bottom:0.5rem; font-size:1.15rem;">${n.title}</h4>
            <p style="color:var(--text-secondary); font-size:0.9rem; line-height: 1.5; white-space: pre-wrap;">${n.content}</p>
          </div>
          <div style="display:flex; justify-content:flex-end; gap:0.5rem; border-top:1px solid rgba(255,255,255,0.05); padding-top:0.75rem;">
            <button class="btn btn-secondary edit-note-btn" data-trip="${n.tripId}" data-index="${n.noteIndex}" style="width:auto; padding:0.35rem 0.7rem; font-size:0.8rem;"><i class="fas fa-edit"></i> Edit</button>
            <button class="btn btn-secondary delete-note-btn" data-trip="${n.tripId}" data-index="${n.noteIndex}" style="width:auto; padding:0.35rem 0.7rem; font-size:0.8rem; color:var(--accent);"><i class="fas fa-trash-alt"></i> Delete</button>
          </div>
        </div>
      `;
    }).join('');

    // Delete notes handler
    notesGrid.querySelectorAll('.delete-note-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const tripId = btn.getAttribute('data-trip');
        const noteIdx = parseInt(btn.getAttribute('data-index'));

        const allTrips = await Store.getTrips();
        const tIndex = allTrips.findIndex(t => t.id === tripId);
        if (tIndex === -1) return;

        allTrips[tIndex].notes.splice(noteIdx, 1);
        await Store.saveTrips(allTrips);
        showToast('Note deleted', 'success');

        // Refresh page
        setTimeout(() => { window.location.reload(); }, 300);
      });
    });

    // Edit notes handler
    notesGrid.querySelectorAll('.edit-note-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        tripIdToEdit = btn.getAttribute('data-trip');
        noteIndexToEdit = parseInt(btn.getAttribute('data-index'));

        const targetTrip = trips.find(t => t.id === tripIdToEdit);
        const note = targetTrip.notes[noteIndexToEdit];

        document.getElementById('edit-note-title').value = note.title;
        document.getElementById('edit-note-content').value = note.content;

        editModal.classList.add('active');
      });
    });
  }

  // Add Note Form Submit
  if (noteForm) {
    noteForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const tripId = document.getElementById('note-trip').value;
      const title = document.getElementById('note-title').value.trim();
      const content = document.getElementById('note-content').value.trim();

      if (trips.length === 0) {
        showToast('Create a trip first to write travel notes', 'error');
        return;
      }

      if (!title || !content) {
        showToast('Please fill in note title and contents', 'error');
        return;
      }

      const allTrips = await Store.getTrips();
      const tIndex = allTrips.findIndex(t => t.id === tripId);
      if (tIndex === -1) return;

      if (!allTrips[tIndex].notes) allTrips[tIndex].notes = [];

      allTrips[tIndex].notes.push({
        title,
        content,
        timestamp: Date.now()
      });

      await Store.saveTrips(allTrips);
      noteForm.reset();
      showToast('Note saved in journal!', 'success');

      // Update UI
      setTimeout(() => { window.location.reload(); }, 300);
    });
  }

  // Edit Note Form Submit
  if (editForm) {
    editForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const title = document.getElementById('edit-note-title').value.trim();
      const content = document.getElementById('edit-note-content').value.trim();

      if (!title || !content) {
        showToast('Fields cannot be empty', 'error');
        return;
      }

      const allTrips = await Store.getTrips();
      const tIndex = allTrips.findIndex(t => t.id === tripIdToEdit);
      if (tIndex === -1) return;

      allTrips[tIndex].notes[noteIndexToEdit] = {
        title,
        content,
        timestamp: Date.now() // update timestamp on edit
      };

      await Store.saveTrips(allTrips);
      editModal.classList.remove('active');
      showToast('Note updated', 'success');

      setTimeout(() => { window.location.reload(); }, 300);
    });
  }

  // Close Modals
  document.querySelectorAll('.modal-close, .modal-cancel').forEach(btn => {
    btn.addEventListener('click', () => {
      editModal.classList.remove('active');
    });
  });

  renderNotes();
}

// 15. Shared Itinerary (shared.html)
async function initSharedPage() {
  const urlParams = new URLSearchParams(window.location.search);
  const tripId = urlParams.get('tripId');
  const trips = await Store.getTrips();

  const detailsContainer = document.getElementById('shared-trip-details');
  if (!detailsContainer) return;

  const trip = trips.find(t => t.id === tripId);
  if (!trip) {
    detailsContainer.innerHTML = `
      <div class="empty-state" style="padding: 4rem 1rem;">
        <i class="fas fa-lock empty-icon" style="font-size:3rem; color:var(--accent);"></i>
        <h3 class="empty-title">Shared Link Invalid</h3>
        <p class="empty-description">This itinerary key does not match any active trip in local storage records.</p>
        <a href="index.html" class="btn btn-primary" style="width:auto;">Go Home</a>
      </div>
    `;
    return;
  }

  // Load read only overview
  let itineraryHTML = "";
  if (!trip.itinerary || trip.itinerary.length === 0) {
    itineraryHTML = `<p style="text-align:center; color:var(--text-secondary); padding: 1.5rem 0;">No timeline activities added to this itinerary yet.</p>`;
  } else {
    // Sort
    trip.itinerary.sort((a, b) => new Date(a.date) - new Date(b.date));
    itineraryHTML = `
      <div class="timeline" style="margin-top: 1rem;">
        ${trip.itinerary.map(stop => `
          <div class="timeline-item">
            <div class="timeline-dot" style="border-color:var(--success); box-shadow: 0 0 10px rgba(22, 199, 154, 0.4);"><i class="fas fa-check" style="color:var(--success); font-size:0.7rem;"></i></div>
            <div class="timeline-content">
              <div style="flex:1;">
                <span class="category-badge cat-${stop.category.toLowerCase()}">${stop.category}</span>
                <h4 style="margin-top: 0.5rem;">${stop.activity}</h4>
                <p style="font-size:0.9rem; margin-top:0.25rem;"><i class="fas fa-map-marker-alt" style="color:var(--accent); font-size:0.8rem; margin-right:5px;"></i>${stop.city}</p>
                <div class="timeline-meta">
                  <span><i class="far fa-calendar-alt"></i> ${stop.date}</span>
                  ${stop.duration ? `<span><i class="far fa-clock"></i> ${stop.duration} hrs</span>` : ''}
                </div>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  let budgetHTML = "";
  if (!trip.expenses || trip.expenses.length === 0) {
    budgetHTML = `<p style="font-size:0.9rem; color:var(--text-secondary);">No budget tracking items shared.</p>`;
  } else {
    const totalBudget = parseFloat(trip.budget) || 0;
    const spent = trip.expenses.reduce((sum, item) => sum + parseFloat(item.amount), 0);
    const pct = totalBudget > 0 ? Math.min(Math.round((spent / totalBudget) * 100), 100) : 0;

    budgetHTML = `
      <div style="display:flex; flex-direction:column; gap: 1rem;">
        <div style="display:flex; justify-content:space-between; font-size:0.9rem;">
          <span>Budget Spent Overview</span>
          <span style="font-weight:700;">$${spent.toLocaleString()} / $${totalBudget.toLocaleString()}</span>
        </div>
        <div class="progress-bar-bg" style="height:6px;">
          <div class="progress-bar-fill" style="width:${pct}%; background:${pct > 90 ? 'var(--accent)' : 'var(--success)'}"></div>
        </div>
      </div>
    `;
  }

  detailsContainer.innerHTML = `
    <div style="border-bottom: 1px solid var(--glass-border); padding-bottom: 1.5rem; margin-bottom: 1.5rem;">
      <span class="category-badge" style="background:rgba(233,69,96,0.1); color:var(--accent); border:1px solid var(--accent);">READ-ONLY ACCESS</span>
      <h2 style="font-size:2rem; margin-top:0.5rem; margin-bottom:0.25rem;">${trip.name}</h2>
      <p style="color:var(--text-secondary); font-size:0.95rem;">
        <i class="fas fa-plane-departure" style="color:var(--accent); margin-right:5px;"></i>Destination: <strong>${trip.destination}</strong> &nbsp;|&nbsp; 
        <i class="far fa-calendar-alt" style="color:var(--accent); margin-right:5px; margin-left:10px;"></i>Dates: <strong>${trip.startDate} to ${trip.endDate}</strong>
      </p>
      ${trip.description ? `<p style="margin-top: 1rem; font-size:0.9rem; line-height:1.5; color:var(--text-secondary);">${trip.description}</p>` : ''}
    </div>
    
    <div class="dashboard-grid">
      <div class="span-8 card">
        <h3 style="margin-bottom:1rem;"><i class="fas fa-route"></i> Travel Itinerary Map</h3>
        ${itineraryHTML}
      </div>
      <div class="span-4 card" style="display:flex; flex-direction:column; gap:1.5rem;">
        <div>
          <h3 style="margin-bottom:1rem;"><i class="fas fa-wallet"></i> Estimated Budget</h3>
          ${budgetHTML}
        </div>
        
        <div style="border-top: 1px solid rgba(255,255,255,0.05); padding-top:1.5rem;">
          <h3 style="margin-bottom:1rem;"><i class="fas fa-user-friends"></i> Travelers</h3>
          <div style="font-size:0.95rem; font-weight:700;"><i class="fas fa-users" style="color:var(--accent); margin-right:8px;"></i> ${trip.travelers} Traveler${trip.travelers > 1 ? 's' : ''}</div>
        </div>
      </div>
    </div>
  `;

  // Copy shareable link button
  const copyBtn = document.getElementById('copy-share-link');
  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      const shareUrl = window.location.href;
      navigator.clipboard.writeText(shareUrl).then(() => {
        showToast('Link copied to clipboard!', 'success');
      }).catch(err => {
        showToast('Failed to copy link', 'error');
      });
    });
  }

  // Social sharing handlers
  const shareTw = document.getElementById('share-tw');
  const shareWa = document.getElementById('share-wa');

  if (shareTw) {
    shareTw.addEventListener('click', (e) => {
      e.preventDefault();
      const text = encodeURIComponent(`Check out my travel plan for ${trip.destination} on Traveloop!`);
      const url = encodeURIComponent(window.location.href);
      window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank');
    });
  }

  if (shareWa) {
    shareWa.addEventListener('click', (e) => {
      e.preventDefault();
      const text = encodeURIComponent(`Check out my travel plan for ${trip.destination} on Traveloop! ${window.location.href}`);
      window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
    });
  }
}

// 16a. Profile Page (profile.html)
function initProfilePage() {
  const user = Store.getCurrentUser();
  const profileForm = document.getElementById('profile-settings-form');

  if (!user) return;

  // Set inputs
  const nameInput = document.getElementById('profile-fullname');
  const emailInput = document.getElementById('profile-email');

  if (nameInput) nameInput.value = user.name;
  if (emailInput) emailInput.value = user.email;

  // Load avatar selection highlight
  const avatarItems = document.querySelectorAll('.avatar-select-item');
  let selectedAvatar = user.avatar || 'avatar1.png';

  avatarItems.forEach(item => {
    const filename = item.getAttribute('data-filename');
    if (filename === selectedAvatar) {
      item.style.borderColor = 'var(--accent)';
      item.style.background = 'rgba(233, 69, 96, 0.1)';
    }

    item.addEventListener('click', () => {
      avatarItems.forEach(i => {
        i.style.borderColor = 'var(--glass-border)';
        i.style.background = 'none';
      });
      item.style.borderColor = 'var(--accent)';
      item.style.background = 'rgba(233, 69, 96, 0.1)';
      selectedAvatar = filename;
    });
  });

  if (profileForm) {
    profileForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fullName = nameInput.value.trim();
      const email = emailInput.value.trim();
      const newPass = document.getElementById('profile-new-password').value;

      if (!fullName || !email) {
        showToast('Name and email cannot be empty', 'error');
        return;
      }

      if (newPass && newPass.length < 6) {
        showToast('New password must be at least 6 characters', 'error');
        return;
      }

      try {
        const bodyData = {
          name: fullName,
          username: user.username,
          bio: user.bio,
          phone: user.phone,
          dob: user.dob,
          homecity: user.homecity,
          website: user.website,
          avatar: selectedAvatar
        };

        if (newPass) {
          bodyData.password = newPass;
        }

        const res = await fetch(`${API_BASE}/profile`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${Store.getToken()}`
          },
          body: JSON.stringify(bodyData)
        });

        const data = await res.json();
        if (!res.ok) {
          showToast(data.message || 'Failed to update profile settings', 'error');
          return;
        }

        Store.setCurrentUser(data.user);
        showToast('Profile settings saved successfully!', 'success');

        // Update sidebar headers
        setTimeout(() => { window.location.reload(); }, 800);
      } catch (err) {
        console.error(err);
        showToast('Error updating profile settings', 'error');
      }
    });
  }

  // Saved Destinations List (Awaiting API data store, empty initially)
  const savedList = document.getElementById('saved-destinations-list');
  if (savedList) {
    savedList.innerHTML = `
      <div class="empty-state" style="padding: 1.5rem 0;">
        <i class="far fa-bookmark empty-icon" style="font-size:2rem;"></i>
        <h5 class="empty-title" style="font-size:0.95rem;">No saved places</h5>
        <p class="empty-description" style="font-size:0.8rem; margin-bottom: 0;">Click save icons inside Search or Activities feeds to bookmark future destinations.</p>
      </div>
    `;
  }
}

// 16b. Admin Panel Page (admin.html)
async function initAdminPage() {
  const token = Store.getToken();
  const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

  try {
    // 1. Fetch Users
    const usersRes = await fetch(`${API_BASE}/admin/users`, { headers });
    const users = await usersRes.json();
    
    // 2. Fetch Analytics
    const analyticsRes = await fetch(`${API_BASE}/admin/analytics`, { headers });
    const analytics = await analyticsRes.json();

    // 3. Fetch Announcements
    const announcementsRes = await fetch(`${API_BASE}/admin/announcements`, { headers });
    const announcements = await announcementsRes.json();

    // 4. Fetch Logs
    const logsRes = await fetch(`${API_BASE}/admin/logs`, { headers });
    const logs = await logsRes.json();

    // Populate Analytics Overview
    document.getElementById('admin-total-users').textContent = users.length || 0;
    document.getElementById('admin-live-sessions').textContent = analytics.activeSessions || 0;
    document.getElementById('admin-total-trips').textContent = analytics.featureUsage.tripsPlanned || 0;

    // Populate Top Destinations
    const topDestList = document.getElementById('admin-top-destinations');
    if (analytics.topDestinations && analytics.topDestinations.length > 0) {
      topDestList.innerHTML = analytics.topDestinations.map(d => `
        <li style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.02); padding:0.75rem 1rem; border-radius:8px;">
          <span>${d.city}</span>
          <span style="font-weight:bold; color:var(--accent);">${d.count} Trips</span>
        </li>
      `).join('');
    } else {
      topDestList.innerHTML = '<li>No destination data available.</li>';
    }

    // Populate Feature Usage
    const featList = document.getElementById('admin-feature-usage');
    if (analytics.featureUsage) {
      featList.innerHTML = `
        <li style="display:flex; justify-content:space-between; padding:0.5rem 0; border-bottom:1px solid rgba(255,255,255,0.05);">
          <span>Trips Planned</span><span>${analytics.featureUsage.tripsPlanned}</span>
        </li>
        <li style="display:flex; justify-content:space-between; padding:0.5rem 0; border-bottom:1px solid rgba(255,255,255,0.05);">
          <span>Itinerary Items</span><span>${analytics.featureUsage.itineraryItemsAdded}</span>
        </li>
        <li style="display:flex; justify-content:space-between; padding:0.5rem 0; border-bottom:1px solid rgba(255,255,255,0.05);">
          <span>Expenses Tracked</span><span>${analytics.featureUsage.expensesTracked}</span>
        </li>
        <li style="display:flex; justify-content:space-between; padding:0.5rem 0;">
          <span>Packing Items</span><span>${analytics.featureUsage.packingItemsAdded}</span>
        </li>
      `;
    }

    // Populate Users Table
    const tableBody = document.getElementById('admin-users-table-body');
    tableBody.innerHTML = users.map(u => `
      <tr>
        <td>#${u.id}</td>
        <td style="font-weight:600;">${u.name}</td>
        <td>${u.email}</td>
        <td>
          <span class="category-badge" style="background:${u.role === 'admin' ? 'rgba(233,69,96,0.1)' : 'rgba(22, 199, 154, 0.1)'}; color:${u.role === 'admin' ? 'var(--accent)' : 'var(--success)'}; border:1px solid ${u.role === 'admin' ? 'var(--accent)' : 'var(--success)'};">${u.role.toUpperCase()}</span>
        </td>
        <td>
          <span class="category-badge" style="background:${u.status === 'active' ? 'rgba(22, 199, 154, 0.1)' : 'rgba(255, 152, 0, 0.1)'}; color:${u.status === 'active' ? 'var(--success)' : 'var(--warning)'}; border:1px solid ${u.status === 'active' ? 'var(--success)' : 'var(--warning)'};">${u.status.toUpperCase()}</span>
        </td>
        <td>
          ${u.role !== 'admin' ? `
            <button class="btn btn-secondary btn-sm admin-suspend-btn" data-id="${u.id}" data-status="${u.status}">${u.status === 'active' ? 'Suspend' : 'Activate'}</button>
            <button class="btn btn-primary btn-sm admin-delete-btn" data-id="${u.id}"><i class="fas fa-trash"></i></button>
          ` : '<span style="color:var(--text-secondary); font-size:0.8rem;">Cannot modify admin</span>'}
        </td>
      </tr>
    `).join('');

    // Attach User Actions
    document.querySelectorAll('.admin-suspend-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.target.getAttribute('data-id');
        const currentStatus = e.target.getAttribute('data-status');
        const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
        if (confirm(`Are you sure you want to ${currentStatus === 'active' ? 'suspend' : 'activate'} this user?`)) {
          const res = await fetch(`${API_BASE}/admin/users/${id}/status`, {
            method: 'PUT', headers, body: JSON.stringify({ status: newStatus })
          });
          if (res.ok) {
            showToast('User status updated', 'success');
            setTimeout(() => window.location.reload(), 1000);
          } else {
            showToast('Failed to update status', 'error');
          }
        }
      });
    });

    document.querySelectorAll('.admin-delete-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        if (confirm('Are you sure you want to permanently delete this user? This action cannot be undone.')) {
          const res = await fetch(`${API_BASE}/admin/users/${id}`, { method: 'DELETE', headers });
          if (res.ok) {
            showToast('User deleted permanently', 'success');
            setTimeout(() => window.location.reload(), 1000);
          } else {
            showToast('Failed to delete user', 'error');
          }
        }
      });
    });

    // Populate Announcements
    const announcementForm = document.getElementById('admin-announcement-form');
    const annList = document.getElementById('admin-announcements-list');
    
    annList.innerHTML = announcements.length === 0 ? '<p style="color:var(--text-secondary); font-size:0.9rem;">No active announcements.</p>' :
      announcements.map(a => `
        <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.02); padding:0.75rem 1rem; border-radius:8px; border-left: 3px solid ${a.type === 'warning' ? 'var(--warning)' : a.type === 'success' ? 'var(--success)' : 'var(--info)'}">
          <div>
            <span style="font-weight:bold; margin-right: 10px;">${a.type.toUpperCase()}</span>
            <span>${a.message}</span>
          </div>
          <button class="btn btn-secondary btn-sm admin-delete-ann-btn" data-id="${a.id}"><i class="fas fa-times"></i></button>
        </div>
      `).join('');

    document.querySelectorAll('.admin-delete-ann-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        if (confirm('Remove this announcement?')) {
          await fetch(`${API_BASE}/admin/announcements/${id}`, { method: 'DELETE', headers });
          window.location.reload();
        }
      });
    });

    announcementForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const message = document.getElementById('admin-announcement-msg').value;
      const type = document.getElementById('admin-announcement-type').value;
      const res = await fetch(`${API_BASE}/admin/announcements`, {
        method: 'POST', headers, body: JSON.stringify({ message, type })
      });
      if (res.ok) {
        showToast('Announcement broadcasted!', 'success');
        setTimeout(() => window.location.reload(), 1000);
      }
    });

    // Populate Error Logs
    const logContainer = document.getElementById('admin-error-logs');
    if (logs.length === 0) {
      logContainer.innerHTML = 'System operating normally. No recent errors.';
    } else {
      logContainer.innerHTML = logs.map(l => `
        <div style="margin-bottom: 0.5rem; border-bottom: 1px solid #333; padding-bottom: 0.5rem;">
          <span style="color:#888;">[${new Date(l.timestamp).toLocaleString()}]</span> 
          <span style="color:var(--accent); font-weight:bold;">${l.endpoint}</span> - ${l.message}
        </div>
      `).join('');
    }

    // Backup Button
    document.getElementById('admin-backup-btn').addEventListener('click', async () => {
      showToast('Generating backup...', 'info');
      const res = await fetch(`${API_BASE}/admin/backup`, { headers });
      if (res.ok) {
        const data = await res.json();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `traveloop_backup_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        showToast('Backup downloaded successfully', 'success');
      } else {
        showToast('Backup failed', 'error');
      }
    });

  } catch (err) {
    console.error('Error fetching admin data:', err);
    showToast('Failed to load admin dashboard data', 'error');
  }
}


// --- MAIN ROUTER INITIALIZATION ---

document.addEventListener('DOMContentLoaded', async () => {
  // 1. Run Authentication Guards
  initAuthGuard();

  // 2. Setup sidebar layout logic
  initSidebarNav();

  // 2.5. Run Global Trip Selector check and UI injection
  await initGlobalTripSelection();

  // 3. Match and execute page-specific initializers
  const page = getPageName();

  switch (page) {
    case 'index.html':
      initLandingPage();
      break;
    case 'signup.html':
      initSignupPage();
      break;
    case 'login.html':
      initLoginPage();
      break;
    case 'dashboard.html':
      await initDashboardPage();
      break;
    case 'create-trip.html':
      initCreateTripPage();
      break;
    case 'trips.html':
      await initTripsPage();
      break;
    case 'itinerary.html':
      await initItineraryPage();
      break;
    case 'activities.html':
      await initActivitiesPage();
      break;
    case 'weather.html':
      await initWeatherPage();
      break;
    case 'budget.html':
      await initBudgetPage();
      break;
    case 'checklist.html':
      await initChecklistPage();
      break;
    case 'notes.html':
      await initNotesPage();
      break;
    case 'shared.html':
      await initSharedPage();
      break;
    case 'profile.html':
      initProfilePage();
      break;
    case 'admin.html':
      await initAdminPage();
      break;
  }
});

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
