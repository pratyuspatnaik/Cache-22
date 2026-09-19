document.addEventListener('DOMContentLoaded', () => {
    const listNewCropBtn = document.getElementById('listNewCropBtn');
    const newCropForm = document.getElementById('newCropForm');
    const cancelNewCropBtn = document.getElementById('cancelNewCropBtn');

    const trackIncomeBtn = document.getElementById('trackIncomeBtn');
    const incomeTrackerCard = document.getElementById('incomeTrackerCard');
    const cancelIncomeBtn = document.getElementById('cancelIncomeBtn');

    // ---- List New Crop Form Toggle ----
    if (listNewCropBtn && newCropForm) {
        listNewCropBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (newCropForm.style.display === 'flex') {
                newCropForm.style.display = 'none';
            } else {
                newCropForm.style.display = 'flex';
                if (incomeTrackerCard) {
                    incomeTrackerCard.style.display = 'none';
                }
            }
        });

        if (cancelNewCropBtn) {
            cancelNewCropBtn.addEventListener('click', (e) => {
                e.preventDefault();
                newCropForm.style.display = 'none';
            });
        }
    }

    // ---- Track Income Box Toggle ----
    if (trackIncomeBtn && incomeTrackerCard) {
        trackIncomeBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (incomeTrackerCard.style.display === 'flex') {
                incomeTrackerCard.style.display = 'none';
            } else {
                incomeTrackerCard.style.display = 'flex';
                if (newCropForm) {
                    newCropForm.style.display = 'none';
                }
            }
        });

        if (cancelIncomeBtn) {
            cancelIncomeBtn.addEventListener('click', (e) => {
                e.preventDefault();
                incomeTrackerCard.style.display = 'none';
            });
        }
    }

    // ---- SPA Tab Switching Logic ----
    const tabListed = document.getElementById('tabListed');
    const tabOrdered = document.getElementById('tabOrdered');
    const tabDelivered = document.getElementById('tabDelivered');
    
    const listedCropsView = document.getElementById('listedCropsView');
    const orderedCropsView = document.getElementById('orderedCropsView');
    const deliveredCropsView = document.getElementById('deliveredCropsView');

    // Classes for active/inactive tabs
    const activeTabClasses = ['border-b-2', 'border-primary', 'text-primary', 'font-bold'];
    const inactiveTabClasses = ['border-b-2', 'border-transparent', 'text-muted-foreground', 'hover:text-foreground', 'font-medium'];
    
    // Classes for badges
    const activeBadgeClasses = ['bg-primary/10', 'text-primary-foreground'];
    const inactiveBadgeClasses = ['bg-muted', 'text-muted-foreground'];

    function updateTabStyles(activeTab, inactiveTabs) {
        activeTab.classList.remove(...inactiveTabClasses);
        activeTab.classList.add(...activeTabClasses);

        const activeBadge = activeTab.querySelector('span');
        if (activeBadge) {
            activeBadge.classList.remove(...inactiveBadgeClasses);
            activeBadge.classList.add(...activeBadgeClasses);
        }

        inactiveTabs.forEach(inactiveTab => {
            inactiveTab.classList.remove(...activeTabClasses);
            inactiveTab.classList.add(...inactiveTabClasses);
            
            const inactiveBadge = inactiveTab.querySelector('span');
            if (inactiveBadge) {
                inactiveBadge.classList.remove(...activeBadgeClasses);
                inactiveBadge.classList.add(...inactiveBadgeClasses);
            }
        });
    }

    if (tabListed && tabOrdered && tabDelivered) {
        tabListed.addEventListener('click', (e) => {
            e.preventDefault();
            listedCropsView.style.display = 'block';
            orderedCropsView.style.display = 'none';
            deliveredCropsView.style.display = 'none';
            updateTabStyles(tabListed, [tabOrdered, tabDelivered]);
        });

        tabOrdered.addEventListener('click', (e) => {
            e.preventDefault();
            listedCropsView.style.display = 'none';
            orderedCropsView.style.display = 'block';
            deliveredCropsView.style.display = 'none';
            updateTabStyles(tabOrdered, [tabListed, tabDelivered]);
        });

        tabDelivered.addEventListener('click', (e) => {
            e.preventDefault();
            listedCropsView.style.display = 'none';
            orderedCropsView.style.display = 'none';
            deliveredCropsView.style.display = 'block';
            updateTabStyles(tabDelivered, [tabListed, tabOrdered]);
        });
    }
    
    // ---- Buyer Offers Accordion Toggle ----
    const buyerOfferToggles = document.querySelectorAll('.buyer-offers-toggle');
    buyerOfferToggles.forEach(toggle => {
        toggle.addEventListener('click', function() {
            const container = this.closest('.buyer-offers-container');
            const list = container.querySelector('.buyer-offers-list');
            const chevron = this.querySelector('iconify-icon[icon="lucide:chevron-down"]');
            
            list.classList.toggle('hidden');
            
            if (list.classList.contains('hidden')) {
                chevron.style.transform = 'rotate(0deg)';
            } else {
                chevron.style.transform = 'rotate(180deg)';
            }
        });
    });
});
