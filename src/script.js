/* ==============================================
   Sweet Memories — Application Logic
   ============================================== */

// ─── DOM References ───
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

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
  // Music Player
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
  // Modals
  poemModal: $("#poemModal"),
  photoModal: $("#photoModal"),
  songModal: $("#songModal"),
  editPoemModal: $("#editPoemModal"),
  // Lightbox
  lightbox: $("#lightbox"),
  lightboxImg: $("#lightboxImg"),
  lightboxVideo: $("#lightboxVideo"),
  lightboxCaption: $("#lightboxCaption"),
};

// ─── State ───
const State = {
  poems: [],
  photos: [],
  playlist: [],
  currentSongIndex: -1,
  isPlaying: false,
  audio: new Audio(),
  anniversary: null,
  name1: "Your Name",
  name2: "Partner",
};

// ─── Backend Storage ───
const Storage = {
  async save() {
    const data = {
      poems: State.poems,
      photos: State.photos.map(p => ({
        id: p.id,
        type: p.type,
        caption: p.caption,
        date: p.date,
        src: p.src
      })),
      playlist: State.playlist.map(({ title, artist }) => ({ title, artist })),
      anniversary: State.anniversary,
      name1: State.name1,
      name2: State.name2,
    };
    try {
      await fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
    } catch (e) {
      console.warn("Backend save failed:", e);
    }
  },

  async load() {
    try {
      const res = await fetch('/api/data');
      if (res.ok) {
        const data = await res.json();
        State.poems = data.poems || [];
        State.photos = data.photos || [];
        State.anniversary = data.anniversary || null;
        State.name1 = data.name1 || "Your Name";
        State.name2 = data.name2 || "Partner";
        if (data.playlist) {
          State.playlist = data.playlist.map((s) => ({
            title: s.title,
            artist: s.artist,
            url: null,
          }));
        }
      }
    } catch (e) {
      console.warn("Backend load failed:", e);
    }
  }
};

// ─── Floating Hearts ───
function initFloatingHearts() {
  const hearts = ["💕", "❤️", "💗", "💖", "💘", "🌸", "🩷", "💓"];
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

// ─── Navigation ───
function initNavigation() {
  // Mobile toggle
  DOM.navToggle.addEventListener("click", () => {
    DOM.navToggle.classList.toggle("open");
    DOM.navLinks.classList.toggle("open");
  });

  // Close mobile menu on link click
  $$(".nav-link").forEach((link) => {
    link.addEventListener("click", () => {
      DOM.navToggle.classList.remove("open");
      DOM.navLinks.classList.remove("open");
    });
  });

  // Navbar scroll effect
  let lastScroll = 0;
  window.addEventListener("scroll", () => {
    DOM.navbar.classList.toggle("scrolled", window.scrollY > 50);

    // Active link based on scroll position
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

    lastScroll = window.scrollY;
  });
}

// ─── Days Counter ───
function initDaysCounter() {
  if (State.anniversary) {
    DOM.startDate.value = State.anniversary;
  }

  DOM.startDate.addEventListener("change", (e) => {
    State.anniversary = e.target.value;
    Storage.save();
    updateDaysCount();
  });

  updateDaysCount();
  setInterval(updateDaysCount, 60000);
}

function updateDaysCount() {
  if (!State.anniversary) {
    DOM.daysCount.textContent = "∞";
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

// ─── Couple Names ───
function initCoupleNames() {
  DOM.name1.textContent = State.name1;
  DOM.name2.textContent = State.name2;

  DOM.name1.addEventListener("blur", () => {
    State.name1 = DOM.name1.textContent.trim() || "Your Name";
    Storage.save();
  });

  DOM.name2.addEventListener("blur", () => {
    State.name2 = DOM.name2.textContent.trim() || "Partner";
    Storage.save();
  });

  // Prevent Enter key in contenteditable
  [DOM.name1, DOM.name2].forEach((el) => {
    el.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        el.blur();
      }
    });
  });
}

