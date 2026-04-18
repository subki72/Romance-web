import { State } from './state.js';
import { API } from './api.js';
import { $, hideLogin, showLogin, showToast } from './ui.js';

// â”€â”€â”€ DOM References â”€â”€â”€
const DOM = {
  heartsContainer: $("#heartsContainer"),
  navbar: $("#navbar"),
  navToggle: $("#navToggle"),
  navLinks: $("#navLinks"),
  name1: $("#name1"),
  name2: $("#name2"),
  startDate: $("#startDate"),
  daysCount: $("#daysCount"),
  poemsGrid: $("#poemsGrid"),
  galleryGrid: $("#galleryGrid"),
  playerSongTitle: $("#playerSongTitle"),
  playerArtist: $("#playerArtist"),
  albumArt: $("#albumArt"),
  playBtn: $("#playBtn"),
  prevBtn: $("#prevBtn"),
  nextBtn: $("#nextBtn"),
  currentTime: $("#currentTime"),
  totalTime: $("#totalTime"),
  progressBarContainer: $("#progressBarContainer"),
  progressBarFill: $("#progressBarFill"),
  volumeSlider: $("#volumeSlider"),
  volumeIcon: $("#volumeIcon"),
  playlistToggleBtn: $("#playlistToggleBtn"),
  playlistPanel: $("#playlistPanel"),
  playlistList: $("#playlistList"),
  poemModal: $("#poemModal"),
  photoModal: $("#photoModal"),
  songModal: $("#songModal"),
  editPoemModal: $("#editPoemModal"),
  lightbox: $("#lightbox"),
  lightboxImg: $("#lightboxImg"),
  lightboxVideo: $("#lightboxVideo"),
  lightboxCaption: $("#lightboxCaption"),
};

// ==========================================
// 1. AUTHENTICATION & INITIALIZATION
// ==========================================
async function initApp() {
  showLogin();
  setupLogin();
}

function setupLogin() {
  const loginForm = $("#loginForm");
  if (!loginForm) return;

  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const pwd = $("#passwordInput").value;
    const isValid = await API.verifyPassword(pwd);

    if (!isValid) {
      $("#loginError").textContent = "Wrong password, sweetie 💔";
      return;
    }

    $("#loginError").textContent = "";
    hideLogin();

    const success = await API.loadData();
    if (success) {
      startAppRender();
    } else {
      showToast("Failed to load data from server", true);
    }
  });
}

function startAppRender() {
  initFloatingHearts();
  initNavigation();
  initDaysCounter();
  initCoupleNames();
  initPoems();
  initGallery();
  initMusicPlayer();
  initScrollReveal();
}

// ==========================================
// 2. MAIN APPLICATION FUNCTIONS
// ==========================================

function initFloatingHearts() {
  const hearts = ["ðŸ’•", "â¤ï¸", "ðŸ’—", "ðŸ’–", "ðŸ’˜", "ðŸŒ¸", "ðŸ©·", "ðŸ’“"];
  const container = DOM.heartsContainer;
  const count = 18;

  for (let i = 0; i < count; i++) {
    const heart = document.createElement("div");
    heart.className = "floating-heart";
    heart.textContent = hearts[Math.floor(Math.random() * hearts.length)];
    heart.style.setProperty("--x", Math.random() * 100 + "%");
    heart.style.setProperty("--size", (Math.random() * 1.2 + 0.6).toFixed(2) + "rem");
    heart.style.setProperty("--dur", (Math.random() * 12 + 8).toFixed(1) + "s");
    heart.style.setProperty("--delay", (Math.random() * 10).toFixed(1) + "s");
    container.appendChild(heart);
  }
}

