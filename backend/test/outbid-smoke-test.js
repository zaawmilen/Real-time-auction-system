const axios = require('axios');
const { io } = require('socket.io-client');

const BASE = 'http://localhost:3001';

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function main() {
  try {
    console.log('1) Login admin');
    const adminLogin = await axios.post(`${BASE}/api/auth/login`, {
      email: 'admin@copart-sim.com',
      password: 'Admin@1234'
    });
    const adminToken = adminLogin.data.tokens.accessToken;

    console.log('2) Register user A');
    const aEmail = `a_${Date.now()}@example.com`;
    const regA = await axios.post(`${BASE}/api/auth/register`, {
      email: aEmail,
      password: 'Password1A',
      firstName: 'Alice',
      lastName: 'Test'
    });
    const tokenA = regA.data.tokens.accessToken;

    console.log('3) Register user B');
    const bEmail = `b_${Date.now()}@example.com`;
    const regB = await axios.post(`${BASE}/api/auth/register`, {
      email: bEmail,
      password: 'Password1B',
      firstName: 'Bob',
      lastName: 'Test'
    });
    const tokenB = regB.data.tokens.accessToken;

    console.log('4) Get or create an auction');
    const auctionsRes = await axios.get(`${BASE}/api/auctions`);
    let auction = (auctionsRes.data.data || []).find(a => a.status !== 'completed');
    let auctionId;
    if (!auction) {
      console.log('  no active/scheduled auctions — creating one');
      const create = await axios.post(`${BASE}/api/auctions`, {
        title: `Smoke Test Auction ${Date.now()}`,
        auctionDate: new Date(Date.now() + 60 * 1000).toISOString()
      }, { headers: { Authorization: `Bearer ${adminToken}` } });
      auction = create.data;
    }
    auctionId = auction.id;
    console.log('  using auction:', auctionId);

    // Ensure auction is live and first lot active. If no lots exist, add one from vehicles.
    const auctionDetails = await axios.get(`${BASE}/api/auctions/${auctionId}`);
    const lotsList = auctionDetails.data.lots || [];
    if (lotsList.length === 0) {
      const vehicles = await axios.get(`${BASE}/api/vehicles`);
      if (!vehicles.data.data || vehicles.data.data.length === 0) throw new Error('No vehicles available to create lot');
      const vehicleId = vehicles.data.data[0].id;
      await axios.post(`${BASE}/api/auctions/${auctionId}/lots`, { vehicleId }, { headers: { Authorization: `Bearer ${adminToken}` } });
    }

    console.log('5) Start auction (admin)');
    await axios.post(`${BASE}/api/auctions/${auctionId}/start`, {}, { headers: { Authorization: `Bearer ${adminToken}` } });
    await sleep(500);

    console.log('6) Connect sockets for A and B');
    const clientA = io(BASE, { auth: { token: tokenA }, transports: ['websocket'] });
    const clientB = io(BASE, { auth: { token: tokenB }, transports: ['websocket'] });

    let activeLotId = null;

    clientA.on('connect', () => console.log('[A] connected', clientA.id));
    clientB.on('connect', () => console.log('[B] connected', clientB.id));

    clientA.on('joined', (data) => {
      console.log('[A] joined', data.auctionId);
      if (data.activeLot) activeLotId = data.activeLot.id;
    });
    clientB.on('joined', (data) => {
      console.log('[B] joined', data.auctionId);
      if (data.activeLot) activeLotId = data.activeLot.id;
    });

    clientA.on('you_were_outbid', (d) => {
      console.log('[A] YOU_WERE_OUTBID', d);
      cleanup(0);
    });

    clientA.on('bid_confirmed', (d) => console.log('[A] bid_confirmed', d.currentBid));
    clientB.on('bid_confirmed', (d) => console.log('[B] bid_confirmed', d.currentBid));

    clientA.on('bid_placed', (d) => console.log('[A] bid_placed broadcast', d));
    clientB.on('bid_placed', (d) => console.log('[B] bid_placed broadcast', d));

    // Wait for connections
    await new Promise((res) => setTimeout(res, 1000));

    console.log('7) Have both join auction room');
    clientA.emit('join_auction', { auctionId });
    clientB.emit('join_auction', { auctionId });

    // Wait for joined and activeLot
    await new Promise((res) => setTimeout(res, 1500));

    if (!activeLotId) {
      console.error('No active lot found');
      cleanup(1);
      return;
    }

    console.log('Active lot id:', activeLotId);

    console.log('8) A places initial bid');
    clientA.emit('place_bid', { lotId: activeLotId, amount: 600 });

    await new Promise((res) => setTimeout(res, 1000));

    console.log('9) B places higher bid to outbid A');
    clientB.emit('place_bid', { lotId: activeLotId, amount: 700 });

    // Wait for outbid event or timeout
    setTimeout(() => {
      console.error('Timeout: no outbid received');
      cleanup(2);
    }, 5000);

    function cleanup(code = 0) {
      clientA.disconnect();
      clientB.disconnect();
      process.exit(code);
    }

  } catch (err) {
    console.error('Test error', err.response ? err.response.data || err.response.statusText : err.message);
    process.exit(1);
  }
}

main();
