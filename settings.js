// Save the settings when the save button is clicked
document.getElementById('save').onclick = async function() {
    let template = document.getElementById('template');
    let skills = document.getElementById('skills');
    let experience = document.getElementById('experience');
    let apiKey = document.getElementById('api-key');
    let tone = document.getElementById('tone');
  
    // Array of all input elements
    let inputs = [template, skills, experience, apiKey];
  
    // Clear previous highlights
    inputs.forEach(input => input.style.borderColor = "");
  
    // Filter out inputs that have values
    let emptyInputs = inputs.filter(input => !input.value);
  
    // If any inputs are empty, show the modal and highlight empty fields
    if(emptyInputs.length > 0) {
      // Show modal if required fields are empty
      var modal = document.getElementById("myModal");
      var span = document.getElementsByClassName("closemodal")[0];
  
      modal.style.display = "block";
  
      span.onclick = function() {
        modal.style.display = "none";
      }
  
      window.onclick = function(event) {
        if (event.target == modal) {
          modal.style.display = "none";
        }
      }
  
      // Highlight empty fields
      emptyInputs.forEach(input => input.style.borderColor = "red");
  
      return;
    }
  
    // If we've made it this far, all fields have values
    let templateVal = template.value;
    let skillsVal = skills.value;
    let experienceVal = experience.value;
    let apiKeyVal = apiKey.value;
    let toneVal = tone.value;


 

    if(!isValidApiKeyFormat(apiKeyVal)) {
        apiKey.style.borderColor = "red"
        alert("Invalid API key format.");
        return;
    }

    const isApiKeyValid = await checkApiKeyAuthorizationAsync(apiKeyVal);
    if (!isApiKeyValid) {
        apiKey.style.borderColor = "red"
        alert("Unauthorized API key.");
        return;
    }
  
    chrome.storage.local.set({'template': templateVal, 'skills': skillsVal,'experience':experienceVal, 'apiKey': apiKeyVal, 'tone': toneVal}, function() {
      console.log('Settings saved');
      window.close();
    });
  }
  
  
  document.getElementById('close').onclick = function(){
    window.close(); 
  }
  
  // Load any saved settings when the settings page opens
  window.onload = function() {
    chrome.storage.local.get(['template', 'skills','experience', 'apiKey', 'tone'], function(result) {
      document.getElementById('template').value = result.template || '';
      document.getElementById('skills').value = result.skills || '';
      document.getElementById('experience').value = result.experience || '';
      document.getElementById('api-key').value = result.apiKey || '';
      document.getElementById('tone').value = result.tone || '';
    });
  }

    
  function isValidApiKeyFormat(secretKey) {
    return /^sk-[a-zA-Z0-9]{32,}$/.test(secretKey);
}

async function checkApiKeyAuthorizationAsync(secretKey) {
    const response = await fetch('https://api.openai.com/v1/engines', {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${secretKey}`
        }
    });
    return response.ok;  // returns true if HTTP status code is 200-299
}
