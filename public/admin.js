async function loadPayments() {
  const r = await fetch("/api/payments");
  const d = await r.json();
  const t = document.getElementById("payments-body");
  t.innerHTML = "";
  d.forEach(p => {
    t.innerHTML += `<tr>
      <td>${p.id}</td>
      <td>${p.item}</td>
      <td>₹${p.amount}</td>
      <td>${new Date(p.created_at).toLocaleString()}</td>
    </tr>`;
  });
}

async function loadCustomers() {
  const r = await fetch("/api/customers");
  const d = await r.json();
  const t = document.getElementById("customers-body");
  t.innerHTML = "";
  d.forEach(c => {
    t.innerHTML += `<tr>
      <td>${c.id}</td>
      <td>${c.name}</td>
      <td>${c.mobile}</td>
      <td>${new Date(c.created_at).toLocaleString()}</td>
    </tr>`;
  });
}

async function loadCustomerCount() {
  const r = await fetch("/api/customers/count");
  const d = await r.json();
  document.getElementById("customerCount").innerText = d.count;
}

loadPayments();
loadCustomers();
loadCustomerCount();

setInterval(() => {
  loadPayments();
  loadCustomers();
  loadCustomerCount();
}, 5000);