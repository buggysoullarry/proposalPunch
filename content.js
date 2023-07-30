// listens for clicked button
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.message === "clicked_browser_action") {
    let jobDescription = "";

    const selectors = [".job-description > div", "#up-truncation-1"];
    let jobDescriptionElement;

    for (let selector of selectors) {
      jobDescriptionElement = document.querySelector(selector);
      if (jobDescriptionElement) {
        jobDescription = removeHTML(jobDescriptionElement.innerHTML);
        break;
      }
    }

    if (!jobDescription) {
      sendResponse({ error: "Problem getting the job description" });
      return true;
    }

    chrome.runtime.sendMessage({ jobDescription: jobDescription }, (response) => {
      if (!chrome.runtime.lastError) {
        if (response && response.error) {
          sendResponse({ error: response.error });
        } else if (response && response.proposal) {
          sendResponse(response);
        }
      }
      return true;
    });
    return true;
  }
});

// Function to remove HTML from string
function removeHTML(html) {
  let doc = new DOMParser().parseFromString(html, "text/html");
  return doc.body.textContent || "";
}
