function buy(item, amount) {
  fetch("/api/pay", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ item, amount })
  })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        alert("Payment successful ✅");
      } else {
        alert("Payment failed ❌");
      }
    })
    .catch(() => alert("Payment failed ❌"));
}