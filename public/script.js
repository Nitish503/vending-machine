function buyItem(item, amount) {
  const customer_id = parseInt(localStorage.getItem("customer_id"));

  if (!customer_id) {
    alert("Login again");
    window.location.href = "/customer-login";
    return;
  }

  fetch("/api/pay", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      customer_id,
      item,
      amount
    })
  })
    .then(res => res.json())
    .then(data => {
      if (data.error) {
        alert("Payment failed");
      } else {
        alert("Purchase successful");
      }
    })
    .catch(err => {
      console.error(err);
      alert("Server error");
    });
}