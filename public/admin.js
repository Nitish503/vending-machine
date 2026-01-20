// Fetch customers
fetch("/api/customers")
  .then(res => res.json())
  .then(data => {
    const list = document.getElementById("customers");
    data.forEach(c => {
      const li = document.createElement("li");
      li.textContent = `${c.name} - ${c.email}`;
      list.appendChild(li);
    });
  });

// Fetch payments
fetch("/api/payments")
  .then(res => res.json())
  .then(data => {
    const list = document.getElementById("payments");
    data.forEach(p => {
      const li = document.createElement("li");
      li.textContent = `${p.amount} - ${p.status}`;
      list.appendChild(li);
    });
  });