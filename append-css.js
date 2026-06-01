const fs = require('fs');

const cssToAppend = `
/* Password Rules Box (Signup & Profile) */
.password-rules-box {
  background-color: #F9FAFB;
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-sm);
  padding: 0.75rem 1rem;
  margin-top: 0.75rem;
}

body.dark-mode .password-rules-box {
  background-color: var(--glass-bg);
}

.password-rules-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.4rem;
}

.password-rule-item {
  font-size: 11px;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.password-rule-item.met {
  color: var(--success);
  font-weight: 500;
}

.password-rule-item.met i {
  color: var(--success);
}
`;

fs.appendFileSync('e:/Traveloop-2/frontend/style.css', cssToAppend);
console.log('Appended CSS to style.css');
