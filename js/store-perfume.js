// script.js - Sillage Noir Luxury Page Logic

document.addEventListener('DOMContentLoaded', () => {
  initCustomCursor();
  initHeaderScroll();
  initMobileMenu();
  initRevealAnimations();
  initHeroParallax();
  initTiltEffect();
  initScentVisualizer();
  initQuiz();
  initCartDrawer();
  initTestimonialSlider();
  initNewsletterForm();
});

/* ==========================================================================
   Custom Cursor
   ========================================================================== */
function initCustomCursor() {
  const cursor = document.querySelector('.custom-cursor');
  const follower = document.querySelector('.custom-cursor-follower');
  
  if (!cursor || !follower) return;

  let mouseX = 0, mouseY = 0;
  let followerX = 0, followerY = 0;

  document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    
    // Position dot immediately
    cursor.style.left = `${mouseX}px`;
    cursor.style.top = `${mouseY}px`;
  });

  // Smooth lag for the follower circle
  function updateFollower() {
    // 0.15 is the easing factor (smaller = smoother/slower lag)
    followerX += (mouseX - followerX) * 0.15;
    followerY += (mouseY - followerY) * 0.15;
    
    follower.style.left = `${followerX}px`;
    follower.style.top = `${followerY}px`;
    
    requestAnimationFrame(updateFollower);
  }
  updateFollower();

  // Hover states for links and buttons
  const hoverables = document.querySelectorAll('a, button, .note-node, .size-option, .quiz-option-btn, .dot, .slider-nav-btn');
  hoverables.forEach(item => {
    item.addEventListener('mouseenter', () => {
      cursor.style.width = '20px';
      cursor.style.height = '20px';
      cursor.style.backgroundColor = 'rgba(195, 155, 98, 0.4)';
      follower.style.width = '60px';
      follower.style.height = '60px';
      follower.style.borderColor = 'var(--gold-dark)';
    });
    item.addEventListener('mouseleave', () => {
      cursor.style.width = '8px';
      cursor.style.height = '8px';
      cursor.style.backgroundColor = 'var(--gold)';
      follower.style.width = '40px';
      follower.style.height = '40px';
      follower.style.borderColor = 'var(--gold)';
    });
  });
}

/* ==========================================================================
   Header Scroll State
   ========================================================================== */
function initHeaderScroll() {
  const header = document.querySelector('header');
  const storySection = document.querySelector('.story-section');
  
  if (!header) return;

  window.addEventListener('scroll', () => {
    // Background blur toggling
    if (window.scrollY > 50) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }

    // Toggle light-bg header mode when crossing into the light-colored Story Section
    if (storySection) {
      const storyTop = storySection.offsetTop - 30;
      const storyBottom = storyTop + storySection.offsetHeight - 50;
      const scrollPos = window.scrollY;
      
      if (scrollPos >= storyTop && scrollPos < storyBottom) {
        header.classList.add('light-bg');
      } else {
        header.classList.remove('light-bg');
      }
    }
  });
}

/* ==========================================================================
   Mobile Menu Navigation
   ========================================================================== */
function initMobileMenu() {
  const menuToggle = document.getElementById('nav-btn-menu');
  const navMenu = document.getElementById('nav-menu');
  const navLinks = document.querySelectorAll('#nav-menu ul li a');

  if (!menuToggle || !navMenu) return;

  menuToggle.addEventListener('click', () => {
    navMenu.classList.toggle('active');
    
    // Toggle hamburger icon between bars and xmark
    const icon = menuToggle.querySelector('i');
    if (icon) {
      icon.classList.toggle('fa-bars');
      icon.classList.toggle('fa-xmark');
    }
  });

  navLinks.forEach(link => {
    link.addEventListener('click', () => {
      navMenu.classList.remove('active');
      const icon = menuToggle.querySelector('i');
      if (icon) {
        icon.classList.add('fa-bars');
        icon.classList.remove('fa-xmark');
      }
    });
  });
}

/* ==========================================================================
   Intersection Observer for Element Reveals
   ========================================================================== */
