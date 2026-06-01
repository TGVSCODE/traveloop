const express = require('express');
const router = express.Router();
const db = require('../config/db');
const auth = require('../middleware/auth');
const https = require('https');

// Helper to strip HTML tags and decode quotes from Wikipedia snippets
function cleanSnippet(html) {
  if (!html) return '';
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&#039;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

// Promise helper for https GET
function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Traveloop/1.0 (contact@traveloop.com)' } }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (err) {
          reject(err);
        }
      });
    }).on('error', (err) => reject(err));
  });
}

// Helper to format Date objects to YYYY-MM-DD
function formatDate(dateVal) {
  if (!dateVal) return null;
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return dateVal;
  return d.toISOString().split('T')[0];
}

// @route   GET api/trips/suggestions
// @desc    Get suggested places and activities based on city using Wikipedia search API
// @access  Public
// @route   GET api/trips/suggestions
// @desc    Get suggested places and activities based on city using Wikipedia search API
// @access  Public
router.get('/suggestions', async (req, res) => {
  console.log('[DEBUG] Suggestions route called with query:', req.query);
  const { city } = req.query;
  if (!city) {
    return res.status(400).json({ message: 'City parameter is required' });
  }

  const cleanCity = city.split(',')[0].trim();
  const cleanCityLower = cleanCity.toLowerCase();
  if (!cleanCity) {
    return res.status(400).json({ message: 'Valid city parameter is required' });
  }

  try {
    const wikiUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent("tourist attractions in " + cleanCity)}&utf8=1&format=json&origin=*&srlimit=30`;
    
    let wikiData;
    try {
      wikiData = await fetchJson(wikiUrl);
    } catch (fetchErr) {
      console.error('Wikipedia search request failed:', fetchErr.message);
      wikiData = { query: { search: [] } };
    }

    const wikiResults = (wikiData && wikiData.query && wikiData.query.search) || [];
    
    const capitalizedCity = cleanCity.charAt(0).toUpperCase() + cleanCity.slice(1);
    const generalActivities = [
      {
        name: `Local Food Tasting Tour in ${capitalizedCity}`,
        description: `Taste local delicacies, street food, and learn about the unique culinary culture of ${capitalizedCity}.`,
        cost: 45,
        category: 'Food & Drink'
      },
      {
        name: `Hop-on Hop-off Bus Tour of ${capitalizedCity}`,
        description: `An easy, flexible open-top double-decker bus tour of all major sightseeing spots in ${capitalizedCity}.`,
        cost: 25,
        category: 'Sightseeing Tour'
      },
      {
        name: `Biking Adventure in ${capitalizedCity}`,
        description: `Cycle through the beautiful parks, historical alleys, and scenic pathways of ${capitalizedCity}.`,
        cost: 20,
        category: 'Activity'
      },
      {
        name: `Cooking Class: Traditional ${capitalizedCity} Cuisine`,
        description: `Learn how to prepare authentic regional dishes under the guidance of a professional local chef.`,
        cost: 55,
        category: 'Workshop'
      }
    ];

    const activities = [...generalActivities];
    const places = [];

    // Keyword classifier helper
    const classifyItem = (title, snippet) => {
      const text = (title + ' ' + snippet).toLowerCase();
      
      if (text.includes('theme park') || text.includes('disneyland') || text.includes('universal studios') || text.includes('amusement park') || text.includes('resort')) {
        return { category: 'Amusement Park', cost: 75 };
      }
      if (text.includes('museum') || text.includes('gallery') || text.includes('louvre') || text.includes('exhibition') || text.includes('heritage')) {
        return { category: 'Museum', cost: 20 };
      }
      if (text.includes('tower') || text.includes('palace') || text.includes('castle') || text.includes('fort') || text.includes('citadel') || text.includes('palazzo') || text.includes('château')) {
        return { category: 'Historic Landmark', cost: 25 };
      }
      if (text.includes('cathedral') || text.includes('church') || text.includes('temple') || text.includes('mosque') || text.includes('basilica') || text.includes('abbey') || text.includes('shrine') || text.includes('synagogue')) {
        return { category: 'Religious Site', cost: 0 };
      }
      if (text.includes('park') || text.includes('garden') || text.includes('square') || text.includes('plaza') || text.includes('beach') || text.includes('island') || text.includes('lake') || text.includes('mountain') || text.includes('river') || text.includes('forest') || text.includes('canyon')) {
        return { category: 'Nature & Outdoors', cost: 0 };
      }
      if (text.includes('bridge') || text.includes('monument') || text.includes('memorial') || text.includes('street') || text.includes('avenue') || text.includes('boulevard') || text.includes('quarter') || text.includes('neighborhood')) {
        return { category: 'Sightseeing', cost: 0 };
      }
      return { category: 'Landmark', cost: 12 };
    };

    wikiResults.forEach(item => {
      const title = item.title;
      const titleLower = title.toLowerCase();

      // 1. Exclude list, overview, metadata, or generic encyclopedia articles
      if (
        titleLower.includes('list of') ||
        titleLower.includes('lists of') ||
        titleLower.includes('tourism in') ||
        titleLower.includes('geography of') ||
        titleLower.includes('demographics of') ||
        titleLower.includes('economy of') ||
        titleLower.includes('history of') ||
        titleLower.includes('politics of') ||
        titleLower.includes('transport in') ||
        titleLower.includes('culture of') ||
        titleLower.includes('cuisine of') ||
        titleLower.includes('climate of') ||
        titleLower.includes('government of') ||
        titleLower.includes('flag of') ||
        titleLower.includes('coat of arms of') ||
        titleLower.includes('education in') ||
        titleLower.includes('crime in') ||
        titleLower.includes('sport in') ||
        titleLower.includes('sports in')
      ) {
        return;
      }

      // 2. Exclude common non-attraction/infrastructure terms
      if (
        titleLower.includes('syndrome') ||
        titleLower.includes('portal') ||
        titleLower.includes('metro') ||
        titleLower.includes('airport') ||
        titleLower.includes('subway') ||
        titleLower.includes('railway') ||
        titleLower.includes('station')
      ) {
        return;
      }

      const description = cleanSnippet(item.snippet);
      const searchContent = (title + ' ' + description).toLowerCase();

      // 3. Strict match: Only retain landmarks that mention the city name
      if (!searchContent.includes(cleanCityLower)) {
        return;
      }

      const { category, cost } = classifyItem(title, description);

      places.push({
        name: title,
        description: description || `Famous landmark in ${cleanCity}.`,
        cost,
        category
      });

      if (cost > 0) {
        activities.push({
          name: `Guided Tour of ${title}`,
          description: `Enjoy a fast-track guided tour of the historic ${title} with an expert local guide.`,
          cost: cost + 15,
          category: 'Guided Tour'
        });
      } else {
        activities.push({
          name: `Walking Sightseeing Tour at ${title}`,
          description: `Explore the surroundings of ${title} and capture amazing photographs on a guided walk.`,
          cost: 10,
          category: 'Sightseeing'
        });
      }
    });

    if (places.length === 0) {
      places.push(
        {
          name: `${capitalizedCity} Historic Quarter`,
          description: `Explore the historical center of ${capitalizedCity}, featuring traditional architecture and scenic local streets.`,
          cost: 0,
          category: 'Historic Landmark'
        },
        {
          name: `${capitalizedCity} City Museum`,
          description: `Learn about the local history, heritage, and regional artifacts of ${capitalizedCity}.`,
          cost: 15,
          category: 'Museum'
        },
        {
          name: `${capitalizedCity} Botanical Garden`,
          description: `A peaceful public park filled with beautiful botanical collections and relaxing walking paths.`,
          cost: 8,
          category: 'Nature & Outdoors'
        }
      );
    }

    res.json({
      places: places.slice(0, 8),
      activities: activities.slice(0, 10)
    });

  } catch (err) {
    console.error('Suggestions API error:', err);
    res.status(500).json({ message: 'Server error generating suggestions' });
  }
});

// @route   GET api/trips
// @desc    Get all trips for user with their itineraries, expenses, checklist, and notes
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    // 1. Fetch all trips for user
    const [trips] = await db.query(
      'SELECT id, name, destination, DATE_FORMAT(startDate, "%Y-%m-%d") as startDate, DATE_FORMAT(endDate, "%Y-%m-%d") as endDate, travelers, budget, description FROM trips WHERE user_id = ?',
      [req.user.id]
    );

    if (trips.length === 0) {
      return res.json([]);
    }

    // 2. Hydrate each trip with its sub-resources
    const hydratedTrips = await Promise.all(
      trips.map(async (trip) => {
        // Fetch itineraries (stops)
        const [itinerary] = await db.query(
          'SELECT city, DATE_FORMAT(date, "%Y-%m-%d") as date, activity, category, cost, duration, start_time FROM itineraries WHERE trip_id = ? ORDER BY sort_order ASC, date ASC',
          [trip.id]
        );

        // Fetch expenses
        const [expenses] = await db.query(
          'SELECT description, amount, category, DATE_FORMAT(date, "%Y-%m-%d") as date, status FROM expenses WHERE trip_id = ?',
          [trip.id]
        );

        // Fetch checklist
        const [checklist] = await db.query(
          'SELECT name, category, packed FROM checklists WHERE trip_id = ?',
          [trip.id]
        );
        // Map packed from 1/0 to true/false
        const checklistMapped = checklist.map(item => ({
          ...item,
          packed: !!item.packed
        }));

        // Fetch notes
        const [notes] = await db.query(
          'SELECT title, content, timestamp FROM notes WHERE trip_id = ? ORDER BY timestamp DESC',
          [trip.id]
        );
        // Map timestamp from SQL string/number to Number
        const notesMapped = notes.map(note => ({
          ...note,
          timestamp: Number(note.timestamp)
        }));

        return {
          ...trip,
          userId: req.user.email, // Maintain compatibility with frontend filtering
          itinerary,
          expenses,
          checklist: checklistMapped,
          notes: notesMapped
        };
      })
    );

    res.json(hydratedTrips);
  } catch (err) {
    console.error('Get trips error:', err);
    res.status(500).json({ message: 'Server error retrieving trips' });
  }
});

// @route   POST api/trips
// @desc    Create a new trip
// @access  Private
router.post('/', auth, async (req, res) => {
  const { id, name, destination, startDate, endDate, travelers, budget, description } = req.body;

  if (!id || !name || !destination || !startDate || !endDate) {
    return res.status(400).json({ message: 'Please enter all required fields' });
  }

  try {
    await db.query(
      'INSERT INTO trips (id, user_id, name, destination, startDate, endDate, travelers, budget, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        id,
        req.user.id,
        name,
        destination,
        formatDate(startDate),
        formatDate(endDate),
        travelers || 1,
        budget || 0.00,
        description || ''
      ]
    );

    res.status(201).json({
      success: true,
      trip: {
        id,
        name,
        destination,
        startDate: formatDate(startDate),
        endDate: formatDate(endDate),
        travelers: travelers || 1,
        budget: budget || 0.00,
        description: description || '',
        itinerary: [],
        expenses: [],
        checklist: [],
        notes: []
      }
    });
  } catch (err) {
    console.error('Create trip error:', err);
    res.status(500).json({ message: 'Server error creating trip' });
  }
});

// @route   PUT api/trips/:id
// @desc    Update trip metadata
// @access  Private
router.put('/:id', auth, async (req, res) => {
  const { name, destination, startDate, endDate, travelers, budget, description } = req.body;

  try {
    // Verify owner
    const [trips] = await db.query('SELECT * FROM trips WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    if (trips.length === 0) {
      return res.status(404).json({ message: 'Trip not found or unauthorized' });
    }

    await db.query(
      'UPDATE trips SET name = ?, destination = ?, startDate = ?, endDate = ?, travelers = ?, budget = ?, description = ? WHERE id = ?',
      [
        name,
        destination,
        formatDate(startDate),
        formatDate(endDate),
        travelers,
        budget,
        description || '',
        req.params.id
      ]
    );

    res.json({ success: true, message: 'Trip metadata updated successfully' });
  } catch (err) {
    console.error('Update trip error:', err);
    res.status(500).json({ message: 'Server error updating trip metadata' });
  }
});

// @route   DELETE api/trips/:id
// @desc    Delete a trip
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    // Verify owner
    const [trips] = await db.query('SELECT * FROM trips WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    if (trips.length === 0) {
      return res.status(404).json({ message: 'Trip not found or unauthorized' });
    }

    await db.query('DELETE FROM trips WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Trip deleted successfully' });
  } catch (err) {
    console.error('Delete trip error:', err);
    res.status(500).json({ message: 'Server error deleting trip' });
  }
});

// @route   PUT api/trips/:id/sync
// @desc    Sync all trip sub-resources (itinerary, expenses, checklist, notes)
// @access  Private
router.put('/:id/sync', auth, async (req, res) => {
  const { itinerary, expenses, checklist, notes } = req.body;

  const pool = db.getPool();
  const conn = await pool.getConnection();

  try {
    // Verify owner
    const [trips] = await conn.query('SELECT * FROM trips WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    if (trips.length === 0) {
      conn.release();
      return res.status(404).json({ message: 'Trip not found or unauthorized' });
    }

    // Begin Transaction
    await conn.beginTransaction();

    const tripId = req.params.id;

    // 1. Sync Itinerary
    if (Array.isArray(itinerary)) {
      await conn.query('DELETE FROM itineraries WHERE trip_id = ?', [tripId]);
      if (itinerary.length > 0) {
        const values = itinerary.map((item, idx) => [
          tripId,
          item.city,
          formatDate(item.date),
          item.activity,
          item.category,
          item.cost || 0.00,
          item.duration || '',
          item.start_time || null,
          idx // sort_order
        ]);
        await conn.query(
          'INSERT INTO itineraries (trip_id, city, date, activity, category, cost, duration, start_time, sort_order) VALUES ?',
          [values]
        );
      }
    }

    // 2. Sync Expenses
    if (Array.isArray(expenses)) {
      await conn.query('DELETE FROM expenses WHERE trip_id = ?', [tripId]);
      if (expenses.length > 0) {
        const values = expenses.map(item => [
          tripId,
          item.description,
          item.amount || 0.00,
          item.category,
          formatDate(item.date),
          item.status || 'Paid'
        ]);
        await conn.query(
          'INSERT INTO expenses (trip_id, description, amount, category, date, status) VALUES ?',
          [values]
        );
      }
    }

    // 3. Sync Checklist
    if (Array.isArray(checklist)) {
      await conn.query('DELETE FROM checklists WHERE trip_id = ?', [tripId]);
      if (checklist.length > 0) {
        const values = checklist.map(item => [
          tripId,
          item.name,
          item.category,
          item.packed ? 1 : 0
        ]);
        await conn.query(
          'INSERT INTO checklists (trip_id, name, category, packed) VALUES ?',
          [values]
        );
      }
    }

    // 4. Sync Notes
    if (Array.isArray(notes)) {
      await conn.query('DELETE FROM notes WHERE trip_id = ?', [tripId]);
      if (notes.length > 0) {
        const values = notes.map(item => [
          tripId,
          item.title,
          item.content,
          item.timestamp
        ]);
        await conn.query(
          'INSERT INTO notes (trip_id, title, content, timestamp) VALUES ?',
          [values]
        );
      }
    }

    // Commit Transaction
    await conn.commit();
    conn.release();

    res.json({ success: true, message: 'Trip sub-resources synced successfully' });
  } catch (err) {
    await conn.rollback();
    conn.release();
    console.error('Sync trip sub-resources error:', err);
    res.status(500).json({ message: 'Server error syncing trip details' });
  }
});

module.exports = router;
