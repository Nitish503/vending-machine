// ==============================
// Fetch Customers
// ==============================
function resetPassword(customerId) {
  if (!confirm("Reset customer password?")) return;

  fetch(`/api/admin/reset-password/${customerId}`, {
    method: "POST"
  })
  .then(res => res.json())
  .then(() => {
    alert("Password reset");
    location.reload();
  });
}
// new
fetch("/api/customers")
  .then(res => res.json())
  .then(data => {
    const list = document.getElementById("customers");
    list.innerHTML = "";

    data.forEach(c => {
      const li = document.createElement("li");
      li.textContent = `${c.name} - ${c.mobile}`;
      list.appendChild(li);
    });
  })
  .catch(err => {
    console.error("Error loading customers:", err);
  });


// ==============================
// Fetch Payments
// ==============================
fetch("/api/payments")
  .then(res => res.json())
  .then(data => {
    const list = document.getElementById("payments");
    list.innerHTML = "";

    data.forEach(p => {
      const li = document.createElement("li");
      li.textContent = `${p.item} - ₹${p.amount} (${p.status})`;
      list.appendChild(li);
    });
  })
  .catch(err => {
    console.error("Error loading payments:", err);
  });