function initRevealAnimations() {
  const elements = document.querySelectorAll('.story-content, .story-frame, .showcase-details, .scent-details-card, .quiz-cta-container, .section-intro');
  
  const observerOptions = {
    root: null,
    rootMargin: '0px',
    threshold: 0.15
  };

  const observer = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        // Trigger reveal by adding custom active class and scaling up metrics if present
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'translateY(0)';
        
        // Trigger metric animations inside the details card if visible
        if (entry.target.classList.contains('showcase-details')) {
          animateMetrics();
        }
        
        observer.unobserve(entry.target);
      }
    });
  }, observerOptions);

  elements.forEach(el => {
    // Prep inline styles for smooth scroll reveal
    el.style.opacity = '0';
    el.style.transform = 'translateY(30px)';
    el.style.transition = 'opacity 1s cubic-bezier(0.25, 1, 0.5, 1), transform 1s cubic-bezier(0.25, 1, 0.5, 1)';
    observer.observe(el);
  });
}

function animateMetrics() {
  const bars = document.querySelectorAll('.metric-bar');
  bars.forEach(bar => {
    const targetWidth = bar.getAttribute('data-width');
    setTimeout(() => {
      bar.style.width = targetWidth;
    }, 200);
  });
}

/* ==========================================================================
   Hero Mouse Parallax
   ========================================================================== */
function initHeroParallax() {
  const hero = document.querySelector('.hero');
  const floats = document.querySelectorAll('.floating-element');
  const heroImage = document.querySelector('.hero-main-img');
  
  if (!hero) return;

  hero.addEventListener('mousemove', (e) => {
    const { width, height } = hero.getBoundingClientRect();
    const mouseX = e.clientX - width / 2;
    const mouseY = e.clientY - height / 2;

    // Subtle drift for ambient float tags
    floats.forEach((float, index) => {
      const depth = (index + 1) * 15;
      const moveX = (mouseX / width) * depth;
      const moveY = (mouseY / height) * depth;
      float.style.transform = `translate(${moveX}px, ${moveY}px)`;
    });

    // Opposite drift for hero photo
    if (heroImage) {
      const moveX = -(mouseX / width) * 20;
      const moveY = -(mouseY / height) * 20;
      heroImage.style.transform = `scale(1.1) translate(${moveX}px, ${moveY}px)`;
    }
  });
}

/* ==========================================================================
   3D Tilt Card Effect
   ========================================================================== */
function initTiltEffect() {
  const card = document.querySelector('.tilt-card');
  const glow = document.querySelector('.tilt-card-glow');
  
  if (!card) return;

  card.addEventListener('mousemove', (e) => {
    const cardRect = card.getBoundingClientRect();
    
    // Relative coordinates within card
    const cardX = e.clientX - cardRect.left;
    const cardY = e.clientY - cardRect.top;
    
    // Center point coordinates
    const centerX = cardRect.width / 2;
    const centerY = cardRect.height / 2;
    
    // Tilt calculations (-15 to 15 degrees max)
    const rotateX = ((centerY - cardY) / centerY) * 15;
    const rotateY = ((cardX - centerX) / centerX) * 15;
    
    // Apply 3D rotation properties
    card.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
    
    // Highlight glow tracking cursor
    if (glow) {
      glow.style.left = `${cardX - 150}px`;
      glow.style.top = `${cardY - 150}px`;
    }
  });

  // Reset positioning on mouse leave
  card.addEventListener('mouseleave', () => {
    card.style.transform = 'rotateX(0deg) rotateY(0deg)';
    card.style.transition = 'transform 0.8s cubic-bezier(0.25, 1, 0.5, 1)';
  });
  
  card.addEventListener('mouseenter', () => {
    card.style.transition = 'none'; // Instant tracking while inside
  });
}

/* ==========================================================================
   Scent Notes Visualizer
   ========================================================================== */
