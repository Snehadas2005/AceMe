// AceMe Frontend JavaScript
// Enhanced with 3D animations and interactive features

document.addEventListener('DOMContentLoaded', function() {
    
    // Initialize all components
    initNavigation();
    
    initScrollAnimations();
    init3DEffects();
    initParallax();
    initSmoothScrolling();
    
    console.log('AceMe Frontend Loaded Successfully! 🚀');
});

// Navigation functionality
function initNavigation() {
    const nav = document.querySelector('.nav');
    const navLinks = document.querySelectorAll('nav a');
    
    // Add active states to navigation links
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            if (href.startsWith('#')) {
                e.preventDefault();
                const target = document.querySelector(href);
                if (target) {
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            }
        });
        
        // Add hover effects
        link.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-2px) rotateX(10deg)';
        });
        
        link.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0) rotateX(0)';
        });
    });
    
    // Sticky header background change
    window.addEventListener('scroll', function() {
        const header = document.querySelector('header');
        if (window.scrollY > 100) {
            header.style.background = 'rgba(255, 255, 255, 0.98)';
            header.style.boxShadow = '0 2px 20px rgba(0, 0, 0, 0.1)';
        } else {
            header.style.background = 'rgba(255, 255, 255, 0.95)';
            header.style.boxShadow = 'none';
        }
    });
}

function initScrollAnimations() {
    // Add your scroll-triggered animation logic here
    console.log('Scroll animations initialized');
}

function init3DEffects() {
    // Add your 3D hover / depth effects here
    console.log('3D effects initialized');
}

function initParallax() {
    // Add parallax background logic here
    console.log('Parallax effect initialized');
}

function initSmoothScrolling() {
    // Add additional smooth scrolling logic here (if needed)
    console.log('Smooth scrolling initialized');
}
