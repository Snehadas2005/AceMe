// Enhanced Authentication API with better error handling and validation
console.log('🔐 Loading Auth API...');

const authAPI = {
  // User registration
  async register({ name, email, password }) {
    try {
      // Basic validation
      if (!name || !email || !password) {
        throw new Error('Name, email, and password are required');
      }

      if (password.length < 6) {
        throw new Error('Password must be at least 6 characters long');
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        throw new Error('Please enter a valid email address');
      }

      console.log('📝 Attempting to register user:', { name, email });

      const res = await window.apiCall(
        "/api/auth/register",
        "POST",
        { name, email, password }
      );

      console.log('✅ Registration response:', res);
      return res;

    } catch (err) {
      console.error("🔥 Register API Error:", err);
      
      // Return consistent error format
      return { 
        success: false, 
        message: err.message || 'Registration failed',
        error: err 
      };
    }
  },

  // User login
  async login({ email, password }) {
    try {
      // Basic validation
      if (!email || !password) {
        throw new Error('Email and password are required');
      }

      console.log('🔑 Attempting to login user:', { email });

      const res = await window.apiCall(
        "/api/auth/login",
        "POST",
        { email, password }
      );

      console.log('✅ Login response:', res);

      // Handle successful login
      if (res.success && res.data) {
        const { user, token } = res.data;
        
        // Store user data and token
        if (window.storage) {
          if (user) {
            window.storage.setUser(user);
            console.log('👤 User data stored:', user);
          }
          
          if (token) {
            window.storage.setToken(token);
            console.log('🎫 Token stored');
          }
        }
      }

      return res;

    } catch (err) {
      console.error("🔥 Login API Error:", err);
      
      // Return consistent error format
      return { 
        success: false, 
        message: err.message || 'Login failed',
        error: err 
      };
    }
  },

  // User logout
  async logout() {
    try {
      console.log('🚪 Attempting to logout...');

      // Call backend logout endpoint if available
      try {
        await window.apiCall("/api/auth/logout", "POST");
      } catch (err) {
        console.warn('⚠️ Backend logout failed, proceeding with local cleanup:', err.message);
      }

      // Clear local storage
      if (window.storage) {
        window.storage.clear();
      }

      console.log('✅ Logout successful');
      return { success: true, message: 'Logged out successfully' };

    } catch (err) {
      console.error("🔥 Logout Error:", err);
      
      // Even if logout fails, clear local storage
      if (window.storage) {
        window.storage.clear();
      }

      return { 
        success: false, 
        message: err.message || 'Logout failed',
        error: err 
      };
    }
  },

  // Check if user is authenticated
  isAuthenticated() {
    try {
      const user = window.storage?.getUser?.();
      const token = window.storage?.getToken?.();
      
      const isAuth = !!(user && token && user.uid);
      console.log('🔍 Authentication check:', isAuth ? '✅ Authenticated' : '❌ Not authenticated');
      
      return isAuth;
    } catch (err) {
      console.error('🔥 Auth check error:', err);
      return false;
    }
  },

  // Get current user
  getCurrentUser() {
    try {
      const user = window.storage?.getUser?.();
      console.log('👤 Current user:', user ? user.email : 'None');
      return user;
    } catch (err) {
      console.error('🔥 Get current user error:', err);
      return null;
    }
  },

  // Get current token
  getToken() {
    try {
      const token = window.storage?.getToken?.();
      console.log('🎫 Current token:', token ? 'Available' : 'Not available');
      return token;
    } catch (err) {
      console.error('🔥 Get token error:', err);
      return null;
    }
  },

  // Verify token with backend
  async verifyToken() {
    try {
      const token = this.getToken();
      if (!token) {
        throw new Error('No token available');
      }

      console.log('🔍 Verifying token...');
      const res = await window.apiCall("/api/auth/verify", "GET");
      
      console.log('✅ Token verification result:', res);
      return res;

    } catch (err) {
      console.error("🔥 Token verification error:", err);
      
      // If token is invalid, clear local storage
      if (err.type === 'AUTH_ERROR') {
        console.log('🧹 Clearing invalid authentication data');
        if (window.storage) {
          window.storage.clear();
        }
      }

      return { 
        success: false, 
        message: err.message || 'Token verification failed',
        error: err 
      };
    }
  },

  // Password reset (if supported by backend)
  async resetPassword(email) {
    try {
      if (!email) {
        throw new Error('Email is required for password reset');
      }

      console.log('🔄 Requesting password reset for:', email);
      
      const res = await window.apiCall(
        "/api/auth/reset-password",
        "POST",
        { email }
      );

      console.log('✅ Password reset response:', res);
      return res;

    } catch (err) {
      console.error("🔥 Password reset error:", err);
      return { 
        success: false, 
        message: err.message || 'Password reset failed',
        error: err 
      };
    }
  }
};

