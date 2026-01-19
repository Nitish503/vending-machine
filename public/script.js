function buyItem(item, amount) {
  const customer_id = localStorage.getItem("customer_id");

  if (!customer_id) {
    alert("Login again");
    location.href="/customer-login";
    return;
  }

  fetch("/payment", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ customer_id, item, amount })
  })
  .then(r => r.json())
  .then(() => alert("Purchased"));
}