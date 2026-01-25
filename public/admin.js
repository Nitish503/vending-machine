// Fetch customers
fetch("/api/customers")
  .then(res => res.json())
  .then(customers => {
    const list = document.getElementById("customers");
    list.innerHTML = "";

    customers.forEach(c => {
      const li = document.createElement("li");

      li.innerHTML = `
        ${c.name} - ${c.mobile}
        <button onclick="resetPassword(${c.id})">
          Reset Password
        </button>
      `;

      list.appendChild(li);
    });
  });


// Fetch payments
fetch("/api/payments")
  .then(res => res.json())
  .then(payments => {
    const list = document.getElementById("payments");
    list.innerHTML =tr.innerHTML = `
  <td>${p.id}</td>
  <td>${p.name}</td>
  <td>${p.item}</td>
  <td>₹${p.amount}</td>
  <td>${p.address || "Not provided"}</td>
  <td>${new Date(p.created_at).toLocaleString()}</td>
`;

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