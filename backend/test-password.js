// test-password.js
const bcrypt = require('bcryptjs');

const hash = '$2b$10$WWDx0T/3qVvTEUetwy8ICOo7Jwrd8bETt4sLTYAR0I0iyC1bbpVjy';
const password = 'UniClub123';

bcrypt.compare(password, hash, (err, result) => {
  console.log('Match:', result); // should print: Match: true
  process.exit(0);
});