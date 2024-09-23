let changes = {}; // Object to store changes

function fetchItems() {
  fetch('/api/data')
    .then(response => response.json())
    .then(data => {
      console.log('Fetched data:', data); // Log fetched data to check structure
      const tableBody = document.getElementById('table-body');
      tableBody.innerHTML = ''; // Clear existing content

      // Check if data exists and is an array
      if (data && Array.isArray(data.data)) {
        data.data.forEach(item => {
          // Create a table row with a data-id attribute
          const row = document.createElement('tr');
          row.setAttribute('data-id', item.Id);

          // Insert table data for each field
          row.innerHTML = `
            <td><a href="https://minecraft.wiki/w/${item.Name}">${item.Name}</a></td>
            <td>${item.Amount}</td>
            <td>${item.Stacks}</td>
            <td>
              <input type="checkbox" ${item.Status === 1 ? 'checked' : ''} 
                data-field="Status" />
            </td>
            <td>
              <input type="text" value="${item.Worker || ''}" 
                data-field="Worker" />
            </td>
            <td>
              <input type="text" value="${item.Proof || ''}" 
                data-field="Proof" />
            </td>
          `;

          // Attach event listeners to inputs to capture changes
          row.querySelectorAll('input').forEach(input => {
            input.addEventListener('change', (event) => captureChange(event, item.Id));
          });

          // Append the row to the table body
          tableBody.appendChild(row);
        });
      } else {
        console.error('Unexpected data structure:', data);
      }
    })
    .catch(error => console.error('Error fetching data:', error));
}

// Function to capture changes when inputs are modified
function captureChange(event, id) {
  const field = event.target.getAttribute('data-field');
  let value;

  // Check if the element is a checkbox
  if (event.target.type === 'checkbox') {
    value = event.target.checked ? 1 : 0; // Convert checkbox status to 1 or 0
  } else {
    value = event.target.value;
  }

  // Initialize changes object for the specific ID if it doesn't exist
  if (!changes[id]) {
    changes[id] = {};
  }

  // Store the changed value in the changes object
  changes[id][field] = value;
}

// Function to send all captured updates when the Update button is clicked
function updateAllItems() {
  Object.keys(changes).forEach(id => {
    const updatedData = changes[id];
    fetch(`/api/data/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updatedData),
    })
      .then(response => response.json())
      .then(data => {
        console.log(`Item ${id} updated:`, data);
      })
      .catch(error => console.error(`Error updating item ${id}:`, error));
  });

  // Clear changes after updating
  changes = {};
}

// Add event listener to the Update button
document.getElementById('update-all').addEventListener('click', updateAllItems);

// Fetch items on page load
fetchItems();
