fetch('/api/payments')
  .then(res => res.json())
  .then(data => {
    const table = document.getElementById('data');
    table.innerHTML = '';

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