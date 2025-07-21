const storage = {
  setUser: (user) => {
    localStorage.setItem("user", JSON.stringify(user));
  },

  getUser: () => {
    const user = localStorage.getItem("user");
    try {
      return user ? JSON.parse(user) : null;
    } catch {
      console.warn("⚠️ Invalid user data in localStorage, clearing it.");
      localStorage.removeItem("user");
      return null;
    }
  },

  setToken: (token) => {
    localStorage.setItem("token", token);
  },

  getToken: () => {
    return localStorage.getItem("token");
  },

  setInterviewId: (id) => {
    localStorage.setItem("interviewId", id);
  },

  getInterviewId: () => {
    return localStorage.getItem("interviewId");
  },

  clear: () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    localStorage.removeItem("interviewId");
  }
};

window.storage = storage; // so you can use it in inline scripts in HTML