function initNavigation() {
  DOM.navToggle.addEventListener("click", () => {
    DOM.navToggle.classList.toggle("open");
    DOM.navLinks.classList.toggle("open");
  });

  $(".nav-link").forEach((link) => {
    link.addEventListener("click", () => {
      DOM.navToggle.classList.remove("open");
      DOM.navLinks.classList.remove("open");
    });
  });

  window.addEventListener("scroll", () => {
    DOM.navbar.classList.toggle("scrolled", window.scrollY > 50);
    const sections = ["home", "poems", "gallery"];
    const scrollPos = window.scrollY + 120;

    sections.forEach((id) => {
      const section = document.getElementById(id);
      if (section) {
        const top = section.offsetTop;
        const height = section.offsetHeight;
        const link = $(`.nav-link[href="#${id}"]`);
        if (link) {
          link.classList.toggle("active", scrollPos >= top && scrollPos < top + height);
        }
      }
    });
  });
}

function initDaysCounter() {
  if (State.anniversary) DOM.startDate.value = State.anniversary;

  DOM.startDate.addEventListener("change", (e) => {
    State.anniversary = e.target.value;
    API.saveData();
    updateDaysCount();
  });

  updateDaysCount();
  setInterval(updateDaysCount, 60000);
}

function updateDaysCount() {
  if (!State.anniversary) {
    DOM.daysCount.textContent = "âˆž";
    return;
  }
  const start = new Date(State.anniversary);
  const now = new Date();
  const diff = Math.floor((now - start) / (1000 * 60 * 60 * 24));
  animateNumber(DOM.daysCount, Math.max(0, diff));
}

function animateNumber(el, target) {
  const current = parseInt(el.textContent) || 0;
  if (current === target) return;

  const duration = 1500;
  const steps = 40;
  const increment = (target - current) / steps;
  let step = 0;

  const timer = setInterval(() => {
    step++;
    if (step >= steps) {
      el.textContent = target.toLocaleString();
      clearInterval(timer);
    } else {
      el.textContent = Math.round(current + increment * step).toLocaleString();
    }
  }, duration / steps);
}

function initCoupleNames() {
  DOM.name1.textContent = State.name1;
  DOM.name2.textContent = State.name2;

  DOM.name1.addEventListener("blur", () => {
    State.name1 = DOM.name1.textContent.trim() || "Your Name";
    API.saveData();
  });

  DOM.name2.addEventListener("blur", () => {
    State.name2 = DOM.name2.textContent.trim() || "Partner";
    API.saveData();
  });

  [DOM.name1, DOM.name2].forEach((el) => {
    el.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        el.blur();
      }
    });
  });
}

function initPoems() {
  renderPoems();

  $("#addPoemBtn").addEventListener("click", () => openModal("poemModal"));
  $("#closePoemModal").addEventListener("click", () => closeModal("poemModal"));
  $("#closeEditPoemModal").addEventListener("click", () => closeModal("editPoemModal"));

  $("#savePoemBtn").addEventListener("click", () => {
    const title = $("#poemTitleInput").value.trim();
    const text = $("#poemTextInput").value.trim();
    if (!title || !text) return;

    State.poems.unshift({
      id: Date.now(),
      title,
      text,
      date: new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
    });

    API.saveData();
    renderPoems();
    closeModal("poemModal");
    $("#poemTitleInput").value = "";
    $("#poemTextInput").value = "";
  });

  $("#updatePoemBtn").addEventListener("click", () => {
    const id = parseInt($("#editPoemId").value);
    const title = $("#editPoemTitleInput").value.trim();
    const text = $("#editPoemTextInput").value.trim();
    if (!title || !text) return;

    const poem = State.poems.find((p) => p.id === id);
    if (poem) {
      poem.title = title;
      poem.text = text;
      API.saveData();
      renderPoems();
    }
    closeModal("editPoemModal");
  });
}

