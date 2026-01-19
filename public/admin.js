function loadCustomers() {
  fetch("/api/customers")
    .then(r => r.json())
    .then(data => {
      const t = document.getElementById("customers");
      t.innerHTML = "";
      data.forEach(c => {
        t.innerHTML += `
          <tr>
            <td>${c.id}</td>
            <td>${c.name}</td>
            <td>${c.mobile}</td>
            <td>${c.must_register ? "RESET REQUIRED" : "OK"}</td>
            <td><button onclick="reset(${c.id})">Reset</button></td>
          </tr>`;
      });
    });
}

function loadPayments() {
  fetch("/api/payments")
    .then(r => r.json())
    .then(data => {
      const t = document.getElementById("payments");
      t.innerHTML = "";
      data.forEach(p => {
        t.innerHTML += `
          <tr>
            <td>${p.id}</td>
            <td>${p.name}</td>
            <td>${p.item}</td>
            <td>₹${p.amount}</td>
            <td>${new Date(p.created_at).toLocaleString()}</td>
          </tr>`;
      });
    });
}

function reset(id) {
  fetch("/admin-reset", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ customerId: id })
  }).then(() => loadCustomers());
}

loadCustomers();
loadPayments();
setInterval(loadPayments, 5000);