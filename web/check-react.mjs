console.log('NODE_ENV:', process.env.NODE_ENV);
import('react').then(m => {
  console.log('version:', m.version);
  console.log('act in m:', 'act' in m);
  console.log('typeof act:', typeof m.act);
  console.log('act descriptor:', JSON.stringify(Object.getOwnPropertyDescriptor(m, 'act')));
})