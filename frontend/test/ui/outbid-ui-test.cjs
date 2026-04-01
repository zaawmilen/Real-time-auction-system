const puppeteer = require('puppeteer');
const axios = require('axios');
const { io } = require('socket.io-client');

const BASE = process.env.BASE || 'http://localhost:3001';
const FRONTEND = process.env.FRONTEND || 'http://localhost:5174';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

(async () => {
  try {
    // Create two users via API
    const aEmail = `pupp_a_${Date.now()}@example.com`;
    const bEmail = `pupp_b_${Date.now()}@example.com`;

    const regA = await axios.post(`${BASE}/api/auth/register`, {
      email: aEmail, password: 'Password1A', firstName: 'Alice', lastName: 'P'
    });
    const tokenA = regA.data.tokens.accessToken;
    const refreshA = regA.data.tokens.refreshToken;

    const regB = await axios.post(`${BASE}/api/auth/register`, {
      email: bEmail, password: 'Password1B', firstName: 'Bob', lastName: 'Q'
    });
    const tokenB = regB.data.tokens.accessToken;
    const refreshB = regB.data.tokens.refreshToken;

    // Ensure an auction with active lot
    const auctionsRes = await axios.get(`${BASE}/api/auctions`);
    let auction = (auctionsRes.data.data || []).find(a => a.status !== 'completed');
    if (!auction) {
      const adminLogin = await axios.post(`${BASE}/api/auth/login`, { email: 'admin@copart-sim.com', password: 'Admin@1234' });
      const adminToken = adminLogin.data.tokens.accessToken;
      const create = await axios.post(`${BASE}/api/auctions`, { title: `Pupp Test ${Date.now()}`, auctionDate: new Date(Date.now()+60000).toISOString() }, { headers: { Authorization: `Bearer ${adminToken}` } });
      auction = create.data;
    }
    const auctionId = auction.id;

    // Ensure at least one lot exists
    const det = await axios.get(`${BASE}/api/auctions/${auctionId}`);
    if (!det.data.lots || det.data.lots.length === 0) {
      const adminLogin = await axios.post(`${BASE}/api/auth/login`, { email: 'admin@copart-sim.com', password: 'Admin@1234' });
      const adminToken = adminLogin.data.tokens.accessToken;
      const vehicles = await axios.get(`${BASE}/api/vehicles`);
      if (!vehicles.data.data || vehicles.data.data.length === 0) throw new Error('No vehicles to create lot');
      await axios.post(`${BASE}/api/auctions/${auctionId}/lots`, { vehicleId: vehicles.data.data[0].id }, { headers: { Authorization: `Bearer ${adminToken}` } });
    }

    // Start auction
    const adminLogin2 = await axios.post(`${BASE}/api/auth/login`, { email: 'admin@copart-sim.com', password: 'Admin@1234' });
    const adminToken2 = adminLogin2.data.tokens.accessToken;
    try { await axios.post(`${BASE}/api/auctions/${auctionId}/start`, {}, { headers: { Authorization: `Bearer ${adminToken2}` } }); } catch (e) { /* ignore if started */ }
    await sleep(500);

    // Refresh auction details and get active lot
    const details = await axios.get(`${BASE}/api/auctions/${auctionId}`);
    const activeLot = details.data.lots.find(l => l.status === 'active');
    if (!activeLot) throw new Error('No active lot');
    const lotId = activeLot.id;

    // Launch puppeteer and open page for user A
    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
    const pageA = await browser.newPage();
    pageA.on('console', msg => console.log('[PAGE]', msg.text()));

    // Set tokens in localStorage then navigate to auction room
    await pageA.goto(FRONTEND);
    await pageA.evaluate((tA, rA) => {
      localStorage.setItem('accessToken', tA);
      localStorage.setItem('refreshToken', rA);
    }, tokenA, refreshA);
    await pageA.goto(`${FRONTEND}/auctions/${auctionId}`, { waitUntil: 'networkidle2' });

    // Wait a moment for websocket connect and join
    await sleep(1500);

    // Have page A place an initial bid using an in-page socket.io client
    await pageA.evaluate(async (tA, lotId) => {
      // load socket.io client from CDN
      if (!window.io) {
        await new Promise((res) => {
          const s = document.createElement('script');
          s.src = 'https://cdn.socket.io/4.6.1/socket.io.min.js';
          s.onload = res; document.head.appendChild(s);
        });
      }
      const sock = window.io('http://localhost:3001', { auth: { token: tA }, transports: ['websocket'] });
      await new Promise((res) => sock.on('connect', res));
      // place an initial bid slightly above current
      sock.emit('place_bid', { lotId, amount: 600 });
    }, tokenA, lotId);

    // wait a bit for initial bid to process
    await sleep(1000);

    // Listen for toast text in DOM
    const toastPromise = new Promise((resolve, reject) => {
      let resolved = false;
      const timeout = setTimeout(() => { if (!resolved) { resolved = true; reject(new Error('Timeout waiting for toast')); } }, 8000);

      (async () => {
        while (!resolved) {
          const html = await pageA.content();
          if (html.includes('Outbid') || html.includes('You were outbid')) {
            resolved = true; clearTimeout(timeout); resolve(true); break;
          }
          await new Promise(r => setTimeout(r, 200));
        }
      })();
    });

    // From Node, create a socket client using tokenB and emit place_bid to outbid A
    const ws = io('http://localhost:3001', { auth: { token: tokenB }, transports: ['websocket'] });
    ws.on('connect', async () => {
      // emit place_bid to lot
      ws.emit('place_bid', { lotId, amount: (parseFloat(activeLot.current_bid || 0) || 0) + 100 });
    });

    // Wait for toast
    try {
      // Wait for B to emit and for UI to update
      await new Promise(r => setTimeout(r, 2000));
      const htmlAfter = await pageA.content();
      console.log('PAGE HTML SNIPPET:\n', htmlAfter.slice(0, 4000));
      await toastPromise;
      console.log('UI toast detected — test passed');
      await browser.close();
      process.exit(0);
    } catch (err) {
      console.error('Toast not found', err.message);
      // Dump HTML for debugging
      try {
        const htmlAfter = await pageA.content();
        console.error('PAGE HTML DUMP:\n', htmlAfter.slice(0, 8000));
      } catch (e) {}
      await browser.close();
      process.exit(2);
    }

  } catch (err) {
    console.error('Test error', err.response?.data || err.message || err);
    process.exit(1);
  }
})();
