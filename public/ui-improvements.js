// UI Improvements - Sidebar Toggle, Better UX, Fixed Layouts
(() => {
    'use strict';

    // ===== Sidebar Toggle Functionality =====
    function initSidebarToggle() {
        const rightSidebar = document.getElementById('sidebar-right');
        const toggleBtn = document.getElementById('sidebar-right-toggle');
        const mainContent = document.querySelector('.main-content');

        if (!rightSidebar || !toggleBtn) return;

        // Load saved state from localStorage
        const savedState = localStorage.getItem('rightSidebarCollapsed');
        if (savedState === 'true') {
            rightSidebar.classList.add('collapsed');
            if (mainContent) mainContent.classList.add('sidebar-right-collapsed');
        }

        toggleBtn.addEventListener('click', () => {
            const isCollapsed = rightSidebar.classList.toggle('collapsed');

            if (mainContent) {
                mainContent.classList.toggle('sidebar-right-collapsed', isCollapsed);
            }

            // Update button icon
            const icon = toggleBtn.querySelector('i');
            if (icon) {
                icon.className = isCollapsed ? 'fas fa-chevron-left' : 'fas fa-chevron-right';
            }

            // Update title
            toggleBtn.title = isCollapsed ? 'Розгорнути' : 'Згорнути';

            // Save state
            localStorage.setItem('rightSidebarCollapsed', isCollapsed);

            // Trigger resize event for charts/graphs
            window.dispatchEvent(new Event('resize'));
        });
    }

    // ===== Fix Onboarding Modal Display =====
    function fixOnboardingModal() {
        const modal = document.getElementById('onboarding-modal');
        if (!modal) return;

        // Ensure modal is properly positioned
        modal.style.position = 'fixed';
        modal.style.top = '0';
        modal.style.left = '0';
        modal.style.width = '100%';
        modal.style.height = '100%';
        modal.style.zIndex = '1000';
        modal.style.display = 'none'; // Hidden by default

        // Add backdrop if not exists
        let backdrop = document.querySelector('.modal-backdrop');
        if (!backdrop) {
            backdrop = document.createElement('div');
            backdrop.className = 'modal-backdrop';
            backdrop.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.8);
                z-index: 999;
                display: none;
            `;
            document.body.appendChild(backdrop);
        }

        // Show/hide functions
        window.showOnboardingModal = () => {
            modal.style.display = 'flex';
            backdrop.style.display = 'block';
            document.body.style.overflow = 'hidden';
        };

        window.hideOnboardingModal = () => {
            modal.style.display = 'none';
            backdrop.style.display = 'none';
            document.body.style.overflow = '';
        };

        // Close on backdrop click
        backdrop.addEventListener('click', () => {
            window.hideOnboardingModal();
        });

        // Close on ESC key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal.style.display === 'flex') {
                window.hideOnboardingModal();
            }
        });
    }

    // ===== Fix Bottom Content Overlap =====
    function fixBottomContentLayout() {
        // Remove any fixed positioning from bottom elements
        const bottomElements = document.querySelectorAll('.bottom-stats, .footer-content, .stats-footer');
        bottomElements.forEach(el => {
            el.style.position = 'relative';
            el.style.bottom = 'auto';
            el.style.left = 'auto';
            el.style.right = 'auto';
            el.style.marginTop = '40px';
        });

        // Ensure main content has proper padding
        const mainContent = document.querySelector('.main-content');
        if (mainContent) {
            mainContent.style.paddingBottom = '80px';
        }

        // Fix any absolutely positioned elements in analysis dashboard
        const analysisDashboard = document.getElementById('analysis-dashboard');
        if (analysisDashboard) {
            const absoluteElements = analysisDashboard.querySelectorAll('[style*="position: absolute"]');
            absoluteElements.forEach(el => {
                if (el.classList.contains('should-be-absolute')) return; // Skip intentional absolute elements
                el.style.position = 'relative';
            });
        }
    }

    // ===== Improve Button Interactions =====
    function improveButtonInteractions() {
        // Add ripple effect to all buttons
        document.querySelectorAll('button, .btn, .btn-primary, .btn-secondary, .btn-tertiary').forEach(button => {
            button.addEventListener('click', function(e) {
                const ripple = document.createElement('span');
                const rect = this.getBoundingClientRect();
                const size = Math.max(rect.width, rect.height);
                const x = e.clientX - rect.left - size / 2;
                const y = e.clientY - rect.top - size / 2;

                ripple.style.cssText = `
                    position: absolute;
                    width: ${size}px;
                    height: ${size}px;
                    border-radius: 50%;
                    background: rgba(255, 255, 255, 0.3);
                    left: ${x}px;
                    top: ${y}px;
                    pointer-events: none;
                    animation: ripple-animation 0.6s ease-out;
                `;

                this.style.position = this.style.position || 'relative';
                this.style.overflow = 'hidden';
                this.appendChild(ripple);

                setTimeout(() => ripple.remove(), 600);
            });
        });

        // Add CSS for ripple animation if not exists
        if (!document.getElementById('ripple-animation-style')) {
            const style = document.createElement('style');
            style.id = 'ripple-animation-style';
            style.textContent = `
                @keyframes ripple-animation {
                    to {
                        transform: scale(4);
                        opacity: 0;
                    }
                }
            `;
            document.head.appendChild(style);
        }

        // Prevent double-click issues
        document.querySelectorAll('button').forEach(button => {
            let clicking = false;
            button.addEventListener('click', function(e) {
                if (clicking) {
                    e.preventDefault();
                    e.stopPropagation();
                    return false;
                }
                clicking = true;
                setTimeout(() => clicking = false, 300);
            });
        });
    }

    // ===== Smooth Scroll to Sections =====
    function initSmoothScrolling() {
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function(e) {
                const href = this.getAttribute('href');
                if (href === '#') return;

                e.preventDefault();
                const target = document.querySelector(href);
                if (target) {
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            });
        });
    }

    // ===== Loading State Management =====
    function improveLoadingStates() {
        // Add global loading overlay
        if (!document.getElementById('global-loader')) {
            const loader = document.createElement('div');
            loader.id = 'global-loader';
            loader.innerHTML = `
                <div class="loader-content">
                    <div class="loader-spinner"></div>
                    <p class="loader-text">Завантаження...</p>
                </div>
            `;
            loader.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(30, 27, 75, 0.95);
                display: none;
                align-items: center;
                justify-content: center;
                z-index: 9999;
            `;
            document.body.appendChild(loader);

            // Add loader styles
            const loaderStyle = document.createElement('style');
            loaderStyle.textContent = `
                .loader-content {
                    text-align: center;
                }
                .loader-spinner {
                    width: 60px;
                    height: 60px;
                    margin: 0 auto 20px;
                    border: 4px solid rgba(168, 85, 247, 0.2);
                    border-top-color: #a855f7;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                }
                .loader-text {
                    color: #e0e7ff;
                    font-size: 16px;
                }
            `;
            document.head.appendChild(loaderStyle);
        }

        // Global loading functions
        window.showGlobalLoader = (text = 'Завантаження...') => {
            const loader = document.getElementById('global-loader');
            if (loader) {
                loader.querySelector('.loader-text').textContent = text;
                loader.style.display = 'flex';
            }
        };

        window.hideGlobalLoader = () => {
            const loader = document.getElementById('global-loader');
            if (loader) {
                loader.style.display = 'none';
            }
        };
    }

    // ===== Notification System Improvement =====
    function improveNotifications() {
        // Create notification container if not exists
        if (!document.getElementById('notification-container')) {
            const container = document.createElement('div');
            container.id = 'notification-container';
            container.style.cssText = `
                position: fixed;
                top: 80px;
                right: 20px;
                z-index: 10000;
                display: flex;
                flex-direction: column;
                gap: 12px;
                max-width: 400px;
            `;
            document.body.appendChild(container);
        }

        // Enhanced notification function
        window.showNotification = (message, type = 'info', duration = 5000) => {
            const container = document.getElementById('notification-container');
            if (!container) return;

            const notification = document.createElement('div');
            notification.className = `notification notification-${type}`;

            const icons = {
                success: 'fa-check-circle',
                error: 'fa-exclamation-circle',
                warning: 'fa-exclamation-triangle',
                info: 'fa-info-circle'
            };

            const colors = {
                success: '#22c55e',
                error: '#ef4444',
                warning: '#eab308',
                info: '#3b82f6'
            };

            notification.innerHTML = `
                <i class="fas ${icons[type] || icons.info}"></i>
                <span>${message}</span>
                <button class="notification-close"><i class="fas fa-times"></i></button>
            `;

            notification.style.cssText = `
                background: linear-gradient(135deg, rgba(30, 27, 75, 0.95) 0%, rgba(49, 46, 129, 0.95) 100%);
                border-left: 4px solid ${colors[type] || colors.info};
                border-radius: 8px;
                padding: 16px;
                display: flex;
                align-items: center;
                gap: 12px;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
                animation: slideInRight 0.3s ease-out;
                color: #e0e7ff;
            `;

            container.appendChild(notification);

            // Close button
            notification.querySelector('.notification-close').addEventListener('click', () => {
                notification.style.animation = 'slideOutRight 0.3s ease-out';
                setTimeout(() => notification.remove(), 300);
            });

            // Auto remove
            if (duration > 0) {
                setTimeout(() => {
                    notification.style.animation = 'slideOutRight 0.3s ease-out';
                    setTimeout(() => notification.remove(), 300);
                }, duration);
            }

            // Add animation styles if not exists
            if (!document.getElementById('notification-animations')) {
                const style = document.createElement('style');
                style.id = 'notification-animations';
                style.textContent = `
                    @keyframes slideInRight {
                        from {
                            transform: translateX(400px);
                            opacity: 0;
                        }
                        to {
                            transform: translateX(0);
                            opacity: 1;
                        }
                    }
                    @keyframes slideOutRight {
                        from {
                            transform: translateX(0);
                            opacity: 1;
                        }
                        to {
                            transform: translateX(400px);
                            opacity: 0;
                        }
                    }
                    .notification-close {
                        background: none;
                        border: none;
                        color: #94a3b8;
                        cursor: pointer;
                        padding: 4px;
                        margin-left: auto;
                        transition: color 0.2s;
                    }
                    .notification-close:hover {
                        color: #e0e7ff;
                    }
                `;
                document.head.appendChild(style);
            }
        };
    }

    // ===== Initialize Everything =====
    function init() {
        console.log('🎨 Initializing UI improvements...');

        initSidebarToggle();
        fixOnboardingModal();
        fixBottomContentLayout();
        improveButtonInteractions();
        initSmoothScrolling();
        improveLoadingStates();
        improveNotifications();

        console.log('✅ UI improvements loaded successfully');
    }

    // Run on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Re-apply fixes on dynamic content changes
    const observer = new MutationObserver(() => {
        fixBottomContentLayout();
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

})();
