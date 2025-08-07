document.addEventListener('DOMContentLoaded', function() {
    // Theme toggle functionality
    const themeToggle = document.getElementById('themeToggle');
    themeToggle.addEventListener('click', toggleTheme);

    // Check for saved theme preference or use preferred color scheme
    if (localStorage.getItem('theme') === 'dark' || 
        (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.documentElement.setAttribute('data-theme', 'dark');
    }

    // Navbar toggle for mobile
    const navToggle = document.querySelector('.nav-toggle');
    const navMenu = document.querySelector('.nav-menu');
    navToggle.addEventListener('click', () => {
        navMenu.classList.toggle('active');
    });

    // Loan type switching
    const loanButtons = document.querySelectorAll('.loan-btn');
    loanButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Remove active class from all buttons and calculators
            loanButtons.forEach(btn => btn.classList.remove('active'));
            document.querySelectorAll('.calculator').forEach(calc => calc.classList.remove('active'));
            
            // Add active class to clicked button
            this.classList.add('active');
            
            // Show corresponding calculator
            const loanType = this.getAttribute('data-loan');
            document.getElementById(`${loanType}-calculator`).classList.add('active');
            
            // Close mobile menu after selection
            navMenu.classList.remove('active');
            
            // Calculate for the active calculator
            calculateEMI(loanType);
        });
    });

    // Initialize all range inputs
    initializeRangeInputs('general');
    initializeRangeInputs('home');
    initializeRangeInputs('car');
    initializeRangeInputs('education');
    initializeRangeInputs('bike');

    // Set up calculate buttons
    document.getElementById('general-calculate').addEventListener('click', () => calculateEMI('general'));
    document.getElementById('home-calculate').addEventListener('click', () => calculateEMI('home'));
    document.getElementById('car-calculate').addEventListener('click', () => calculateEMI('car'));
    document.getElementById('education-calculate').addEventListener('click', () => calculateEMI('education'));
    document.getElementById('bike-calculate').addEventListener('click', () => calculateEMI('bike'));

    // Calculate for the default (general) calculator on load
    setTimeout(() => {
        calculateEMI('general');
    }, 5000); // Delay calculation until after animation
});

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
}

function initializeRangeInputs(loanType) {
    const amountInput = document.getElementById(`${loanType}-amount`);
    const interestInput = document.getElementById(`${loanType}-interest`);
    const tenureInput = document.getElementById(`${loanType}-tenure`);
    
    // For education loan, we have an additional moratorium input
    const moratoriumInput = document.getElementById(`${loanType}-moratorium`);
    
    // Update displayed values when sliders change
    amountInput.addEventListener('input', function() {
        document.getElementById(`${loanType}-amount-value`).textContent = 
            formatCurrency(this.value);
        calculateEMI(loanType);
    });
    
    interestInput.addEventListener('input', function() {
        document.getElementById(`${loanType}-interest-value`).textContent = this.value;
        calculateEMI(loanType);
    });
    
    tenureInput.addEventListener('input', function() {
        document.getElementById(`${loanType}-tenure-value`).textContent = this.value;
        calculateEMI(loanType);
    });
    
    if (moratoriumInput) {
        moratoriumInput.addEventListener('input', function() {
            document.getElementById(`${loanType}-moratorium-value`).textContent = this.value;
            calculateEMI(loanType);
        });
    }
}

function calculateEMI(loanType) {
    const amount = parseFloat(document.getElementById(`${loanType}-amount`).value);
    const interestRate = parseFloat(document.getElementById(`${loanType}-interest`).value);
    const tenureYears = parseInt(document.getElementById(`${loanType}-tenure`).value);
    
    // For education loan, get moratorium period
    let moratoriumMonths = 0;
    if (loanType === 'education') {
        moratoriumMonths = parseInt(document.getElementById(`${loanType}-moratorium`).value);
    }
    
    const monthlyInterestRate = interestRate / 12 / 100;
    const tenureMonths = tenureYears * 12;
    
    // Calculate EMI (standard formula)
    let emi;
    if (loanType === 'education' && moratoriumMonths > 0) {
        // For education loan with moratorium, interest accrues during moratorium
        const principalAfterMoratorium = amount * Math.pow(1 + monthlyInterestRate, moratoriumMonths);
        emi = (principalAfterMoratorium * monthlyInterestRate * Math.pow(1 + monthlyInterestRate, tenureMonths)) / 
              (Math.pow(1 + monthlyInterestRate, tenureMonths) - 1);
    } else {
        emi = (amount * monthlyInterestRate * Math.pow(1 + monthlyInterestRate, tenureMonths)) / 
              (Math.pow(1 + monthlyInterestRate, tenureMonths) - 1);
    }
    
    const totalPayment = emi * tenureMonths;
    const totalInterest = totalPayment - amount;
    
    // Update results
    document.getElementById(`${loanType}-emi`).textContent = `₹${formatCurrency(emi.toFixed(2))}`;
    document.getElementById(`${loanType}-total-interest`).textContent = `₹${formatCurrency(totalInterest.toFixed(2))}`;
    document.getElementById(`${loanType}-total-payment`).textContent = `₹${formatCurrency(totalPayment.toFixed(2))}`;
    
    // Generate payment schedule
    generatePaymentSchedule(loanType, amount, interestRate, tenureYears, emi, moratoriumMonths);
}

function generatePaymentSchedule(loanType, principal, annualRate, years, emi, moratoriumMonths = 0) {
    const monthlyRate = annualRate / 12 / 100;
    const months = years * 12;
    let balance = principal;
    let scheduleHTML = '';
    
    // For education loan with moratorium, interest accrues but no payments
    if (loanType === 'education' && moratoriumMonths > 0) {
        for (let i = 1; i <= moratoriumMonths; i++) {
            const interest = balance * monthlyRate;
            balance += interest;
            
            scheduleHTML += `
                <tr>
                    <td>Moratorium ${i}</td>
                    <td>-</td>
                    <td>${formatCurrency(interest.toFixed(2))}</td>
                    <td>-</td>
                    <td>${formatCurrency(balance.toFixed(2))}</td>
                </tr>
            `;
        }
    }
    
    // Regular payment schedule
    for (let i = 1; i <= months; i++) {
        const interest = balance * monthlyRate;
        const principalPaid = emi - interest;
        balance -= principalPaid;
        
        // Ensure balance doesn't go negative due to rounding
        if (i === months) {
            balance = 0;
        }
        
        scheduleHTML += `
            <tr>
                <td>${i}</td>
                <td>${formatCurrency(emi.toFixed(2))}</td>
                <td>${formatCurrency(interest.toFixed(2))}</td>
                <td>${formatCurrency(principalPaid.toFixed(2))}</td>
                <td>${formatCurrency(Math.max(0, balance).toFixed(2))}</td>
            </tr>
        `;
    }
    
    // Update payment schedule table
    const paymentSchedule = document.getElementById('payment-schedule');
    paymentSchedule.innerHTML = `
        <table>
            <thead>
                <tr>
                    <th>Month</th>
                    <th>Payment</th>
                    <th>Interest</th>
                    <th>Principal</th>
                    <th>Balance</th>
                </tr>
            </thead>
            <tbody>
                ${scheduleHTML}
            </tbody>
        </table>
    `;
}

function formatCurrency(amount) {
    // Convert to number if it's a string
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    
    // Format with commas for thousands
    return num.toLocaleString('en-IN', {
        maximumFractionDigits: 2,
        minimumFractionDigits: 2
    });
}