function renderPoems() {
  DOM.poemsGrid.innerHTML = State.poems
    .map(
      (poem, i) => `
    <div class="poem-card" style="animation-delay: ${i * 0.1}s">
      <div class="poem-card-actions">
        <button class="card-action-btn" onclick="editPoem(${poem.id})" title="Edit">âœï¸</button>
        <button class="card-action-btn" onclick="deletePoem(${poem.id})" title="Delete">ðŸ—‘ï¸</button>
      </div>
      <h3 class="poem-card-title">${escapeHtml(poem.title)}</h3>
      <p class="poem-card-text">${escapeHtml(poem.text)}</p>
      <span class="poem-card-date">${poem.date}</span>
    </div>
  `
    )
    .join("");
}

window.editPoem = function (id) {
  const poem = State.poems.find((p) => p.id === id);
  if (!poem) return;
  $("#editPoemTitleInput").value = poem.title;
  $("#editPoemTextInput").value = poem.text;
  $("#editPoemId").value = id;
  openModal("editPoemModal");
};

window.deletePoem = function (id) {
  if (!confirm("Delete this poem?")) return;
  State.poems = State.poems.filter((p) => p.id !== id);
  API.saveData();
  renderPoems();
};

function initGallery() {
  renderGallery();

  $("#addPhotoBtn").addEventListener("click", () => {
    resetPhotoModal();
    openModal("photoModal");
  });
  $("#closePhotoModal").addEventListener("click", () => closeModal("photoModal"));

  const uploadArea = $("#photoUploadArea");
  const fileInput = $("#photoFileInput");

  uploadArea.addEventListener("click", () => fileInput.click());
  uploadArea.addEventListener("dragover", (e) => {
    e.preventDefault();
    uploadArea.classList.add("dragover");
  });
  uploadArea.addEventListener("dragleave", () => uploadArea.classList.remove("dragover"));
  uploadArea.addEventListener("drop", (e) => {
    e.preventDefault();
    uploadArea.classList.remove("dragover");
    const file = e.dataTransfer.files[0];
    if (file && (file.type.startsWith("image/") || file.type.startsWith("video/"))) {
      handlePhotoFile(file);
    }
  });

  fileInput.addEventListener("change", (e) => {
    if (e.target.files[0]) handlePhotoFile(e.target.files[0]);
  });

  $("#savePhotoBtn").addEventListener("click", async () => {
    const saveBtn = $("#savePhotoBtn");
    const caption = $("#photoCaptionInput").value.trim();
    if (!saveBtn._pendingFile) return;

    const originalText = saveBtn.textContent;
    saveBtn.textContent = "Uploading...";
    saveBtn.disabled = true;

    try {
      const result = await API.uploadFile(saveBtn._pendingFile);

      State.photos.unshift({
        id: Date.now(),
        src: result.url,
        type: isVideoFile(saveBtn._pendingFile) ? "video" : "image",
        caption: caption || "A sweet memory ðŸ’•",
        date: new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
      });

      API.saveData();
      renderGallery();
      closeModal("photoModal");
    } catch (e) {
      console.error(e);
      showToast("Failed to upload memory", true);
    } finally {
      saveBtn._pendingFile = null;
      saveBtn._pendingUrl = null;
      saveBtn.textContent = originalText;
      saveBtn.disabled = false;
    }
  });

  $("#closeLightbox").addEventListener("click", closeLightbox);
  DOM.lightbox.addEventListener("click", (e) => {
    if (e.target === DOM.lightbox) closeLightbox();
  });
}

function isVideoFile(file) {
  return file.type.startsWith("video/") || file.name.match(/\.(mp4|webm|ogg|mov|mkv)$/i);
}

function handlePhotoFile(file) {
  const imgPreview = $("#photoPreview");
  const vidPreview = $("#videoPreview");
  const placeholder = $("#photoUploadArea .upload-placeholder");
  const tempUrl = URL.createObjectURL(file);
  const saveBtn = $("#savePhotoBtn");
  saveBtn._pendingFile = file;
  saveBtn._pendingUrl = tempUrl;

  if (isVideoFile(file)) {
    vidPreview.src = tempUrl;
    vidPreview.style.display = "block";
    imgPreview.style.display = "none";
  } else {
    imgPreview.src = tempUrl;
    imgPreview.style.display = "block";
    vidPreview.style.display = "none";
  }
  if (placeholder) placeholder.style.display = "none";
}