function initScentVisualizer() {
  const nodes = document.querySelectorAll('.note-node');
  const detailContents = document.querySelectorAll('.note-details-content');
  const rings = document.querySelectorAll('.scent-ring');
  
  if (nodes.length === 0) return;

  nodes.forEach(node => {
    node.addEventListener('click', () => {
      // Toggle node active state
      nodes.forEach(n => n.classList.remove('active'));
      node.classList.add('active');
      
      const targetNote = node.getAttribute('data-note');
      
      // Update details card info
      detailContents.forEach(content => {
        content.classList.remove('active');
        if (content.getAttribute('id') === `details-${targetNote}`) {
          content.classList.add('active');
        }
      });
      
      // Highlight matching SVG concentric circle
      rings.forEach(ring => {
        ring.classList.remove('active');
        if (ring.getAttribute('data-ring') === targetNote) {
          ring.classList.add('active');
        }
      });
    });
  });
}

/* ==========================================================================
   Fragrance Finder Quiz
   ========================================================================== */
function initQuiz() {
  const quizTriggers = document.querySelectorAll('.btn-trigger-quiz');
  const quizModal = document.querySelector('.quiz-modal');
  const overlay = document.querySelector('.overlay');
  const closeQuizzes = document.querySelectorAll('.close-quiz-btn');
  const quizSteps = document.querySelectorAll('.quiz-step');
  const progress = document.querySelector('.quiz-progress');
  const optionButtons = document.querySelectorAll('.quiz-option-btn');
  
  let currentStep = 1;
  const answers = {
    vibe: '',
    occasion: '',
    intensity: ''
  };

  if (!quizModal) return;

  // Open modal
  const openQuizModal = () => {
    quizModal.classList.add('active');
    overlay.classList.add('active');
    resetQuiz();
  };

  // Close modal
  const closeQuizModal = () => {
    quizModal.classList.remove('active');
    overlay.classList.remove('active');
  };

  quizTriggers.forEach(trigger => trigger.addEventListener('click', openQuizModal));
  closeQuizzes.forEach(closeBtn => closeBtn.addEventListener('click', closeQuizModal));
  overlay.addEventListener('click', closeQuizModal);

  // Selection events
  optionButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const stepEl = btn.closest('.quiz-step');
      const stepIndex = parseInt(stepEl.getAttribute('data-step'));
      const category = stepEl.getAttribute('data-category');
      const value = btn.getAttribute('data-value');
      
      // Select visual toggle
      stepEl.querySelectorAll('.quiz-option-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      
      answers[category] = value;
      
      // Progress forward
      setTimeout(() => {
        goToStep(stepIndex + 1);
      }, 500);
    });
  });

  function goToStep(stepNum) {
    if (stepNum > 3) {
      showResults();
      return;
    }
    
    quizSteps.forEach(step => {
      step.classList.remove('active');
      if (parseInt(step.getAttribute('data-step')) === stepNum) {
        step.classList.add('active');
      }
    });

    currentStep = stepNum;
    progress.style.width = `${(currentStep / 3) * 100}%`;
  }

  function showResults() {
    quizSteps.forEach(s => s.classList.remove('active'));
    document.querySelector('.quiz-step-results').classList.add('active');
    progress.style.width = '100%';
    
    // Custom match percentage based on selections
    let matchPct = 85;
    if (answers.vibe === 'mystique' && answers.occasion === 'evening' && answers.intensity === 'strong') {
      matchPct = 99; // Perfect match for Aura Noire
    } else if (answers.vibe === 'mystique' || answers.intensity === 'strong') {
      matchPct = 94;
    } else if (answers.vibe === 'cozy' || answers.occasion === 'date') {
      matchPct = 89;
    }
    
    document.querySelector('.result-percentage').textContent = `${matchPct}%`;
    
    // Recommendations texts
    const matchLabel = document.querySelector('.result-product');
    const matchDesc = document.querySelector('.result-desc');
    
    if (matchPct >= 94) {
      matchLabel.textContent = "AURA NOIRE (Eau de Parfum)";
      matchDesc.textContent = "A match crafted in shadow and amber. Sillage Noir's signature fits your magnetic presence, elevating your nights with smoked tea, jasmine, and deep bourbon vanilla.";
    } else {
      matchLabel.textContent = "AURA NOIRE (Concentré de Parfum)";
      matchDesc.textContent = "A lighter, yet deeply sophisticated adaptation. Balanced with crisp Calabrian bergamot and pink pepper top notes, fading into velvet rose and cedarwood logs. Perfect for high-contrast daily wear.";
    }
  }

  function resetQuiz() {
    currentStep = 1;
    answers.vibe = '';
    answers.occasion = '';
    answers.intensity = '';
    
    optionButtons.forEach(b => b.classList.remove('selected'));
    
    quizSteps.forEach(s => s.classList.remove('active'));
    document.querySelector('[data-step="1"]').classList.add('active');
    progress.style.width = '33.3%';
  }
  
  // Expose reset to global click inside results
  document.querySelector('.btn-restart-quiz').addEventListener('click', resetQuiz);
}

