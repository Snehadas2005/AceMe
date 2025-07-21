console.log("🎤 Loading Interview API...");

const interviewAPI = {
  // Upload resume with progress tracking
  async uploadResume(formData, progressCallback = null) {
    try {
      console.log("📄 Uploading resume...");

      if (!formData || !(formData instanceof FormData)) {
        throw new Error("Valid FormData is required for resume upload");
      }

      const file = formData.get("resume") || formData.get("file");
      if (!file) {
        throw new Error("Resume file is required");
      }

      console.log("📋 File details:", {
        name: file.name,
        size: file.size,
        type: file.type,
      });

      const allowedTypes = [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "text/plain",
      ];

      if (!allowedTypes.includes(file.type)) {
        throw new Error("Please upload a PDF, DOC, DOCX, or TXT file");
      }

      const maxSize = 10 * 1024 * 1024;
      if (file.size > maxSize) {
        throw new Error("File size must be less than 10MB");
      }

      const user = window.storage?.getUser?.();
      if (user && user.uid && !formData.get("userId")) {
        formData.append("userId", user.uid);
      }

      if (progressCallback && typeof progressCallback === "function") {
        return new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();

          xhr.upload.addEventListener("progress", (e) => {
            if (e.lengthComputable) {
              const percentComplete = (e.loaded / e.total) * 100;
              progressCallback(percentComplete);
            }
          });

          xhr.addEventListener("load", () => {
            try {
              const response = JSON.parse(xhr.responseText);
              if (xhr.status >= 200 && xhr.status < 300) {
                console.log("✅ Resume uploaded successfully:", response);
                resolve(response);
              } else {
                reject(new Error(response.message || "Upload failed"));
              }
            } catch (err) {
              reject(new Error("Invalid response from server"));
            }
          });

          xhr.addEventListener("error", () => {
            reject(new Error("Upload failed due to network error"));
          });

          xhr.open("POST", `${window.API_BASE_URL}/api/upload-resume`);

          const token = window.storage?.getToken?.();
          if (token) {
            xhr.setRequestHeader("Authorization", `Bearer ${token}`);
          }

          xhr.send(formData);
        });
      } else {
        const res = await window.apiCall("/api/upload-resume", "POST", formData);
        console.log("✅ Resume uploaded successfully:", res);
        return res;
      }
    } catch (err) {
      console.error("🔥 Resume upload error:", err);
      return {
        success: false,
        message: err.message || "Resume upload failed",
        error: err,
      };
    }
  },

  // Start interview session
  async startInterview({ userId, resumeId }) {
    try {
      console.log("🎬 Starting interview session...");

      if (!userId && !resumeId) {
        const user = window.storage?.getUser?.();
        userId = userId || user?.uid;
      }

      if (!userId) {
        throw new Error("User ID is required to start interview");
      }

      const requestData = { userId };
      if (resumeId) requestData.resumeId = resumeId;

      console.log("📋 Interview start request:", requestData);

      const res = await window.apiCall("/api/interview/start", "POST", requestData);

      console.log("✅ Interview started successfully:", res);

      if (res.success && res.interviewId && window.storage) {
        window.storage.setInterviewId(res.interviewId);
        console.log("💾 Interview ID stored:", res.interviewId);
      }

      return res;
    } catch (err) {
      console.error("🔥 Start interview error:", err);
      return {
        success: false,
        message: err.message || "Failed to start interview",
        error: err,
      };
    }
  },

  // Submit interview response
  async submitResponse({ interviewId, questionId, response, audioBlob = null }) {
    try {
      console.log("💬 Submitting interview response...");

      if (!interviewId) interviewId = window.storage?.getInterviewId?.();
      if (!interviewId) throw new Error("Interview ID is required");
      if (!questionId || !response) throw new Error("Question ID and response are required");

      const requestData = {
        interviewId,
        questionId,
        response,
        timestamp: new Date().toISOString(),
      };

      console.log("📋 Response submission data:", requestData);

      if (audioBlob) {
        const formData = new FormData();
        formData.append("data", JSON.stringify(requestData));
        formData.append("audio", audioBlob, "response.webm");

        const res = await window.apiCall("/api/interview/response", "POST", formData);
        console.log("✅ Response with audio submitted successfully:", res);
        return res;
      } else {
        const res = await window.apiCall("/api/interview/response", "POST", requestData);
        console.log("✅ Response submitted successfully:", res);
        return res;
      }
    } catch (err) {
      console.error("🔥 Submit response error:", err);
      return {
        success: false,
        message: err.message || "Failed to submit response",
        error: err,
      };
    }
  },

  // Get next question
  async getNextQuestion(interviewId) {
    try {
      console.log("❓ Getting next question...");

      if (!interviewId) interviewId = window.storage?.getInterviewId?.();
      if (!interviewId) throw new Error("Interview ID is required");

      const res = await window.apiCall(`/api/interview/${interviewId}/next-question`, "GET");

      console.log("✅ Next question retrieved:", res);
      return res;
    } catch (err) {
      console.error("🔥 Get next question error:", err);
      return {
        success: false,
        message: err.message || "Failed to get next question",
        error: err,
      };
    }
  },

  // End interview session
  async endInterview(interviewId) {
    try {
      console.log("🏁 Ending interview session...");

      if (!interviewId) interviewId = window.storage?.getInterviewId?.();
      if (!interviewId) throw new Error("Interview ID is required");

      const res = await window.apiCall(`/api/interview/${interviewId}/end`, "POST");

      console.log("✅ Interview ended successfully:", res);
      return res;
    } catch (err) {
      console.error("🔥 End interview error:", err);
      return {
        success: false,
        message: err.message || "Failed to end interview",
        error: err,
      };
    }
  },

  // Get interview results/feedback
  async getResults(interviewId) {
    try {
      console.log("📊 Getting interview results...");

      if (!interviewId) interviewId = window.storage?.getInterviewId?.();
      if (!interviewId) throw new Error("Interview ID is required");

      const res = await window.apiCall(`/api/interview/${interviewId}/results`, "GET");

      console.log("✅ Results retrieved successfully:", res);
      return res;
    } catch (err) {
      console.error("🔥 Get results error:", err);
      return {
        success: false,
        message: err.message || "Failed to get interview results",
        error: err,
      };
    }
  },

  // Get user's interview history
  async getInterviewHistory(userId) {
    try {
      console.log("📚 Getting interview history...");

      if (!userId) {
        const user = window.storage?.getUser?.();
        userId = user?.uid;
      }

      if (!userId) throw new Error("User ID is required");

      const res = await window.apiCall(`/api/interview/history/${userId}`, "GET");

      console.log("✅ Interview history retrieved:", res);
      return res;
    } catch (err) {
      console.error("🔥 Get interview history error:", err);
      return {
        success: false,
        message: err.message || "Failed to get interview history",
        error: err,
      };
    }
  },

  // Process resume text
  async processResume(resumeText) {
    try {
      console.log("⚙️ Processing resume text...");

      if (!resumeText) throw new Error("Resume text is required");

      const res = await window.apiCall("/api/process-resume", "POST", { resumeText });

      console.log("✅ Resume processed successfully:", res);
      return res;
    } catch (err) {
      console.error("🔥 Process resume error:", err);
      return {
        success: false,
        message: err.message || "Failed to process resume",
        error: err,
      };
    }
  },

  // Analyze response
  async analyzeResponse(question, responseText) {
    try {
      console.log("🧠 Analyzing response...");

      if (!question || !responseText) {
        throw new Error("Both question and response text are required for analysis");
      }

      const requestData = { question, responseText };

      console.log("📋 Analysis request data:", requestData);

      const res = await window.apiCall("/api/interview/analyze-response", "POST", requestData);

      console.log("✅ Response analysis complete:", res);
      return res;
    } catch (err) {
      console.error("🔥 Analyze response error:", err);
      return {
        success: false,
        message: err.message || "Failed to analyze response",
        error: err,
      };
    }
  },
};

window.interviewAPI = interviewAPI;

console.log("🚀 Interview API loaded with full functionality.");
