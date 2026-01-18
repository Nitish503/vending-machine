function buy(item, amount) {
  fetch("/buy", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ item, amount }),
  })
    .then(res => res.json())
    .then(() => alert("✅ Payment Successful"));
}