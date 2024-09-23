// script.js
let changes = {}; // Object to store changes
let isUpdating = false; // Flag to indicate if an update is in progress
let allItems = []; // Store all fetched items for search, sort, and filter functionality

const webhookUrl = 'https://discord.com/api/webhooks/1287708153785352203/23wbSbcnGIMbVVZ5vIP8b2iGgoMjY3l7ke87ZILxp37ynh1ECw0i0a_W2ID8DNXfRfMU';

function fetchItems() {
    fetch('/api/data')
        .then(response => response.json())
        .then(data => {
            allItems = data.data || []; // Save all items for future filtering and sorting
            renderItems(allItems); // Render all items initially
        })
        .catch(error => console.error('Error fetching data:', error));
}

// Render items into the table
function renderItems(items) {
    const tableBody = document.getElementById('table-body');
    tableBody.innerHTML = ''; // Clear existing content

    items.forEach(item => {
        const row = document.createElement('tr');
        row.setAttribute('data-id', item.Id);

        row.innerHTML = `
      <td><a href="https://minecraft.wiki/w/${item.Name}">${item.Name}</a></td>
      <td>${item.Amount}</td>
      <td>${item.Stacks}</td>
      <td>
        <input type="checkbox" ${item.Status === 1 ? 'checked' : ''} data-field="Status" />
      </td>
      <td>
        <input type="text" value="${item.Worker || ''}" data-field="Worker" />
      </td>
      <td>
        <input type="text" value="${item.Proof || ''}" data-field="Proof" />
      </td>
      <td>
        <button class="clear-row" data-id="${item.Id}">Clear</button>
      </td>
    `;

        // Add event listeners to inputs and the clear button
        row.querySelectorAll('input').forEach(input => {
            input.addEventListener('change', debounce(event => captureChange(event, item.Id, item.Name), 300));
        });

        row.querySelector('.clear-row').addEventListener('click', () => clearRow(item.Id, row));

        tableBody.appendChild(row);
    });
}

function captureChange(event, id, name) {
    const field = event.target.getAttribute('data-field');
    let value = event.target.type === 'checkbox' ? (event.target.checked ? 1 : 0) : event.target.value;

    // Convert empty strings or spaces to NULL
    if (typeof value === 'string' && value.trim() === '') {
        value = null;
    }

    if (!changes[id]) changes[id] = {};
    changes[id][field] = value;

    // Send webhook notification for each change, including the item's name
    sendWebhookNotification(id, name, field, value);
}

function clearRow(id, row) {
  // Set the fields to appropriate default values instead of NULL
  const statusInput = row.querySelector('input[data-field="Status"]');
  const workerInput = row.querySelector('input[data-field="Worker"]');
  const proofInput = row.querySelector('input[data-field="Proof"]');

  statusInput.checked = false;
  workerInput.value = '';
  proofInput.value = '';

  // Update changes object with default values
  if (!changes[id]) changes[id] = {};
  changes[id].Status = 0; // Set to default value instead of NULL
  changes[id].Worker = null;
  changes[id].Proof = null;

  showNotification('Row cleared!', 'success');

  // Send webhook notification for the clear action
  sendWebhookNotification(
    id,
    row.querySelector('a').textContent, // Assuming the item's name is in the first cell link
    'Clear Action',
    `Status set to 0, Worker and Proof set to NULL`
  );

  updateSingleRow(id);
}


function updateSingleRow(id) {
    if (!changes[id]) return; // If there are no changes for the given row, do nothing

    fetch('/api/data/batch', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                [id]: changes[id]
            }), // Only update the specific row
        })
        .then(response => response.json())
        .then(data => {
            showNotification('Row updated successfully!', 'success');
            delete changes[id]; // Remove the change entry after successful update
        })
        .catch(error => {
            console.error('Error updating row:', error);
            showNotification('Failed to update row. Please try again.', 'error');
        });
}

function updateAllItems() {
    if (Object.keys(changes).length === 0 || isUpdating) return; // Prevent update if no changes or if already updating

    // Validate changes before sending the update
    // if (!validateChanges()) {
    //     showNotification('Please fill in all related fields (Status, Worker, Proof) if one of them is filled.', 'error');
    //     return;
    // }

    isUpdating = true; // Set updating flag
    document.getElementById('update-all').disabled = true; // Disable button
    const updateStatus = document.getElementById('update-status'); // Reference to the notification label
    updateStatus.textContent = 'Updating...'; // Set initial status text
    updateStatus.className = ''; // Clear previous status classes

    fetch('/api/data/batch', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(changes),
        })
        .then(response => response.json())
        .then(data => {
            showNotification('Update successful!', 'success');
            changes = {}; // Clear changes after successful update
        })
        .catch(error => {
            console.error('Error in batch update:', error);
            showNotification('Update failed! Please try again.', 'error');
        })
        .finally(() => {
            isUpdating = false; // Reset updating flag
            document.getElementById('update-all').disabled = false; // Re-enable button
        });
}

