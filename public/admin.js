async function loadCustomers() {
  const res = await fetch("/api/customers");
  const customers = await res.json();

  const table = document.getElementById("customers");
  table.innerHTML = "";

  customers.forEach(c => {
    table.innerHTML += `
      <tr>
        <td>${c.id}</td>
        <td>${c.name}</td>
        <td>${c.mobile}</td>
        <td>${c.password ?? "RESET REQUIRED"}</td>
        <td>
          <button onclick="reset(${c.id})">Reset</button>
        </td>
      </tr>`;
  });
}

async function reset(id) {
  if (!confirm("Reset this customer's password?")) return;
  await fetch(`/api/reset-customer/${id}`, { method: "POST" });
  loadCustomers();
}

loadCustomers();
setInterval(loadCustomers, 5000);