/* ==========================================================================
   Luxury Shopping mini-cart Drawer & Size Selection
   ========================================================================== */function initCartDrawer() {
  const sizeOptions = document.querySelectorAll('.size-option');
  const priceDisplay = document.querySelector('.showcase-price .price-value');
  const cartIconBtn = document.querySelector('.cart-icon-btn');
  const cartDrawer = document.querySelector('.cart-drawer');
  const overlay = document.querySelector('.overlay');
  const closeCart = document.querySelector('.close-cart-btn');
  const addBagBtn = document.querySelector('.btn-add-bag');
  const cartItemsContainer = document.querySelector('.cart-items-container');
  const cartCount = document.querySelector('.cart-count');
  const cartSubtotal = document.querySelector('.cart-total-price');
  
  let selectedSize = '50ml';
  let selectedPrice = 12500;

  // Size option picker
  sizeOptions.forEach(opt => {
    opt.addEventListener('click', () => {
      sizeOptions.forEach(o => o.classList.remove('active'));
      opt.classList.add('active');
      
      selectedSize = opt.getAttribute('data-size');
      selectedPrice = parseInt(opt.getAttribute('data-price'));
      
      priceDisplay.textContent = `₦${selectedPrice.toLocaleString()}`;
    });
  });

  // Drawer toggling
  const openCartDrawer = () => {
    cartDrawer.classList.add('active');
    overlay.classList.add('active');
    updateCartUI();
  };

  const closeCartDrawer = () => {
    cartDrawer.classList.remove('active');
    overlay.classList.remove('active');
  };

  cartIconBtn.addEventListener('click', openCartDrawer);
  closeCart.addEventListener('click', closeCartDrawer);
  overlay.addEventListener('click', (e) => {
    if (!cartDrawer.contains(e.target) && !document.querySelector('.quiz-modal').contains(e.target)) {
      closeCartDrawer();
    }
  });

  // Add Item to Bag (integrates with global Cart)
  addBagBtn.addEventListener('click', () => {
    const productMap = {
      '30ml': 'p2',
      '50ml': 'p1',
      '100ml': 'p7'
    };
    const targetProductId = productMap[selectedSize];
    const product = getProductById(targetProductId);
    
    if (product) {
      Cart.addItem(product, 1);
      Cart.updateHeaderCount();
      updateCartUI();
      openCartDrawer();
    }
  });

  function updateCartUI() {
    cartItemsContainer.innerHTML = '';
    const items = Cart.getItems();
    
    if (items.length === 0) {
      cartItemsContainer.innerHTML = '<div class="empty-cart-msg">Your collection is empty.</div>';
      cartCount.textContent = '0';
      cartCount.classList.remove('active');
      cartSubtotal.textContent = '₦0';
      return;
    }

    let total = 0;
    let itemsCount = 0;

    items.forEach(item => {
      total += item.price * item.qty;
      itemsCount += item.qty;

      const itemEl = document.createElement('div');
      itemEl.className = 'cart-item';
      itemEl.innerHTML = `
        <img src="${item.image}" alt="${item.name}" class="cart-item-img" onerror="this.src='assets/zahra-white-square-bottles.jpg'">
        <div class="cart-item-info">
          <span class="cart-item-name">${item.name}</span>
          <span class="cart-item-meta">${item.vendor === 'perfume' ? 'Premium Oil' : 'Boutique Item'} / Qty: ${item.qty}</span>
        </div>
        <div style="text-align: right;">
          <span class="cart-item-price">₦${(item.price * item.qty).toLocaleString()}</span>
          <br>
          <button class="cart-item-remove" data-id="${item.id}" style="margin-top: 10px; background:none; border:none; color:var(--gold); cursor:pointer;">Remove</button>
        </div>
      `;

      cartItemsContainer.appendChild(itemEl);
    });

    // Set counts
    cartCount.textContent = itemsCount;
    cartCount.classList.add('active');
    cartSubtotal.textContent = `₦${total.toLocaleString()}`;

    // Hook remove listeners
    document.querySelectorAll('.cart-item-remove').forEach(btn => {
      btn.addEventListener('click', () => {
        const idToRemove = btn.getAttribute('data-id');
        Cart.removeItem(idToRemove);
        updateCartUI();
        Cart.updateHeaderCount();
      });
    });
  }

  // Hook mini-cart checkout redirect to global checkout.html
  document.querySelector('.btn-checkout').addEventListener('click', () => {
    const items = Cart.getItems();
    if (items.length === 0) return;
    
    const checkoutBtn = document.querySelector('.btn-checkout');
    checkoutBtn.textContent = "Proceeding...";
    checkoutBtn.style.pointerEvents = 'none';
    
    setTimeout(() => {
      window.location.href = 'checkout.html';
    }, 500);
  });

  // Run initial sync on load
  updateCartUI();}

