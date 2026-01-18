async function loadPayments() {
    try {
        const res = await fetch('/api/payments');

        if (!res.ok) {
            throw new Error('Failed to fetch payments');
        }

        const payments = await res.json();
        const tbody = document.getElementById('payments-body');

        tbody.innerHTML = '';

        payments.forEach(p => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${p.id}</td>
                <td>${p.item}</td>
                <td>₹${p.amount}</td>
                <td>${new Date(p.created_at).toLocaleString()}</td>
            `;
            tbody.appendChild(row);
        });

    } catch (err) {
        console.error('Error loading payments:', err);
    }
}

// Load once when page opens
loadPayments();

// Auto refresh every 5 seconds
setInterval(loadPayments, 5000);