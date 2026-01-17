async function makePayment(item, amount) {
  try {
    const res = await fetch("/api/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ item, amount })
    });

    if (!res.ok) throw new Error("Request failed");

    alert(`Payment successful for ${item}`);
    loadPayments();
  } catch (err) {
    console.error(err);
    alert("Payment failed");
  }
}

function buyChips() {
  makePayment("Chips", 20);
}

function buyColdDrink() {
  makePayment("Cold Drink", 40);
}

async function loadPayments() {
  try {
    const res = await fetch("/api/payments");
    const data = await res.json();
    document.getElementById("output").textContent =
      JSON.stringify(data, null, 2);
  } catch {
    document.getElementById("output").textContent =
      "Failed to load payments";
  }
}