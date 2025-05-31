document.addEventListener("DOMContentLoaded", () => {
  const newUserForm = document.getElementById("new-user-form");
  const exerciseForm = document.getElementById("exercise-form");
  const logForm = document.getElementById("log-form");
  const outputDiv = document.getElementById("output");

  // Helper function to display JSON output
  function displayOutput(data) {
    outputDiv.textContent = JSON.stringify(data, null, 2);
  }

  // --- Create New User ---
  newUserForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const username = document.getElementById("uname").value;

    try {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded", // FreeCodeCamp expects this for forms
        },
        body: `username=${encodeURIComponent(username)}`,
      });
      const data = await response.json();
      displayOutput(data);
      if (response.ok) {
        document.getElementById("uname").value = ""; // Clear input on success
      }
    } catch (error) {
      displayOutput({ error: "Failed to create user", details: error.message });
      console.error("Error creating user:", error);
    }
  });

  // --- Add Exercise ---
  exerciseForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const userId = document.getElementById("uid").value;
    const description = document.getElementById("desc").value;
    const duration = document.getElementById("dur").value;
    const date = document.getElementById("date").value;

    // Basic validation (more comprehensive validation on backend)
    if (!userId || !description || !duration) {
      displayOutput({
        error: "User ID, Description, and Duration are required.",
      });
      return;
    }

    // Build form data
    let formData = `description=${encodeURIComponent(
      description
    )}&duration=${encodeURIComponent(duration)}`;
    if (date) {
      formData += `&date=${encodeURIComponent(date)}`;
    }

    try {
      const response = await fetch(`/api/users/${userId}/exercises`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData,
      });
      const data = await response.json();
      displayOutput(data);
      if (response.ok) {
        document.getElementById("uid").value = "";
        document.getElementById("desc").value = "";
        document.getElementById("dur").value = "";
        document.getElementById("date").value = "";
      }
    } catch (error) {
      displayOutput({
        error: "Failed to add exercise",
        details: error.message,
      });
      console.error("Error adding exercise:", error);
    }
  });

  // --- Get Exercise Log ---
  logForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const userId = document.getElementById("log-uid").value;
    const from = document.getElementById("from").value;
    const to = document.getElementById("to").value;
    const limit = document.getElementById("limit").value;

    if (!userId) {
      displayOutput({ error: "User ID is required to get logs." });
      return;
    }

    let queryParams = new URLSearchParams();
    if (from) queryParams.append("from", from);
    if (to) queryParams.append("to", to);
    if (limit) queryParams.append("limit", limit);

    const queryString = queryParams.toString();
    const url = `/api/users/${userId}/logs${
      queryString ? `?${queryString}` : ""
    }`;

    try {
      const response = await fetch(url);
      const data = await response.json();
      displayOutput(data);
    } catch (error) {
      displayOutput({
        error: "Failed to retrieve logs",
        details: error.message,
      });
      console.error("Error fetching logs:", error);
    }
  });
});