// Auth utilities
const authUtils = {
  // Redirect to login if not authenticated
  requireAuth(redirectTo = '/login.html') {
    if (!authAPI.isAuthenticated()) {
      console.log('🚫 Authentication required, redirecting to:', redirectTo);
      window.location.href = redirectTo;
      return false;
    }
    return true;
  },

  // Redirect if already authenticated
  requireGuest(redirectTo = '/start.html') {
    if (authAPI.isAuthenticated()) {
      console.log('👋 User already authenticated, redirecting to:', redirectTo);
      window.location.href = redirectTo;
      return false;
    }
    return true;
  },

  // Setup automatic token verification
  setupAutoVerify(intervalMs = 300000) { // 5 minutes default
    console.log('⏰ Setting up automatic token verification every', intervalMs, 'ms');
    
    return setInterval(async () => {
      if (authAPI.isAuthenticated()) {
        const result = await authAPI.verifyToken();
        if (!result.success) {
          console.log('🔄 Token expired, redirecting to login');
          window.location.href = '/login.html';
        }
      }
    }, intervalMs);
  },

  // Format user display name
  getDisplayName(user = null) {
    const currentUser = user || authAPI.getCurrentUser();
    if (!currentUser) return 'Guest';
    
    return currentUser.displayName || currentUser.name || currentUser.email || 'User';
  },

  // Handle auth errors in UI
  handleAuthError(error, formElement = null) {
    console.error('🚨 Auth error:', error);
    
    let message = 'An error occurred. Please try again.';
    
    if (typeof error === 'string') {
      message = error;
    } else if (error.message) {
      message = error.message;
    }

    // Show error in form if provided
    if (formElement) {
      let errorElement = formElement.querySelector('.error-message');
      if (!errorElement) {
        errorElement = document.createElement('div');
        errorElement.className = 'error-message';
        errorElement.style.cssText = `
          color: #dc3545;
          font-size: 14px;
          margin-top: 10px;
          padding: 10px;
          background: #f8d7da;
          border: 1px solid #f5c6cb;
          border-radius: 4px;
        `;
        formElement.appendChild(errorElement);
      }
      errorElement.textContent = message;
      errorElement.style.display = 'block';
    } else {
      // Fallback to alert
      alert(message);
    }
  },

  // Clear auth error
  clearAuthError(formElement) {
    if (formElement) {
      const errorElement = formElement.querySelector('.error-message');
      if (errorElement) {
        errorElement.style.display = 'none';
      }
    }
  }
};

// Auto-setup on page load
document.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 Auth API initialized');
  
  // Log current auth status
  const isAuth = authAPI.isAuthenticated();
  const user = authAPI.getCurrentUser();
  console.log('📊 Auth Status:', {
    authenticated: isAuth,
    user: user ? { email: user.email, uid: user.uid } : null
  });
  
  // Setup auto token verification if authenticated
  if (isAuth) {
    authUtils.setupAutoVerify();
  }
});

// Expose globally
window.authAPI = authAPI;
window.authUtils = authUtils;

console.log("✅ Auth API loaded successfully");