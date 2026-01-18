fetch('/api/payments', { credentials: 'include' })
  .then(res => res.json())
  .then(data => {
    const table = document.getElementById('data');
    table.innerHTML = '';

    if (data.length === 0) {
      table.innerHTML = '<tr><td colspan="4">No records</td></tr>';
      return;
    }

    data.forEach(p => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${p.id}</td>
        <td>${p.item}</td>
        <td>₹${p.amount}</td>
        <td>${p.time}</td>
      `;
      table.appendChild(row);
    });
  });