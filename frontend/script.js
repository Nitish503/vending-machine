const API = "";

function buy(item, amount) {
  fetch(${API}/api/pay, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ item, amount })
  })
  .then(res => res.json())
  .then(data => {
    if (data.success) {
      alert("Payment successful");
      loadPayments();
    } else {
      alert("Payment failed");
    }
  });
}

function loadPayments() {
  fetch(`${API}/api/payments`)
    .then(res => res.json())
    .then(data => {
      document.getElementById("output").textContent =
        JSON.stringify(data, null, 2);
    });
}

loadPayments();