// Enhanced Onboarding Modal JavaScript
(() => {
    'use strict';

    let currentStep = 1;
    const totalSteps = 5;

    // Initialize onboarding modal
    function initOnboardingModal() {
        console.log('🎯 Initializing enhanced onboarding modal...');

        setupEventListeners();
        updateProgress();
        updateNavigation();
    }

    // Setup event listeners
    function setupEventListeners() {
        // Close modal handlers
        const modal = document.getElementById('onboarding-modal');
        const closeBtn = document.getElementById('onboarding-close');

        if (closeBtn) {
            closeBtn.addEventListener('click', closeOnboardingModal);
        }

        // Close on overlay click
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    closeOnboardingModal();
                }
            });
        }

        // Navigation buttons
        const prevBtn = document.getElementById('onboarding-prev');
        const nextBtn = document.getElementById('onboarding-next');

        if (prevBtn) {
            prevBtn.addEventListener('click', () => goToStep(currentStep - 1));
        }

        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                if (currentStep < totalSteps) {
                    goToStep(currentStep + 1);
                } else {
                    finishOnboarding();
                }
            });
        }

        // Dot navigation
        const dots = document.querySelectorAll('#onboarding-dots .dot');
        dots.forEach((dot, index) => {
            dot.addEventListener('click', () => goToStep(index + 1));
        });

        // Keyboard navigation
        document.addEventListener('keydown', handleKeyboardNavigation);

        // Action buttons
        setupActionButtons();
    }

    // Setup action buttons in final step
    function setupActionButtons() {
        // Create client button
        const createClientBtn = document.querySelector('[onclick="startOnboarding()"]');
        if (createClientBtn) {
            createClientBtn.addEventListener('click', (e) => {
                e.preventDefault();
                closeOnboardingModal();
                if (window.showClientForm) {
                    window.showClientForm();
                } else {
                    // Fallback: trigger client form
                    const newClientBtn = document.getElementById('welcome-new-client');
                    if (newClientBtn) {
                        newClientBtn.click();
                    }
                }
            });
        }

        // Demo button
        const demoBtn = document.querySelector('[onclick="showDemo()"]');
        if (demoBtn) {
            demoBtn.addEventListener('click', (e) => {
                e.preventDefault();
                closeOnboardingModal();
                showDemoAnalysis();
            });
        }
    }

    // Handle keyboard navigation
    function handleKeyboardNavigation(e) {
        const modal = document.getElementById('onboarding-modal');
        if (!modal || modal.style.display === 'none') return;

        switch (e.key) {
            case 'Escape':
                closeOnboardingModal();
                break;
            case 'ArrowLeft':
                if (currentStep > 1) {
                    goToStep(currentStep - 1);
                }
                break;
            case 'ArrowRight':
                if (currentStep < totalSteps) {
                    goToStep(currentStep + 1);
                }
                break;
            case 'Enter':
                if (currentStep < totalSteps) {
                    goToStep(currentStep + 1);
                } else {
                    finishOnboarding();
                }
                break;
        }
    }

    // Go to specific step
    function goToStep(step) {
        if (step < 1 || step > totalSteps) return;

        // Hide current step
        const currentStepEl = document.getElementById(`onboarding-step-${currentStep}`);
        if (currentStepEl) {
            currentStepEl.classList.remove('active');
        }

        // Update current step
        currentStep = step;

        // Show new step
        const newStepEl = document.getElementById(`onboarding-step-${currentStep}`);
        if (newStepEl) {
            newStepEl.classList.add('active');
        }

        // Update UI
        updateProgress();
        updateNavigation();
        updateDots();

        // Scroll to top of modal body
        const modalBody = document.querySelector('.modal-body');
        if (modalBody) {
            modalBody.scrollTop = 0;
        }

        // Add step-specific animations
        animateStepTransition();
    }

    // Update progress bar
    function updateProgress() {
        const progressFill = document.getElementById('onboarding-progress');
        const progressText = document.getElementById('onboarding-progress-text');

        if (progressFill) {
            const percentage = (currentStep / totalSteps) * 100;
            progressFill.style.width = `${percentage}%`;
        }

        if (progressText) {
            progressText.textContent = `Крок ${currentStep} з ${totalSteps}`;
        }
    }

    // Update navigation buttons
    function updateNavigation() {
        const prevBtn = document.getElementById('onboarding-prev');
        const nextBtn = document.getElementById('onboarding-next');

        if (prevBtn) {
            prevBtn.style.display = currentStep === 1 ? 'none' : 'flex';
            prevBtn.disabled = currentStep === 1;
        }

        if (nextBtn) {
            if (currentStep === totalSteps) {
                nextBtn.innerHTML = '<i class="fas fa-check"></i> Завершити';
                nextBtn.className = 'btn-primary';
            } else {
                nextBtn.innerHTML = 'Далі <i class="fas fa-chevron-right"></i>';
                nextBtn.className = 'btn-primary';
            }
        }
    }

    // Update step dots
    function updateDots() {
        const dots = document.querySelectorAll('#onboarding-dots .dot');
        dots.forEach((dot, index) => {
            if (index + 1 === currentStep) {
                dot.classList.add('active');
            } else {
                dot.classList.remove('active');
            }
        });
    }

    // Animate step transition
    function animateStepTransition() {
        const activeStep = document.querySelector('.onboarding-step.active');
        if (activeStep) {
            activeStep.style.opacity = '0';
            activeStep.style.transform = 'translateY(20px)';

            setTimeout(() => {
                activeStep.style.opacity = '1';
                activeStep.style.transform = 'translateY(0)';
            }, 50);
        }
    }

    // Show onboarding modal
    function showOnboardingModal() {
        const modal = document.getElementById('onboarding-modal');
        if (!modal) {
            console.error('Onboarding modal not found');
            return;
        }

        // Reset to first step
        currentStep = 1;

        // Hide all steps first
        const steps = document.querySelectorAll('.onboarding-step');
        steps.forEach(step => step.classList.remove('active'));

        // Show first step
        const firstStep = document.getElementById('onboarding-step-1');
        if (firstStep) {
            firstStep.classList.add('active');
        }

        // Update UI
        updateProgress();
        updateNavigation();
        updateDots();

        // Show modal with animation
        modal.style.display = 'flex';
        modal.style.opacity = '0';

        requestAnimationFrame(() => {
            modal.style.transition = 'opacity 0.3s ease';
            modal.style.opacity = '1';
        });

        // Prevent body scroll
        document.body.style.overflow = 'hidden';

        // Focus management
        const firstFocusable = modal.querySelector('button, [tabindex]');
        if (firstFocusable) {
            firstFocusable.focus();
        }
    }

    // Close onboarding modal
    function closeOnboardingModal() {
        const modal = document.getElementById('onboarding-modal');
        if (!modal) return;

        // Animate out
        modal.style.transition = 'opacity 0.3s ease';
        modal.style.opacity = '0';

        setTimeout(() => {
            modal.style.display = 'none';
            document.body.style.overflow = '';
        }, 300);

        // Remove keyboard listener
        document.removeEventListener('keydown', handleKeyboardNavigation);

        // Mark onboarding as completed
        localStorage.setItem('teampulse-onboarding-completed', 'true');
    }

    // Finish onboarding
    function finishOnboarding() {
        closeOnboardingModal();

        // Show success notification
        if (window.showNotification) {
            window.showNotification('Онбординг завершено! Готові до роботи 🚀', 'success');
        }

        // Trigger welcome actions
        setTimeout(() => {
            const welcomeNewClientBtn = document.getElementById('welcome-new-client');
            if (welcomeNewClientBtn) {
                welcomeNewClientBtn.scrollIntoView({ behavior: 'smooth' });
            }
        }, 500);
    }

    // Show demo analysis
    function showDemoAnalysis() {
        // Sample negotiation text for demo
        const demoText = `Переговори щодо постачання обладнання

Клієнт: Добрий день. Ми розглядаємо можливість закупівлі вашого обладнання.

Постачальник: Вітаю! Це відмінна можливість. У нас зараз спеціальна пропозиція - знижка 15%, але тільки до кінця тижня.

Клієнт: Цікаво. А які умови оплати?

Постачальник: Звичайно, ми працюємо з передоплатою 100%. Всі наші клієнти так роблять, це стандартна практика в галузі.

Клієнт: Хм, а чи можна розглянути часткову оплату?

Постачальник: Розумію ваші побоювання, але якщо ви не скористаєтесь цією пропозицією зараз, наступний раз така ціна буде недоступна. Конкуренти наші клієнти не чекають.`;

        // Fill the text area if it exists
        const textArea = document.getElementById('negotiation-text');
        if (textArea) {
            textArea.value = demoText;

            // Trigger text stats update
            if (window.updateTextStats) {
                window.updateTextStats();
            }

            // Enable analysis button
            const analysisBtn = document.getElementById('start-analysis-btn');
            if (analysisBtn) {
                analysisBtn.disabled = false;
            }

            // Switch to analysis view
            const analysisView = document.getElementById('analysis-dashboard');
            if (analysisView) {
                // Trigger view switch if available
                const productItem = document.querySelector('[data-target="analysis-dashboard"]');
                if (productItem) {
                    productItem.click();
                }
            }
        }

        // Show notification
        if (window.showNotification) {
            window.showNotification('Демо-текст завантажено! Натисніть "Розпочати аналіз"', 'info');
        }
    }

    // Check if onboarding should be shown
    function shouldShowOnboarding() {
        const completed = localStorage.getItem('teampulse-onboarding-completed');
        const hasClients = window.state?.clients?.length > 0;
        return !completed && !hasClients;
    }

    // Auto-show onboarding for new users
    function autoShowOnboarding() {
        if (shouldShowOnboarding()) {
            setTimeout(() => {
                showOnboardingModal();
            }, 1000); // Delay to ensure UI is ready
        }
    }

    // Global functions
    window.showOnboardingModal = showOnboardingModal;
    window.closeOnboardingModal = closeOnboardingModal;
    window.startOnboarding = () => {
        closeOnboardingModal();
        if (window.showClientForm) {
            window.showClientForm();
        }
    };
    window.showDemo = showDemoAnalysis;

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initOnboardingModal);
    } else {
        initOnboardingModal();
    }

    // Auto-show for new users
    window.addEventListener('load', autoShowOnboarding);

    console.log('✨ Enhanced onboarding modal ready');

})();