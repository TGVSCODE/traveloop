const http = require('http');

const API_URL = 'http://127.0.0.1:5000';

function makeRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: body ? JSON.parse(body) : null
        });
      });
    });

    req.on('error', (e) => reject(e));

    if (postData) {
      req.write(JSON.stringify(postData));
    }
    req.end();
  });
}

async function run() {
  try {
    console.log('1. Registering new test user...');
    const email = `testuser_${Date.now()}@gmail.com`;
    const signupRes = await makeRequest({
      hostname: '127.0.0.1',
      port: 5000,
      path: '/api/auth/signup',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    }, {
      name: 'Test Traveler',
      email: email,
      password: 'password123'
    });

    console.log('Signup Response:', signupRes.statusCode, signupRes.body);

    console.log('\n2. Logging in...');
    const loginRes = await makeRequest({
      hostname: '127.0.0.1',
      port: 5000,
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    }, {
      email: email,
      password: 'password123'
    });

    console.log('Login Response:', loginRes.statusCode, loginRes.body);
    const token = loginRes.body.token;

    console.log('\n3. Fetching suggestions for Rome...');
    const suggestionsRes = await makeRequest({
      hostname: '127.0.0.1',
      port: 5000,
      path: `/api/trips/suggestions?city=Rome`,
      method: 'GET'
    });

    console.log('Suggestions Response Status:', suggestionsRes.statusCode);
    const places = suggestionsRes.body.places || [];
    const activities = suggestionsRes.body.activities || [];
    console.log(`Found ${places.length} places and ${activities.length} activities.`);
    console.log('First Place:', places[0]);
    console.log('First Activity:', activities[0]);

    // Select a few suggestions
    const selectedSuggestions = [places[0], activities[0]].filter(Boolean);

    console.log('\n4. Preparing trip payload with selected suggestions...');
    const tripId = `trip-${Date.now()}`;
    const startDate = '2026-06-01';
    const initialItinerary = [];
    const initialExpenses = [];

    selectedSuggestions.forEach((item) => {
      // Determine if it's a place by matching name in places list
      const isPlace = places.some(p => p.name === item.name);
      
      if (isPlace) {
        initialItinerary.push({
          city: 'Rome',
          date: startDate,
          activity: `Visit ${item.name}`,
          category: item.category || 'Sightseeing',
          cost: item.cost,
          duration: '2 hours'
        });

        if (item.cost > 0) {
          initialExpenses.push({
            description: `${item.name} Entry Tickets`,
            amount: item.cost,
            category: 'Sightseeing',
            date: startDate,
            status: 'Pending'
          });
        }
      } else {
        initialItinerary.push({
          city: 'Rome',
          date: startDate,
          activity: item.name,
          category: item.category || 'Activity',
          cost: item.cost,
          duration: '3 hours'
        });

        if (item.cost > 0) {
          initialExpenses.push({
            description: item.name,
            amount: item.cost,
            category: 'Activities',
            date: startDate,
            status: 'Pending'
          });
        }
      }
    });

    const newTrip = {
      id: tripId,
      name: 'Summer in Rome',
      destination: 'Rome',
      startDate: startDate,
      endDate: '2026-06-07',
      travelers: 2,
      budget: 1500,
      description: 'Trip planned with automated suggestions',
      itinerary: initialItinerary,
      expenses: initialExpenses,
      checklist: [],
      notes: []
    };

    console.log('\n5. Creating trip metadata on backend (POST /api/trips)...');
    const createTripRes = await makeRequest({
      hostname: '127.0.0.1',
      port: 5000,
      path: '/api/trips',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    }, newTrip);

    console.log('Create Trip Response:', createTripRes.statusCode, createTripRes.body);

    console.log('\n6. Syncing selected suggestions (PUT /api/trips/:id/sync)...');
    const syncRes = await makeRequest({
      hostname: '127.0.0.1',
      port: 5000,
      path: `/api/trips/${tripId}/sync`,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    }, newTrip);

    console.log('Sync Response:', syncRes.statusCode, syncRes.body);

    console.log('\n7. Verifying DB records...');
    const db = require('c:/Users/Asus/Downloads/frontend_1-zip (5)/frontend_1-zip/backend/config/db');
    // Wait for db.js to connect
    await new Promise(resolve => setTimeout(resolve, 500));

    const [trips] = await db.query('SELECT * FROM trips WHERE id = ?', [tripId]);
    console.log('\n[DB Verification] Trips Table:');
    console.table(trips);

    const [itineraries] = await db.query('SELECT city, date, activity, category, cost FROM itineraries WHERE trip_id = ?', [tripId]);
    console.log('\n[DB Verification] Itineraries Table:');
    console.table(itineraries);

    const [expenses] = await db.query('SELECT description, amount, category, date, status FROM expenses WHERE trip_id = ?', [tripId]);
    console.log('\n[DB Verification] Expenses Table:');
    console.table(expenses);

    console.log('\nIntegration Test Successful!');
    process.exit(0);
  } catch (err) {
    console.error('Test failed:', err);
    process.exit(1);
  }
}

run();