// Send a message to Discord webhook with the name included
// Function to send a message to Discord webhook with detailed timestamp and proof content if applicable// Function to send a message to Discord webhook with detailed timestamp and proof content if applicable
function sendWebhookNotification(id, name, field, value) {
  const currentTimestamp = new Date().toISOString(); // Generates the most detailed timestamp

  // Define the base payload for the embed message
  const payload = {
      embeds: [{
          title: 'Change Notification',
          description: `Field "${field}" of row ID ${id} (${name}) was updated.`,
          color: 65280, // Green color
          fields: [{
                  name: 'Item Name',
                  value: name,
                  inline: false,
              },
              {
                  name: 'Row ID',
                  value: id.toString(),
                  inline: true,
              },
              {
                  name: 'Field',
                  value: field,
                  inline: true,
              },
              {
                  name: 'New Value',
                  value: value === null ? 'NULL' : value.toString(),
                  inline: true,
              },
          ],
          timestamp: currentTimestamp, // Include the detailed timestamp
      }, ],
  };

  // If the updated field is "Proof", add the content of the proof to the embed as content
  if (field.toLowerCase() === 'proof' && value) {
      payload.content = `**Proof Content:**\n${value}`;
  }

  // Debugging: Log the payload to check the content before sending
  console.log('Webhook Payload:', payload);

  // Send the payload to the webhook
  fetch(webhookUrl, {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
      })
      .then(response => {
          if (!response.ok) {
              throw new Error(`Failed to send webhook: ${response.statusText}`);
          }
          console.log('Webhook sent successfully');
      })
      .catch(error => console.error('Error sending webhook notification:', error));
}

// Validate that if one of "Status," "Worker," or "Proof" is filled, all must be filled
function validateChanges() {
    for (const id in changes) {
        const item = changes[id];
        const hasStatus = item.Status !== undefined;
        const hasWorker = item.Worker !== null && item.Worker !== undefined;
        const hasProof = item.Proof !== null && item.Proof !== undefined;

        // If one field is filled, ensure all fields are filled
        if ((hasStatus || hasWorker || hasProof) && !(hasStatus && hasWorker && hasProof)) {
            return false; // Validation fails if any field is missing when another is filled
        }
    }
    return true; // Validation passes
}

// Display notification messages
function showNotification(message, type) {
    const updateStatus = document.getElementById('update-status');
    updateStatus.textContent = message;
    updateStatus.className = type === 'success' ? 'success' : 'error';
}

function debounce(func, delay) {
    let timer;
    return function(...args) {
        clearTimeout(timer);
        timer = setTimeout(() => func.apply(this, args), delay);
    };
}

// Search functionality to filter items based on search input
document.getElementById('search-bar').addEventListener('input', function() {
    const searchTerm = this.value.toLowerCase();
    const filteredItems = filterAndSortItems(allItems, searchTerm, getSelectedSort(), getSelectedStatus());
    renderItems(filteredItems);
});

// Sorting by amount
document.getElementById('sort-amount').addEventListener('change', function() {
    const filteredItems = filterAndSortItems(allItems, getSearchTerm(), this.value, getSelectedStatus());
    renderItems(filteredItems);
});

// Filtering by status
document.getElementById('filter-status').addEventListener('change', function() {
    const filteredItems = filterAndSortItems(allItems, getSearchTerm(), getSelectedSort(), this.value);
    renderItems(filteredItems);
});

// Helper function to filter and sort items based on current inputs
function filterAndSortItems(items, searchTerm, sortOrder, statusFilter) {
    let filteredItems = items;

    // Filter by search term
    if (searchTerm) {
        filteredItems = filteredItems.filter(item =>
            item.Name.toLowerCase().includes(searchTerm) ||
            (item.Worker || '').toLowerCase().includes(searchTerm) ||
            (item.Proof || '').toLowerCase().includes(searchTerm)
        );
    }

    // Filter by status
    if (statusFilter) {
        filteredItems = filteredItems.filter(item => statusFilter === 'finished' ? item.Status === 1 : item.Status === 0);
    }

    // Sort by amount
    if (sortOrder) {
        filteredItems.sort((a, b) => sortOrder === 'asc' ? a.Amount - b.Amount : b.Amount - a.Amount);
    }

    return filteredItems;
}

// Utility functions to get current values from the inputs
function getSearchTerm() {
    return document.getElementById('search-bar').value.toLowerCase();
}

function getSelectedSort() {
    return document.getElementById('sort-amount').value;
}

function getSelectedStatus() {
    return document.getElementById('filter-status').value;
}

document.getElementById('update-all').addEventListener('click', updateAllItems);
fetchItems();