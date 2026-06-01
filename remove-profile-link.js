const fs = require('fs');
const path = require('path');

const frontendDir = path.join(__dirname, 'frontend');

function processDirectory(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      processDirectory(filePath);
    } else if (file.endsWith('.html')) {
      let content = fs.readFileSync(filePath, 'utf8');
      
      // Remove sidebar link
      const newContent = content.replace(/<li class="sidebar-item">\s*<a href="profile\.html">\s*<i class="fas fa-user-cog"><\/i>\s*Profile Settings\s*<\/a>\s*<\/li>/g, '');
      
      // Also remove mobile nav link if present
      const newContent2 = newContent.replace(/<a href="profile\.html" class="mobile-nav-item">\s*<i class="fas fa-user-cog"><\/i>\s*<span>Profile<\/span>\s*<\/a>/g, '');
      
      if (content !== newContent2) {
        fs.writeFileSync(filePath, newContent2, 'utf8');
        console.log(`Updated ${file}`);
      }
    }
  }
}

processDirectory(frontendDir);
console.log('Finished removing Profile Settings links.');
