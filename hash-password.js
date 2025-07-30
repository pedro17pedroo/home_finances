import bcryptjs from 'bcryptjs';

const password = 'admin123';
const hash = await bcryptjs.hash(password, 10);
console.log(hash);
