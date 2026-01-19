async function loadCustomers() {
  const res = await fetch("/api/customers");
  const data = await res.json();
  const tbody = document.getElementById("customers-body");
  tbody.innerHTML = "";

  data.forEach(c => {
    tbody.innerHTML += `
      <tr>
        <td>${c.id}</td>
        <td>${c.name}</td>
        <td>${c.mobile}</td>
        <td>${c.password === null ? "RESET REQUIRED" : "ACTIVE"}</td>
        <td>
          <button onclick="forceReset(${c.id})">Force Reset</button>
        </td>
      </tr>`;
  });
}

async function loadCustomerCount() {
  const r = await fetch("/api/customers/count");
  const d = await r.json();
  document.getElementById("customerCount").innerText = d.count;
}

async function forceReset(customerId) {
  if (!confirm("Reset password and force re-registration?")) return;

  const res = await fetch("/api/customers/force-reset", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ customerId })
  });

  if (res.ok) {
    alert("Password cleared. Customer must re-register.");
    loadCustomers();
  }
}

loadCustomers();
loadCustomerCount();
setInterval(() => {
  loadCustomers();
  loadCustomerCount();
}, 5000);