async function loadPayments() {
    try {
        const res = await fetch('/api/payments');
        if (!res.ok) throw new Error('Failed to fetch');

        const payments = await res.json();
        const tbody = document.getElementById('payments-body');
        const totalEl = document.getElementById('totalAmount');

        tbody.innerHTML = '';
        let total = 0;

        payments.forEach(p => {
            total += Number(p.amount);

            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${p.id}</td>
                <td>${p.item}</td>
                <td>₹${p.amount}</td>
                <td>${new Date(p.created_at).toLocaleString()}</td>
            `;
            tbody.appendChild(row);
        });

        totalEl.textContent = total;

    } catch (err) {
        console.error('Error loading payments:', err);
    }
}

// Initial load
loadPayments();

// Auto refresh every 5 seconds
setInterval(loadPayments, 5000);