function resetPhotoModal() {
  const imgPreview = $("#photoPreview");
  const vidPreview = $("#videoPreview");
  const placeholder = $("#photoUploadArea .upload-placeholder");
  imgPreview.src = "";
  imgPreview.style.display = "none";
  vidPreview.src = "";
  vidPreview.style.display = "none";
  if (placeholder) placeholder.style.display = "";
  $("#photoCaptionInput").value = "";
  $("#photoFileInput").value = "";
}

function renderGallery() {
  DOM.galleryGrid.innerHTML = State.photos
    .map(
      (photo, i) => `
    <div class="photo-card" style="animation-delay: ${i * 0.1}s">
      <button class="photo-card-delete" onclick="deletePhoto(event, ${photo.id})" title="Delete">ðŸ—‘ï¸</button>
      <div class="photo-card-img-wrap" onclick="openLightbox('${escapeAttr(photo.src)}', '${escapeAttr(photo.caption)}', '${photo.type || "image"}')">
        ${photo.type === 'video'
          ? `<video class="photo-card-img" src="${escapeAttr(photo.src)}" preload="metadata"></video><div class="video-play-indicator">â–¶</div>`
          : `<img class="photo-card-img" src="${escapeAttr(photo.src)}" alt="${escapeAttr(photo.caption)}" loading="lazy">`
        }
        <div class="photo-card-overlay">
          <span>Click to view ðŸ”</span>
        </div>
      </div>
      <div class="photo-card-caption">
        <p>${escapeHtml(photo.caption)}</p>
        <small>${photo.date}</small>
      </div>
    </div>
  `
    )
    .join("");
}

window.deletePhoto = function (event, id) {
  event.stopPropagation();
  if (!confirm("Delete this memory?")) return;
  State.photos = State.photos.filter((p) => p.id !== id);
  API.saveData();
  renderGallery();
};

window.openLightbox = function (src, caption, type) {
  if (type === 'video') {
    DOM.lightboxVid = $("#lightboxVideo");
    DOM.lightboxVid.src = src;
    DOM.lightboxVid.style.display = "block";
    DOM.lightboxImg.style.display = "none";
  } else {
    DOM.lightboxImg.src = src;
    DOM.lightboxImg.style.display = "block";
    if ($("#lightboxVideo")) $("#lightboxVideo").style.display = "none";
  }
  DOM.lightboxCaption.textContent = caption;
  DOM.lightbox.classList.add("open");
  document.body.style.overflow = "hidden";
};

function closeLightbox() {
  DOM.lightbox.classList.remove("open");
  document.body.style.overflow = "";
  if ($("#lightboxVideo")) {
    $("#lightboxVideo").pause();
    $("#lightboxVideo").src = "";
  }
}

