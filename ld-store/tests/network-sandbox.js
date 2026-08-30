import net from 'node:net'

if (process.env.NODE_ENV === 'production') throw new Error('Tests must not use production')
// Frontend unit tests use mocks only, including localhost: no real API calls.
net.Socket.prototype.connect = function () { throw new Error('Network disabled in frontend tests') }
globalThis.fetch = async function () { throw new Error('Fetch disabled in frontend tests; use an explicit mock') }
