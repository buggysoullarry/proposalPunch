chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.jobDescription) {
    generateProposal(request.jobDescription).then((proposal) => {
      if (proposal.error) {
        sendResponse({ error: proposal.error });
      } else {
        sendResponse({ proposal: proposal });
      }
    });
  }
  // indicate that the response will be sent asynchronously
  return true;
});

// show settings page on install
chrome.runtime.onInstalled.addListener(function (details) {
  if (details.reason == "install") {
    chrome.tabs.create({ url: "settings.html" });
  }
});

async function generateProposal(jobDescription) {
  // Get template, skills, experience, job specifics, apiKey, and tone from local storage
  let { template, skills, experience, jobspecifics, apiKey, tone } = await new Promise((resolve) => {
    chrome.storage.local.get(["template", "skills", "experience", "jobspecifics", "apiKey", "tone"], function (result) {
      resolve(result);
    });
  });

  // Make sure all required fields are filled in
  if (!template || !skills || !experience || !apiKey) {
    console.error("Missing required field(s) in storage.");
    return { error: `Missing required field(s) in settins.` };
  }

  // Prepare the messages for the API call
  let messages = [
    {
      role: "system",
      content: "You are an expert at writing job proposals for people applying for remote contract jobs.",
    },
    {
      role: "system",
      content:
        "The user will give you their skills, background, then a template they want you to follow, and finally a job description, you will write a job proposal and make it under 4 paragraphs long.",
    },
    {
      role: "system",
      content: "The user may also give you a tone and anything specific to mention for the current proposal.",
    },
    { role: "user", content: `My background: ${experience}` },
    { role: "user", content: `My Skills: ${skills}` },
    { role: "user", content: `Template: ${template}` },
    { role: "user", content: `The Job Description: ${jobDescription}` },
  ];

  // Include the job specifics message if the jobspecifics field is filled in
  if (jobspecifics) {
    messages.splice(4, 0, {
      role: "user",
      content: `Specifically for this job mention: ${jobspecifics}`,
    }); // Insert it at the 4th position in the messages array
  }

  // Include the tone message if the tone field is filled in
  if (tone) {
    messages.push({
      role: "user",
      content: `The tone of my proposal: ${tone}`,
    });
  }

  // Call the OpenAI API to generate the proposal

  let response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`, // Use the apiKey from storage
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-3.5-turbo",
      messages: messages,
      max_tokens: 500,
    }),
  });

  if (!response.ok) {
    // If the response status is not 200, send an error message back to the popup
    if (response.status == 401) return { error: `Unauthorized! Check your API Key` };

    return {
      error: `Error connecting to GPT <br>HTTP status: ${response.status}`,
    };
  }

  let data = await response.json();
  return data.choices[0].message.content;
}
