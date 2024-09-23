// server.js
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const axios = require('axios'); // Add axios to send requests to Discord
const app = express();
const port = 3000;

// Middleware to parse JSON
app.use(express.json());

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, '../public'))); // Adjust path as needed to reach the 'public' folder

// Connect to SQLite database
const db = new sqlite3.Database(path.join(__dirname, 'database.db'), (err) => {
  if (err) {
    console.error('Error connecting to SQLite database:', err);
  } else {
    console.log('Connected to SQLite database.');
  }
});

// Fetch all items
app.get('/api/data', (req, res) => {
  const query = "SELECT Id, Name, Amount, ROUND(Amount/64, 1) AS 'Stacks', Status, Worker, Proof FROM MahattanMaterials";
  db.all(query, [], (err, rows) => {
    if (err) {
      console.error('Error executing query:', err.message);
      res.status(500).json({ error: err.message });
    } else {
      console.log('Fetched rows:', rows);
      res.json({ data: rows });
    }
  });
});

// Update an existing item
app.put('/api/data/:id', (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  // Get old data to compare old and new values
  const selectQuery = 'SELECT * FROM MahattanMaterials WHERE Id = ?';
  db.get(selectQuery, [id], (err, oldData) => {
    if (err || !oldData) {
      console.error('Error fetching old data:', err);
      res.status(500).json({ error: err ? err.message : 'No data found' });
      return;
    }

    // Dynamic SQL generation for only the fields that are being updated
    const setClause = Object.keys(updates).map(field => `${field} = ?`).join(', ');
    const values = [...Object.values(updates), id];
    const updateQuery = `UPDATE MahattanMaterials SET ${setClause} WHERE Id = ?`;

    db.run(updateQuery, values, function (err) {
      if (err) {
        console.error('Error updating data:', err.message);
        res.status(500).json({ error: err.message });
      } else {
        res.json({ message: 'Item updated successfully' });

        // Prepare data for Discord webhook
        const changes = Object.keys(updates).map(field => {
          return `${field}: "${oldData[field]}" -> "${updates[field]}"`;
        }).join('\n');

        // Send details to Discord webhook
        axios.post('https://discord.com/api/webhooks/1287708153785352203/23wbSbcnGIMbVVZ5vIP8b2iGgoMjY3l7ke87ZILxp37ynh1ECw0i0a_W2ID8DNXfRfMU', {
          content: `**Update Notification**\nItem ID: ${id}\nChanges:\n${changes}`
        }).then(() => {
          console.log('Update sent to Discord webhook successfully.');
        }).catch(err => {
          console.error('Error sending update to Discord webhook:', err.message);
        });
      }
    });
  });
});

// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
