// server.js
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const app = express();
const port = 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

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
      res.json({ data: rows });
    }
  });
});

// Batch update items
app.put('/api/data/batch', (req, res) => {
  const updates = req.body;
  const updatePromises = [];

  Object.keys(updates).forEach(id => {
    const updateData = updates[id];
    const fields = [];
    const values = [];

    // Construct the SET clause for the update statement dynamically
    for (const field in updateData) {
      fields.push(`${field} = ?`);
      values.push(updateData[field] === null ? null : updateData[field]); // Handle NULL values
    }

    values.push(id); // Add the ID to the values array for the WHERE clause

    const setClause = fields.join(', ');
    const updateQuery = `UPDATE MahattanMaterials SET ${setClause} WHERE Id = ?`;

    updatePromises.push(
      new Promise((resolve, reject) => {
        db.run(updateQuery, values, function (err) {
          if (err) {
            console.error(`Error updating row with ID ${id}:`, err.message);
            reject(err);
          } else {
            resolve({ id, changes: updateData });
          }
        });
      })
    );
  });

  Promise.all(updatePromises)
    .then(results => res.json({ message: 'Batch update successful', results }))
    .catch(err => {
      console.error('Batch update failed:', err.message);
      res.status(500).json({ error: 'Internal Server Error during batch update' });
    });
});

// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