// ─── Poems ───
function initPoems() {
  // Default poems if empty
  if (State.poems.length === 0) {
    State.poems = [
      {
        id: Date.now(),
        title: "First Moment",
        text: "Our eyes met like stars aligning,\nIn that moment, time stood still.\nThe world was bright and shining,\nWith a love only we could feel.",
        date: new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
      },
      {
        id: Date.now() + 1,
        title: "Forever Yours",
        text: "In every heartbeat, I find you,\nIn every breath, you're there.\nThrough every storm, I'll hold you,\nA love beyond compare.",
        date: new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
      },
    ];
    Storage.save();
  }

  renderPoems();

  // Add poem button
  $("#addPoemBtn").addEventListener("click", () => openModal("poemModal"));
  $("#closePoemModal").addEventListener("click", () => closeModal("poemModal"));
  $("#closeEditPoemModal").addEventListener("click", () => closeModal("editPoemModal"));

  // Save poem
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

    Storage.save();
    renderPoems();
    closeModal("poemModal");
    $("#poemTitleInput").value = "";
    $("#poemTextInput").value = "";
  });

  // Update poem
  $("#updatePoemBtn").addEventListener("click", () => {
    const id = parseInt($("#editPoemId").value);
    const title = $("#editPoemTitleInput").value.trim();
    const text = $("#editPoemTextInput").value.trim();
    if (!title || !text) return;

    const poem = State.poems.find((p) => p.id === id);
    if (poem) {
      poem.title = title;
      poem.text = text;
      Storage.save();
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
        <button class="card-action-btn" onclick="editPoem(${poem.id})" title="Edit">✏️</button>
        <button class="card-action-btn" onclick="deletePoem(${poem.id})" title="Delete">🗑️</button>
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
  Storage.save();
  renderPoems();
};

// ─── Gallery ───
function initGallery() {
  // Default photos from assets folder if gallery is empty
  if (State.photos.length === 0) {
    State.photos = [
      { id: 1, type: "image", src: "/assets/1.jpg", caption: "Our Beautiful Moment", date: "Forever" },
      { id: 2, type: "image", src: "/assets/2.jpg", caption: "Together Always", date: "Forever" },
      { id: 3, type: "image", src: "/assets/3.jpg", caption: "Sweet Memories", date: "Forever" },
    ];
    Storage.save();
  }

  renderGallery();

  // Add photo button
  $("#addPhotoBtn").addEventListener("click", () => {
    resetPhotoModal();
    openModal("photoModal");
  });
  $("#closePhotoModal").addEventListener("click", () => closeModal("photoModal"));

  // Photo upload area
  const uploadArea = $("#photoUploadArea");
  const fileInput = $("#photoFileInput");

  uploadArea.addEventListener("click", () => fileInput.click());

  uploadArea.addEventListener("dragover", (e) => {
    e.preventDefault();
    uploadArea.classList.add("dragover");
  });

  uploadArea.addEventListener("dragleave", () => {
    uploadArea.classList.remove("dragover");
  });

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

  // Save photo
  $("#savePhotoBtn").addEventListener("click", async () => {
    const saveBtn = $("#savePhotoBtn");
    const caption = $("#photoCaptionInput").value.trim();
    
    if (!saveBtn._pendingFile) return;

    // Change button text while uploading
    const originalText = saveBtn.textContent;
    saveBtn.textContent = "Uploading...";
    saveBtn.disabled = true;

    try {
      const formData = new FormData();
      formData.append('file', saveBtn._pendingFile);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) throw new Error("Upload failed");

      const result = await response.json();

      State.photos.unshift({
        id: Date.now(),
        src: result.url,
        type: isVideoFile(saveBtn._pendingFile) ? "video" : "image",
        caption: caption || "A sweet memory 💕",
        date: new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
      });

      Storage.save();
      renderGallery();
      closeModal("photoModal");
    } catch (e) {
      console.error(e);
      alert("Failed to upload memory");
    } finally {
      saveBtn._pendingFile = null;
      saveBtn._pendingUrl = null;
      saveBtn.textContent = originalText;
      saveBtn.disabled = false;
    }
  });

  // Lightbox
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
      <button class="photo-card-delete" onclick="deletePhoto(event, ${photo.id})" title="Delete">🗑️</button>
      <div class="photo-card-img-wrap" onclick="openLightbox('${escapeAttr(photo.src)}', '${escapeAttr(photo.caption)}', '${photo.type || "image"}')">
        ${photo.type === 'video' 
          ? `<video class="photo-card-img" src="${escapeAttr(photo.src)}" preload="metadata"></video><div class="video-play-indicator">▶</div>` 
          : `<img class="photo-card-img" src="${escapeAttr(photo.src)}" alt="${escapeAttr(photo.caption)}" loading="lazy">`
        }
        <div class="photo-card-overlay">
          <span>Click to view 🔍</span>
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
  Storage.save();
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

// ─── Music Player ───
function initMusicPlayer() {
  const audio = State.audio;
  audio.volume = 0.8;

  // Play/Pause
  DOM.playBtn.addEventListener("click", togglePlay);
  DOM.prevBtn.addEventListener("click", playPrev);
  DOM.nextBtn.addEventListener("click", playNext);

  // Progress
  DOM.progressBarContainer.addEventListener("click", (e) => {
    if (!audio.duration) return;
    const rect = DOM.progressBarContainer.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    audio.currentTime = pct * audio.duration;
  });

  // Volume
  DOM.volumeSlider.addEventListener("input", (e) => {
    audio.volume = e.target.value / 100;
    updateVolumeIcon();
  });

  DOM.volumeIcon.addEventListener("click", () => {
    audio.muted = !audio.muted;
    updateVolumeIcon();
  });

  // Audio events
  audio.addEventListener("timeupdate", updateProgress);
  audio.addEventListener("loadedmetadata", () => {
    DOM.totalTime.textContent = formatTime(audio.duration);
  });
  audio.addEventListener("ended", playNext);

  // Playlist toggle
  DOM.playlistToggleBtn.addEventListener("click", () => {
    DOM.playlistPanel.classList.toggle("open");
  });

  // Close playlist when clicking outside
  document.addEventListener("click", (e) => {
    if (
      !DOM.playlistPanel.contains(e.target) &&
      !DOM.playlistToggleBtn.contains(e.target) &&
      DOM.playlistPanel.classList.contains("open")
    ) {
      DOM.playlistPanel.classList.remove("open");
    }
  });

  // Add song
  $("#addSongBtn").addEventListener("click", () => openModal("songModal"));
  $("#closeSongModal").addEventListener("click", () => closeModal("songModal"));

  const songUploadArea = $("#songUploadArea");
  const songFileInput = $("#songFileInput");

  songUploadArea.addEventListener("click", () => songFileInput.click());

  songFileInput.addEventListener("change", (e) => {
    if (e.target.files[0]) {
      const file = e.target.files[0];
      $("#songFileName").textContent = `📎 ${file.name}`;
      songUploadArea._file = file;
    }
  });

  // Save song
  $("#saveSongBtn").addEventListener("click", () => {
    const title = $("#songTitleInput").value.trim();
    const artist = $("#songArtistInput").value.trim();
    const file = songUploadArea._file;

    if (!title) return;

    const song = {
      title,
      artist: artist || "Unknown Artist",
      url: file ? URL.createObjectURL(file) : null,
    };

    State.playlist.push(song);
    Storage.save();
    renderPlaylist();
    closeModal("songModal");

    // Reset
    $("#songTitleInput").value = "";
    $("#songArtistInput").value = "";
    $("#songFileName").textContent = "";
    songUploadArea._file = null;
    songFileInput.value = "";

    // Auto-play if first song
    if (State.playlist.length === 1 && song.url) {
      playSong(0);
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
    DOM.playBtn.textContent = "▶";
    DOM.playBtn.classList.remove("playing");
  } else {
    State.audio.play().catch(() => {});
    State.isPlaying = true;
    DOM.playBtn.textContent = "⏸";
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
  State.audio.play().catch(() => {});
  State.isPlaying = true;

  DOM.playerSongTitle.textContent = song.title;
  DOM.playerArtist.textContent = song.artist;
  DOM.playBtn.textContent = "⏸";
  DOM.playBtn.classList.add("playing");
  DOM.albumArt.textContent = "🎵";

  renderPlaylist();
}

function playNext() {
  if (State.playlist.length === 0) return;
  const next = (State.currentSongIndex + 1) % State.playlist.length;
  playSong(next);
}

function playPrev() {
  if (State.playlist.length === 0) return;
  // If more than 3 seconds in, restart instead
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
  DOM.volumeIcon.textContent = v === 0 ? "🔇" : v < 0.5 ? "🔉" : "🔊";
}

function formatTime(sec) {
  if (!sec || isNaN(sec)) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function renderPlaylist() {
  if (State.playlist.length === 0) {
    DOM.playlistList.innerHTML = '<li class="playlist-empty">No songs yet. Add your favorite songs! 🎵</li>';
    return;
  }

  DOM.playlistList.innerHTML = State.playlist
    .map(
      (song, i) => `
    <li class="playlist-item ${i === State.currentSongIndex ? "active" : ""}" onclick="playSong(${i})">
      <span class="playlist-item-icon">${i === State.currentSongIndex && State.isPlaying ? "🔊" : "🎵"}</span>
      <div class="playlist-item-info">
        <div class="playlist-item-title">${escapeHtml(song.title)}${!song.url ? " ⚠️" : ""}</div>
        <div class="playlist-item-artist">${escapeHtml(song.artist)}</div>
      </div>
      <button class="playlist-item-delete" onclick="deleteSong(event, ${i})" title="Remove">✕</button>
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
    DOM.playBtn.textContent = "▶";
    DOM.playBtn.classList.remove("playing");
    DOM.playerSongTitle.textContent = "No Song Playing";
    DOM.playerArtist.textContent = "Upload a song to start";
    DOM.progressBarFill.style.width = "0%";
  } else if (index < State.currentSongIndex) {
    State.currentSongIndex--;
  }

  // Revoke blob URL
  if (State.playlist[index].url) {
    URL.revokeObjectURL(State.playlist[index].url);
  }

  State.playlist.splice(index, 1);
  Storage.save();
  renderPlaylist();
};

// ─── Modals ───
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

// Close modals on overlay click
$$(".modal-overlay").forEach((overlay) => {
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) {
      overlay.classList.remove("open");
      document.body.style.overflow = "";
    }
  });
});

// Close modals on Escape key
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    $$(".modal-overlay.open").forEach((m) => {
      m.classList.remove("open");
    });
    closeLightbox();
    document.body.style.overflow = "";
  }
});

// ─── Scroll Reveal ───
function initScrollReveal() {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
        }
      });
    },
    { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
  );

  $$(".reveal").forEach((el) => observer.observe(el));
}

// ─── Keyboard Shortcuts ───
document.addEventListener("keydown", (e) => {
  // Space bar to toggle play (when not typing)
  if (e.code === "Space" && !["INPUT", "TEXTAREA"].includes(document.activeElement.tagName) && !document.activeElement.contentEditable) {
    e.preventDefault();
    togglePlay();
  }
});

// ─── Utilities ───
function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function escapeAttr(str) {
  return str.replace(/'/g, "\\'").replace(/"/g, "&quot;");
}

// ─── Initialize ───
document.addEventListener("DOMContentLoaded", async () => {
  await Storage.load();
  initFloatingHearts();
  initNavigation();
  initDaysCounter();
  initCoupleNames();
  initPoems();
  initGallery();
  initMusicPlayer();
  initScrollReveal();
});
