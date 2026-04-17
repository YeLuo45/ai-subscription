try {
  const m = require('./node_modules/@swc/core-win32-x64-msvc')
  console.log('Native loaded OK:', typeof m)
} catch(e) {
  console.error('Failed:', e.message)
}
