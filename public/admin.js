async function loadPayments(){
  const data = await fetch("/api/payments").then(r=>r.json());
  payments.innerHTML =
    "<tr><th>ID</th><th>Item</th><th>Amount</th><th>Time</th></tr>" +
    data.map(p=>`<tr>
      <td>${p.id}</td>
      <td>${p.item}</td>
      <td>₹${p.amount}</td>
      <td>${new Date(p.created_at).toLocaleString()}</td>
    </tr>`).join("");
}

async function loadCustomers(){
  const data = await fetch("/api/customers").then(r=>r.json());
  customers.innerHTML =
    "<tr><th>ID</th><th>Name</th><th>Mobile</th><th>Password</th><th>Reset</th></tr>" +
    data.map(c=>`<tr>
      <td>${c.id}</td>
      <td>${c.name}</td>
      <td>${c.mobile}</td>
      <td>${c.password ?? "RESET REQUIRED"}</td>
      <td><button onclick="reset(${c.id})">Reset</button></td>
    </tr>`).join("");
}

async function reset(id){
  await fetch("/api/reset-password",{
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body:JSON.stringify({customerId:id})
  });
  loadCustomers();
}

loadPayments();
loadCustomers();
setInterval(loadPayments,5000);