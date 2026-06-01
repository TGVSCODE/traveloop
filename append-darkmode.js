const fs = require('fs');

const styleCssPath = 'e:/Traveloop-2/frontend/style.css';
const profileCssPath = 'e:/Traveloop-2/frontend/css/profile.css';
const scriptJsPath = 'e:/Traveloop-2/frontend/script.js';
const profileJsPath = 'e:/Traveloop-2/frontend/js/profile.js';

const styleCssContent = `
/* Dark Mode Toggle */
.dark-mode-toggle {
  position: absolute;
  top: 1rem;
  right: 1rem;
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  color: var(--text-primary);
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 1000;
  transition: all var(--transition-speed) ease;
}
.dark-mode-toggle:hover {
  background: var(--glass-hover);
}

/* Dark Mode Global Variables */
body.dark-mode {
  --bg-primary: #121212;
  --bg-secondary: #1e1e1e;
  --glass-bg: rgba(30, 30, 30, 0.75);
  --glass-border: rgba(255, 255, 255, 0.1);
  --glass-hover: rgba(255, 255, 255, 0.05);
  --glass-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.5);
  --text-primary: #f4f6fa;
  --text-secondary: #a0aec0;
  --card-white: #1e1e1e;
  background-color: var(--bg-primary);
  background-image: 
    radial-gradient(at 10% 20%, rgba(233, 69, 96, 0.1) 0px, transparent 50%),
    radial-gradient(at 90% 80%, rgba(22, 199, 154, 0.1) 0px, transparent 50%);
}

body.dark-mode.landing-body, body.dark-mode.auth-wrapper {
  background: radial-gradient(circle at center, #1e1e1e 0%, #121212 100%);
}
`;

const profileCssContent = `
/* Dark Mode Overrides for Profile */
body.dark-mode {
  --bg-page: #121212;
  --bg-surface: #1a1a1a;
  --bg-sidebar: #1e1e1e;
  --bg-card: #1e1e1e;
  --bg-input: #2a2a2a;
  --text-primary: #f4f6fa;
  --text-secondary: #a0aec0;
  --text-hint: #6b7280;
  --border: rgba(255, 255, 255, 0.1);
  --border-light: rgba(255, 255, 255, 0.05);
}
`;

const jsContent = `
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
`;

fs.appendFileSync(styleCssPath, styleCssContent);
fs.appendFileSync(profileCssPath, profileCssContent);
fs.appendFileSync(scriptJsPath, jsContent);
fs.appendFileSync(profileJsPath, jsContent);
console.log('Appended dark mode styles and scripts successfully.');
