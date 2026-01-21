function buyItem(item, amount) {
  const customer_id = localStorage.getItem("customer_id");

  // Login check
  if (!customer_id) {
    alert("Please login first");
    window.location.href = "/customer-login.html";
    return;
  }

  fetch("/api/payments", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      customer_id: Number(customer_id),
      item: item,
      amount: amount
    })
  })
    .then(res => {
      if (!res.ok) {
        throw new Error("Payment request failed");
      }
      return res.json();
    })
    .then(data => {
      alert("Payment successful!");
      console.log("Payment saved:", data);
    })
    .catch(err => {
      console.error(err);
      alert("Payment failed");
    });
}