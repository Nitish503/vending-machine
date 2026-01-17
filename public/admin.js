fetch("/api/admin/payments")
  .then(res => res.json())
  .then(data => {
    const table = document.getElementById("payments");
    table.innerHTML = "";

    data.forEach(p => {
      const row = `
        <tr>
          <td>${p.id}</td>
          <td>${p.item}</td>
          <td>₹${p.amount}</td>
          <td>${p.time}</td>
        </tr>
      `;
      table.innerHTML += row;
    });
  });