/* ==========================================================================
   Editorial Testimonials Slider
   ========================================================================== */
function initTestimonialSlider() {
  const slides = document.querySelectorAll('.testimonial-slide');
  const dotsContainer = document.querySelector('.slider-dots');
  const prevBtn = document.querySelector('.slider-prev');
  const nextBtn = document.querySelector('.slider-next');
  
  let currentSlide = 0;
  const slideCount = slides.length;

  if (slideCount === 0) return;

  // Create dot controls dynamically
  for (let i = 0; i < slideCount; i++) {
    const dot = document.createElement('div');
    dot.className = `dot ${i === 0 ? 'active' : ''}`;
    dot.addEventListener('click', () => {
      goToSlide(i);
    });
    dotsContainer.appendChild(dot);
  }

  const dots = document.querySelectorAll('.dot');

  function goToSlide(index) {
    slides[currentSlide].classList.remove('active');
    dots[currentSlide].classList.remove('active');
    
    currentSlide = (index + slideCount) % slideCount;
    
    slides[currentSlide].classList.add('active');
    dots[currentSlide].classList.add('active');
  }

  prevBtn.addEventListener('click', () => {
    goToSlide(currentSlide - 1);
  });

  nextBtn.addEventListener('click', () => {
    goToSlide(currentSlide + 1);
  });

  // Autoplay slider every 8 seconds
  let autoPlay = setInterval(() => {
    goToSlide(currentSlide + 1);
  }, 8000);

  // Clear autoplay when interacting manually
  const stopAutoPlay = () => {
    clearInterval(autoPlay);
  };

  prevBtn.addEventListener('click', stopAutoPlay);
  nextBtn.addEventListener('click', stopAutoPlay);
  dots.forEach(d => d.addEventListener('click', stopAutoPlay));
}

/* ==========================================================================
   Newsletter Signature Wax-Seal Animation
   ========================================================================== */
function initNewsletterForm() {
  const form = document.querySelector('.newsletter-form');
  const wrapper = document.querySelector('.newsletter-wrapper');
  const successDiv = document.querySelector('.newsletter-success');
  const input = document.querySelector('.newsletter-input');
  
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const emailVal = input.value.trim();
    if (!emailVal || !validateEmail(emailVal)) {
      input.style.borderBottom = '1px solid #bf1b2c';
      setTimeout(() => {
        input.style.borderBottom = 'none';
      }, 1000);
      return;
    }

    // Fade form container out
    form.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
    form.style.opacity = '0';
    form.style.transform = 'translateY(-15px)';
    
    document.querySelector('.newsletter-title').style.transition = 'opacity 0.4s ease';
    document.querySelector('.newsletter-title').style.opacity = '0';

    setTimeout(() => {
      form.style.display = 'none';
      document.querySelector('.newsletter-title').style.display = 'none';
      
      // Stamp the wax seal and reveal success content
      successDiv.classList.add('active');
    }, 400);
  });

  function validateEmail(email) {
    const re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(String(email).toLowerCase());
  }
}