function initMusicPlayer() {
  const audio = State.audio;
  audio.volume = 0.8;

  DOM.playBtn.addEventListener("click", togglePlay);
  DOM.prevBtn.addEventListener("click", playPrev);
  DOM.nextBtn.addEventListener("click", playNext);

  DOM.progressBarContainer.addEventListener("click", (e) => {
    if (!audio.duration) return;
    const rect = DOM.progressBarContainer.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    audio.currentTime = pct * audio.duration;
  });

  DOM.volumeSlider.addEventListener("input", (e) => {
    audio.volume = e.target.value / 100;
    updateVolumeIcon();
  });

  DOM.volumeIcon.addEventListener("click", () => {
    audio.muted = !audio.muted;
    updateVolumeIcon();
  });

  audio.addEventListener("timeupdate", updateProgress);
  audio.addEventListener("loadedmetadata", () => {
    DOM.totalTime.textContent = formatTime(audio.duration);
  });
  audio.addEventListener("ended", playNext);

  DOM.playlistToggleBtn.addEventListener("click", () => {
    DOM.playlistPanel.classList.toggle("open");
  });

  document.addEventListener("click", (e) => {
    if (
      !DOM.playlistPanel.contains(e.target) &&
      !DOM.playlistToggleBtn.contains(e.target) &&
      DOM.playlistPanel.classList.contains("open")
    ) {
      DOM.playlistPanel.classList.remove("open");
    }
  });

  $("#addSongBtn").addEventListener("click", () => openModal("songModal"));
  $("#closeSongModal").addEventListener("click", () => closeModal("songModal"));

  const songUploadArea = $("#songUploadArea");
  const songFileInput = $("#songFileInput");

  songUploadArea.addEventListener("click", () => songFileInput.click());

  songFileInput.addEventListener("change", (e) => {
    if (e.target.files[0]) {
      const file = e.target.files[0];
      $("#songFileName").textContent = `ðŸ“Ž ${file.name}`;
      songUploadArea._file = file;
    }
  });

  $("#saveSongBtn").addEventListener("click", async () => {
    const title = $("#songTitleInput").value.trim();
    const artist = $("#songArtistInput").value.trim();
    const file = songUploadArea._file;
    const saveBtn = $("#saveSongBtn");

    // Title and audio file are required
    if (!title || !file) {
      showToast("Title and audio file are required!", true);
      return;
    }

    // Change button status to loading so you know it's uploading
    const originalText = saveBtn.textContent;
    saveBtn.textContent = "Uploading... ðŸŽµ";
    saveBtn.disabled = true;

    try {
      const result = await API.uploadFile(file);
      const song = {
        title,
        artist: artist || "Unknown Artist",
        url: result.url,
      };

      State.playlist.push(song);
      API.saveData();
      renderPlaylist();
      closeModal("songModal");

      $("#songTitleInput").value = "";
      $("#songArtistInput").value = "";
      $("#songFileName").textContent = "";
      songUploadArea._file = null;
      $("#songFileInput").value = "";

      if (State.playlist.length === 1) {
        playSong(0);
      }
    } catch (e) {
      console.error(e);
      showToast("Failed to upload song", true);
    } finally {
      saveBtn.textContent = originalText;
      saveBtn.disabled = false;
    }
  });

  renderPlaylist();
}

function togglePlay() {
  if (State.playlist.length === 0) return;
  if (State.currentSongIndex < 0) {
    playSong(0);
    return;
  }

  if (State.isPlaying) {
    State.audio.pause();
    State.isPlaying = false;
    DOM.playBtn.textContent = "â–¶";
    DOM.playBtn.classList.remove("playing");
  } else {
    State.audio.play().catch(() => showToast("Browser blocked autoplay audio", true));
    State.isPlaying = true;
    DOM.playBtn.textContent = "â¸";
    DOM.playBtn.classList.add("playing");
  }
}

function playSong(index) {
  if (index < 0 || index >= State.playlist.length) return;

  const song = State.playlist[index];
  State.currentSongIndex = index;

  if (!song.url) {
    DOM.playerSongTitle.textContent = song.title + " (needs audio file)";
    DOM.playerArtist.textContent = song.artist;
    return;
  }

  State.audio.src = song.url;
  State.audio.play().catch(() => showToast("Browser blocked autoplay audio", true));
  State.isPlaying = true;

  DOM.playerSongTitle.textContent = song.title;
  DOM.playerArtist.textContent = song.artist;
  DOM.playBtn.textContent = "â¸";
  DOM.playBtn.classList.add("playing");
  DOM.albumArt.textContent = "ðŸŽµ";

  renderPlaylist();
}

function playNext() {
  if (State.playlist.length === 0) return;
  const next = (State.currentSongIndex + 1) % State.playlist.length;
  playSong(next);
}

