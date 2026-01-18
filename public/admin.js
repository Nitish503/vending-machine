fetch("/api/payments")
  .then(res => res.json())
  .then(data => {
    const rows = document.getElementById("rows");
    data.forEach(p => {
      rows.innerHTML += `
        <tr>
          <td>${p.id}</td>
          <td>${p.item}</td>
          <td>₹${p.amount}</td>
          <td>${new Date(p.created_at).toLocaleString()}</td>
        </tr>`;
    });
  });