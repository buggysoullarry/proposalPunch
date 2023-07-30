let loadingInterval;

// Check if they're on a valid jobs page and if required fields are filled
async function validatePageAndFields(jobId) {
  // Check if the page is valid (you might want to adjust this based on what constitutes a valid jobs page)
  if (!jobId) {
    showError("You are not currently on a valid jobs page.", "Please navigate to a job page or apply for job page on Upwork.");
    return false;
  }

  // Check if required fields are filled
  let { template, skills, experience, apiKey, storedJobId } = await new Promise((resolve) => {
    chrome.storage.local.get(["template", "skills", "experience", "apiKey", "jobId"], function (result) {
      resolve(result);
    });
  });

  if (!template || !skills || !experience || !apiKey) {
    showError("Required fields are missing.", 'Please make sure all required fields are filled out on the options page. <a href="settings.html" target="_blank">Go to Options Page</a>');
    return false;
  }

  // Check if 'jobSpecifics' needs to be cleared
  if (storedJobId && storedJobId !== jobId) {
    document.getElementById("jobSpecifics").value = "";
  }

  return true;
}

function showError(errorMessage, errorFix) {
  document.getElementById("mainContent").style.display = "none";
  document.getElementById("errorContent").style.display = "block";
  document.getElementById("errorMessage").textContent = errorMessage;
  document.getElementById("errorFix").innerHTML = errorFix;
}

window.onload = async function () {
  const curjobId = await getCurrentJobId();
  const valid = await validatePageAndFields(curjobId);
  if (!valid) {
    console.log("Invalid page or missing fields.");
    return;
  }

  let { jobspecifics, jobId, prevProposal } = await new Promise((resolve) => {
    chrome.storage.local.get(["jobspecifics", "jobId", "prevProposal"], function (result) {
      resolve(result);
    });
  });

  // If the current page job ID matches the stored one, fill in job specifics field
  if (jobId === curjobId) {
    document.getElementById("jobSpecifics").value = jobspecifics;
    if (prevProposal) {
      document.getElementById("jobProposal").value = prevProposal;
      startButton.disabled = false;
      document.getElementById("startButton").innerText = "Re-Generate AI Proposal";
    }
  } else {
    chrome.storage.local.set({ prevProposal: "" });
  }

  document.getElementById("jobSpecifics").addEventListener("input", async function () {
    let jobId = await getCurrentJobId();
    let jobSpecifics = document.getElementById("jobSpecifics").value;

    chrome.storage.local.set({ jobspecifics: jobSpecifics, jobId: jobId }, function () {});
  });

  document.getElementById("copyButton").addEventListener("click", function () {
    const textarea = document.getElementById("jobProposal");
    textarea.select();
    document.execCommand("copy");

    const proposalText = textarea.value;

    // Check if there is any text to copy
    if (!proposalText) {
      // You can replace the error handling here to better fit your application's UX
      alert("No proposal generated yet to copy.");
      return;
    }

    // Change the button's text
    this.innerHTML = '<i class="bi bi-clipboard"></i> Copied!';

    // Revert the text back to 'Copy Proposal' after 3 seconds
    setTimeout(() => {
      this.innerHTML = '<i class="bi bi-clipboard"></i> Copy Proposal';
    }, 3000);
  });

  document.getElementById("startButton").addEventListener("click", async function () {
    // check for valid page and required fields
    if (await validatePageAndFields(jobId)) {
      startButton.disabled = true;

      // Set the initial working message
      document.getElementById("jobProposal").value = "Talking to GPT";

      // Define the loading dots behavior
      let dots = "";
      loadingInterval = setInterval(() => {
        dots += ".";
        if (dots.length > 3) dots = "";
        document.getElementById("jobProposal").value = `Talking to GPT ${dots}`;
      }, 1000);

      // Starting the proposal process
      // Starting the proposal process
      chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        chrome.tabs.sendMessage(tabs[0].id, { message: "clicked_browser_action" }, function (response) {
          // Handle runtime errors
          if (chrome.runtime.lastError) {
            console.error(chrome.runtime.lastError.message);
            return;
          }

          // Handle response errors
          if (response && response.error) {
            document.getElementById("errorMessage").innerHTML = response.error;
            document.getElementById("errorModal").style.display = "block";
            clearInterval(loadingInterval);
            startButton.disabled = false;
            return;
          }

          // Handle successful proposal generation
          if (response && response.proposal) {
            clearInterval(loadingInterval);
            document.getElementById("jobProposal").value = response.proposal;
            startButton.disabled = false;
            document.getElementById("startButton").innerText = "Re-Generate AI Proposal";
            chrome.storage.local.set({ prevProposal: response.proposal });
            return;
          }

          // Handle cases where no response was received
          console.log("No response received from clicked_browser_action message.");
        });
      });
    }
  });

  let closeButton = document.querySelector(".closemodal");
  closeButton.addEventListener("click", function () {
    errorModal.style.display = "none";
  });
  window.addEventListener("click", function (event) {
    if (event.target == errorModal) {
      errorModal.style.display = "none";
    }
  });
};

async function getCurrentJobId() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  // Ensure URL is from Upwork jobs
  if (tabs[0].url.includes("https://www.upwork.com/jobs/") || tabs[0].url.includes("https://www.upwork.com/ab/proposals/job/")) {
    const jobIdMatch = tabs[0].url.match(/~\w+/);
    return jobIdMatch ? jobIdMatch[0] : null;
  } else {
    return null;
  }
}
