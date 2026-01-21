// Fetch customers
fetch("/api/customers")
  .then(res => res.json())
  .then(customers => {
    const list = document.getElementById("customers");
    list.innerHTML = "";

    customers.forEach(c => {
      const li = document.createElement("li");

      if (c.password === null) {
        li.innerHTML = `
          ${c.name} - ${c.mobile}
          <strong style="color:red;">[RE-REGISTER REQUIRED]</strong>
          <button disabled>Reset</button>
        `;
      } else {
        li.innerHTML = `
          ${c.name} - ${c.mobile}
          <strong style="color:green;">[ACTIVE]</strong>
          <button onclick="resetPassword(${c.id})">Reset</button>
        `;
      }

      list.appendChild(li);
    });
  });


// Fetch payments
fetch("/api/payments")
  .then(res => res.json())
  .then(payments => {
    const list = document.getElementById("payments");
    list.innerHTML = "";

    payments.forEach(p => {
      const li = document.createElement("li");
      li.textContent = `${p.item} - ₹${p.amount}`;
      list.appendChild(li);
    });
  });


// Reset password function
function resetPassword(customerId) {
  if (!confirm("Reset this customer's password?")) return;

  fetch(`/api/admin/reset-password/${customerId}`, {
    method: "POST"
  })
    .then(res => res.json())
    .then(() => {
      alert("Password reset successfully");
      location.reload();
    });
}