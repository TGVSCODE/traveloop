const fs = require('fs');
const file = 'c:/Users/Asus/Downloads/frontend_1-zip (5)/Traveloop-1/frontend/pages/12-profile.html';
let content = fs.readFileSync(file, 'utf8');

// Remove sidebar nav items for preferences and notifications
content = content.replace(/<div class="sidebar-nav-item" onclick="switchSection\('preferences-section'\)">[\s\S]*?<div class="sidebar-nav-group-title">Security<\/div>/, '<div class="sidebar-nav-group-title">Security</div>');

// Remove 2FA, Active Sessions from sidebar
content = content.replace(/<div class="sidebar-nav-item" onclick="switchSection\('two-factor-section'\)">[\s\S]*?<div class="sidebar-nav-item danger-item" onclick="switchSection\('danger-zone-section'\)">/, '<div class="sidebar-nav-item danger-item" onclick="switchSection(\'danger-zone-section\')">');

// Remove Preferences and Notifications sections
content = content.replace(/<!-- SECTION 2: PREFERENCES -->[\s\S]*?<!-- SECTION 4: PASSWORD -->/, '<!-- SECTION 4: PASSWORD -->');

// Remove Two-Factor Auth to Export Data sections
content = content.replace(/<!-- SECTION 5: TWO-FACTOR AUTH -->[\s\S]*?<!-- DANGER ZONE -->/, '<!-- DANGER ZONE -->');

// Remove Modals 2 and 3
content = content.replace(/<!-- Modal 2 — Revoke All Sessions Confirmation -->[\s\S]*?<!-- Javascript File -->/, '<!-- Javascript File -->');

fs.writeFileSync(file, content);
console.log("Profile page simplified successfully.");
