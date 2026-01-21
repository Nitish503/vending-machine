async function loadCustomers() {
  const res = await fetch("/api/customers");
  const customers = await res.json();

  const list = document.getElementById("customers");
  list.innerHTML = "";

  customers.forEach(c => {
    const li = document.createElement("li");

    const isActive = c.password !== null;

    li.innerHTML = `
      ${c.name} - ${c.mobile}
      <strong style="color:${isActive ? "green" : "red"}">
        [${isActive ? "ACTIVE" : "RESET REQUIRED"}]
      </strong>
      <button
        onclick="resetPassword(${c.id})"
        ${!isActive ? "disabled" : ""}
      >
        Reset
      </button>
    `;

    list.appendChild(li);
  });
}

async function resetPassword(customerId) {
  if (!confirm("Reset password for this customer?")) return;

  await fetch(`/api/reset-password/${customerId}`, {
    method: "POST"
  });

  alert("Password reset successfully");

  // 🔴 THIS WAS MISSING BEFORE
  loadCustomers(); // refresh UI
}

// initial load
loadCustomers();