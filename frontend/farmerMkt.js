document.addEventListener('DOMContentLoaded', () => {
    // ---- List New Crop Form Toggle ----
    const listNewCropBtn = document.getElementById('listNewCropBtn');
    const newCropForm = document.getElementById('newCropForm');
    const cancelNewCropBtn = document.getElementById('cancelNewCropBtn');

    if (listNewCropBtn && newCropForm && cancelNewCropBtn) {
        listNewCropBtn.addEventListener('click', (e) => {
            e.preventDefault();
            newCropForm.style.display = 'flex';
        });

        cancelNewCropBtn.addEventListener('click', (e) => {
            e.preventDefault();
            newCropForm.style.display = 'none';
        });
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
        // Remove old classes and add new ones for the active tab
        activeTab.classList.remove(...inactiveTabClasses);
        activeTab.classList.add(...activeTabClasses);

        const activeBadge = activeTab.querySelector('span');
        if (activeBadge) {
            activeBadge.classList.remove(...inactiveBadgeClasses);
            activeBadge.classList.add(...activeBadgeClasses);
        }

        // Reset inactive tabs
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
});
