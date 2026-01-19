fetch("/admin-data")
.then(r => r.json())
.then(d => {
  document.getElementById("customers").innerHTML =
    d.customers.map(c =>
      `${c.name} (${c.mobile})
       <form method="POST" action="/reset-customer">
         <input type="hidden" name="id" value="${c.id}">
         <button>Reset</button>
       </form><br>`
    ).join("");

  document.getElementById("payments").innerHTML =
    d.payments.map(p =>
      `${p.name} bought ${p.item} ₹${p.amount}<br>`
    ).join("");
});