function playPrev() {
  if (State.playlist.length === 0) return;
  if (State.audio.currentTime > 3) {
    State.audio.currentTime = 0;
    return;
  }
  const prev = State.currentSongIndex <= 0 ? State.playlist.length - 1 : State.currentSongIndex - 1;
  playSong(prev);
}

function updateProgress() {
  const audio = State.audio;
  if (!audio.duration) return;
  const pct = (audio.currentTime / audio.duration) * 100;
  DOM.progressBarFill.style.width = pct + "%";
  DOM.currentTime.textContent = formatTime(audio.currentTime);
}

function updateVolumeIcon() {
  const v = State.audio.muted ? 0 : State.audio.volume;
  DOM.volumeIcon.textContent = v === 0 ? "ðŸ”‡" : v < 0.5 ? "ðŸ”‰" : "ðŸ”Š";
}

function formatTime(sec) {
  if (!sec || isNaN(sec)) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function renderPlaylist() {
  if (State.playlist.length === 0) {
    DOM.playlistList.innerHTML = '<li class="playlist-empty">No songs yet. Add your favorite songs! ðŸŽµ</li>';
    return;
  }

  DOM.playlistList.innerHTML = State.playlist
    .map(
      (song, i) => `
    <li class="playlist-item ${i === State.currentSongIndex ? "active" : ""}" onclick="playSong(${i})">
      <span class="playlist-item-icon">${i === State.currentSongIndex && State.isPlaying ? "ðŸ”Š" : "ðŸŽµ"}</span>
      <div class="playlist-item-info">
        <div class="playlist-item-title">${escapeHtml(song.title)}${!song.url ? " âš ï¸" : ""}</div>
        <div class="playlist-item-artist">${escapeHtml(song.artist)}</div>
      </div>
      <button class="playlist-item-delete" onclick="deleteSong(event, ${i})" title="Remove">âœ•</button>
    </li>
  `
    )
    .join("");
}

window.playSong = playSong;

window.deleteSong = function (event, index) {
  event.stopPropagation();
  if (index === State.currentSongIndex) {
    State.audio.pause();
    State.isPlaying = false;
    State.currentSongIndex = -1;
    DOM.playBtn.textContent = "â–¶";
    DOM.playBtn.classList.remove("playing");
    DOM.playerSongTitle.textContent = "No Song Playing";
    DOM.playerArtist.textContent = "Upload a song to start";
    DOM.progressBarFill.style.width = "0%";
  } else if (index < State.currentSongIndex) {
    State.currentSongIndex--;
  }

  if (State.playlist[index].url) {
    URL.revokeObjectURL(State.playlist[index].url);
  }

  State.playlist.splice(index, 1);
  API.saveData();
  renderPlaylist();
};

function openModal(id) {
  const modal = $(`#${id}`);
  if (modal) {
    modal.classList.add("open");
    document.body.style.overflow = "hidden";
  }
}

function closeModal(id) {
  const modal = $(`#${id}`);
  if (modal) {
    modal.classList.remove("open");
    document.body.style.overflow = "";
  }
}

$$(".modal-overlay").forEach((overlay) => {
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) {
      overlay.classList.remove("open");
      document.body.style.overflow = "";
    }
  });
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    $$(".modal-overlay.open").forEach((m) => m.classList.remove("open"));
    closeLightbox();
    document.body.style.overflow = "";
  }
  if (e.code === "Space" && !["INPUT", "TEXTAREA"].includes(document.activeElement.tagName) && !document.activeElement.contentEditable) {
    e.preventDefault();
    togglePlay();
  }
});

function initScrollReveal() {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) entry.target.classList.add("visible");
      });
    },
    { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
  );
  $(".reveal").forEach((el) => observer.observe(el));
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function escapeAttr(str) {
  return str.replace(/'/g, "\\'").replace(/"/g, "&quot;");
}

document.addEventListener("DOMContentLoaded", initApp);

