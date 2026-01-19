async function loadPayments() {
  const res = await fetch("/api/payments");
  const data = await res.json();
  const tbody = document.getElementById("payments-body");

  tbody.innerHTML = "";
  data.forEach(p => {
    tbody.innerHTML += `
      <tr>
        <td>${p.id}</td>
        <td>${p.item}</td>
        <td>₹${p.amount}</td>
        <td>${new Date(p.created_at).toLocaleString()}</td>
      </tr>`;
  });
}

loadPayments();
setInterval(loadPayments, 5000);