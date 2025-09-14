document.addEventListener('DOMContentLoaded', () => {
    // This script can be used on both index.html and dashboard.html
    // It will only act on the elements it finds.
    const calculatorForm = document.getElementById('calculator-form');
    
    if (calculatorForm) {
        const taxDueInput = calculatorForm.querySelector('#tax-due');
        const investmentPotentialResult = document.getElementById('investment-potential-result');
        const potentialValueSpan = document.getElementById('potential-value'); // For dashboard page

        // Function to format currency
        const formatCurrency = (value) => {
            return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        };

        // Calculator functionality
        calculatorForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const rawValue = taxDueInput.value.replace(/\D/g, '');
            const taxDue = parseFloat(rawValue) / 100;

            if (isNaN(taxDue) || taxDue <= 0) {
                alert('Por favor, insira um valor válido.');
                return;
            }

            const investmentPotential = taxDue * 0.06;

            if (investmentPotentialResult) {
                investmentPotentialResult.textContent = formatCurrency(investmentPotential);
            }
            if (potentialValueSpan) {
                potentialValueSpan.textContent = formatCurrency(investmentPotential);
            }
        });

        // Input mask for currency
        taxDueInput.addEventListener('input', (e) => {
            let value = e.target.value.replace(/\D/g, '');
            value = (parseInt(value, 10) / 100).toLocaleString('pt-BR', {
                minimumFractionDigits: 2
            });
            if (value === 'NaN') {
                e.target.value = '';
            } else {
                e.target.value = 'R$ ' + value;
            }
        });
    }
});
