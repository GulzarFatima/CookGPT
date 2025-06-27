let availableVoices = [];
let currentUtterance = null;
let aiAudio = new Audio();
let isPlaying = false;
let isPaused = false;

// ------------------------------------------------------------------
// Load voices into availableVoices array
// ------------------------------------------------------------------
async function loadVoices() {
  return new Promise((resolve) => {
    const voices = window.speechSynthesis.getVoices();
    if (voices.length) {
      availableVoices = voices;
      resolve();
    } else {
      window.speechSynthesis.onvoiceschanged = () => {
        availableVoices = window.speechSynthesis.getVoices();
        resolve();
      };
    }
  });
}

window.addEventListener('DOMContentLoaded', loadVoices);

// ------------------------------------------------------------------
// Format recipe text inside a container 
// ------------------------------------------------------------------
function formatRecipe(rawText) {
  rawText = rawText.replace(/\*\*/g, '').trim();

  const lowerText = rawText.toLowerCase();
  const ingredientsStart = lowerText.indexOf("ingredients");
  const stepsStart = lowerText.indexOf("steps");
  const serveStart = lowerText.indexOf("serve");

  const ingredientsText = ingredientsStart !== -1
    ? rawText.substring(ingredientsStart, stepsStart !== -1 ? stepsStart : rawText.length)
    : '';

  const stepsText = stepsStart !== -1
    ? rawText.substring(stepsStart, serveStart !== -1 ? serveStart : rawText.length)
    : '';

  const serveText = serveStart !== -1
    ? rawText.substring(serveStart)
    : '';

  const steps = stepsText.match(/\d+\.\s[^]+?(?=(\d+\.\s|$))/g) || [];

  return `
    <div id="speakable" class="diary-note">
      <h3>📝 Ingredients</h3>
      <ul>
        ${ingredientsText
          .split('\n')
          .filter(line =>
            line.trim().length > 0 &&
            !line.toLowerCase().includes("recipe") &&
            !/^\d+\./.test(line) &&
            !line.toLowerCase().includes("ingredients") &&
            !line.toLowerCase().includes("steps")
          )
          .map(item => `<li>${item.trim().replace(/^- /, '')}</li>`)
          .join('')}
      </ul>

      <h3>🔥 Steps</h3>
      ${steps.length ? `
        <ol>
          ${steps.map(step => `<li><span class="sentence">${step.replace(/^\d+\.\s*/, '').trim()}</span></li>`).join('')}
        </ol>
      ` : `<p class="placeholder-text">No steps provided. Try again or be more specific.</p>`}

      ${serveText ? `
      <h3>🍽️ Serving</h3>
      <p><span class="sentence">${serveText.trim()}</span></p>
      ` : ''}
    </div>
  `;
}

// ------------------------------------------------------------------
// Expose getRecipe globally so HTML onclick="getRecipe()" works
// ------------------------------------------------------------------
window.getRecipe = function () {
  const rawInput = document.getElementById("ingredients").value || "";
  const ingredients = rawInput
    .split(',')
    .map(s => s.trim())
    .filter(s => s.length > 0);

  const time = parseInt(document.getElementById("time").value);
  const preferences = [];

  const loader = document.getElementById("loader");
  const recipeContent = document.getElementById("recipeContent");
  const placeholder = document.getElementById("placeholderText");
  const listenBtn = document.getElementById("listenBtn");

  if (document.getElementById("low_oil").checked) preferences.push("low oil");
  if (document.getElementById("no_oven").checked) preferences.push("no oven");
  if (document.getElementById("no_airfryer").checked) preferences.push("no air fryer");

  if (!ingredients.length) {
    placeholder.textContent = "📝 Please enter at least one ingredient.";
    placeholder.style.display = "block";
    loader.style.display = "none";
    recipeContent.classList.add("hidden");
    listenBtn.style.display = "none";
    return;
  }

  // Show loader, hide content
  placeholder.style.display = "none";
  loader.style.display = "block";
  recipeContent.classList.add("hidden");
  listenBtn.style.display = "none";

  fetch('api/suggest.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ingredients, time, preferences })
  })
  .then(async res => {
    const raw = await res.text();
    console.log("🔥 RAW RESPONSE from suggest.php:\n", raw); // 👈 See what went wrong

    if (!res.ok) throw new Error(raw);

    try {
      return JSON.parse(raw); // ✅ Only parse if it's valid
    } catch (e) {
      throw new Error("Invalid JSON: " + raw);
    }
  })
    .then(data => {
      loader.style.display = "none";

      if (!data.recipe || data.recipe.trim() === "") {
        placeholder.textContent = "❌ No recipe found.";
        placeholder.style.display = "block";
        return;
      }

      recipeContent.innerHTML = formatRecipe(data.recipe);
      recipeContent.classList.remove("hidden");
      listenBtn.textContent = "🔊 Listen";
      listenBtn.style.display = "inline-block";
      document.getElementById("downloadBtn").style.display = "inline-block";

    })
    .catch(err => {
      console.error(err);
      loader.style.display = "none";
      placeholder.textContent = "❌ Error fetching recipe.";
      placeholder.style.display = "block";
      recipeContent.classList.add("hidden");
      listenBtn.style.display = "none";
    });

};

// ------------------------------------------------------------------
// Text-to-speech toggle for playing/pausing/resuming the recipe
// ------------------------------------------------------------------
async function toggleSpeak() {
  const button = document.getElementById("listenBtn");
  const speakable = document.getElementById("speakable");
  if (!speakable) return;

  const text = speakable.textContent.trim();
  if (!text) return;

  if (isPaused) {
    aiAudio.play();
    isPaused = false;
    button.textContent = "⏸️ Pause";
    return;
  }

  if (isPlaying && !aiAudio.paused) {
    aiAudio.pause();
    isPaused = true;
    button.textContent = "▶️ Resume";
    return;
  }

  button.textContent = "⏳ Generating Voice...";
  isPlaying = true;
  isPaused = false;

  try {
    const response = await fetch("/api/tts.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, voice: "shimmer" })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("🚨 TTS ERROR RAW RESPONSE:\n", errText);
      throw new Error("Failed to generate voice");
    }
    

    const audioBlob = await response.blob();
    const audioUrl = URL.createObjectURL(audioBlob);

    aiAudio.src = audioUrl;
    aiAudio.play();
    button.textContent = "⏸️ Pause";

    aiAudio.onended = () => {
      isPlaying = false;
      isPaused = false;
      button.textContent = "🔊 Listen Again";
    };
  } catch (err) {
    console.error(err);
    button.textContent = "❌ Error";
  }
}

window.speakRecipe = toggleSpeak;

// ------------------------------------------------------------------
// Download recipe as image using html2canvas
// ------------------------------------------------------------------
function downloadRecipeImage() {
  const recipeContainer = document.getElementById("speakable");
  if (!recipeContainer) return;

  html2canvas(recipeContainer, {
    backgroundColor: "#fff",
    scale: 2
  }).then(canvas => {
    const link = document.createElement("a");
    link.download = "cookgpt-recipe.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  });
}

