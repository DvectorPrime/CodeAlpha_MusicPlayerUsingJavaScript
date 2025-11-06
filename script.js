const audio = document.getElementById('audio');
const player = document.querySelector('.player');
const albumArt = document.getElementById('album-art');
const progressBarContainer = document.getElementById('progress');
const progressBar = document.getElementById('progress-bar');
const playIcon = document.getElementById('playIcon')
const pauseIcon = document.getElementById('pauseIcon')
const loadBtn = document.getElementById('loadBtn');
const totalDuration = document.getElementById('total-time')
const currentTimeDisplay = document.getElementById('current-time')
const playlist = document.getElementById('playlist');
const title = document.getElementById('song-title');
const artist = document.getElementById('song-artist');
const volumeSlider = document.getElementById('volume');
const volumeValue = document.getElementById('volume-value');
const muteBtn = document.getElementById('mute');
const muteIcon = muteBtn.querySelector('i');
const shuffleBtn = document.getElementById('shuffle');
const shuffleIcon = shuffleBtn.querySelector('i');
const repeatBtn = document.getElementById('repeat');
const repeatIcon = repeatBtn.querySelector('i');


let songs = [];
let currentIndex = 0;
let lastVolume = 1;
let isShuffle = false;
let repeatMode = 0

loadBtn.addEventListener('click', async () => {
  const dirHandle = await window.showDirectoryPicker();
  songs = [];

  for await (const [name, handle] of dirHandle.entries()) {
    if (name.endsWith('.mp3') || name.endsWith('.wav')) {
      const file = await handle.getFile();
      songs.push({ name, file, url: URL.createObjectURL(file) });
    }
  }

  renderPlaylist();
  playSong(0)
});

function renderPlaylist() {
  playlist.innerHTML = songs.map((s, i) => 
    `<div class="song-item ${currentIndex == i ? "current" : ""}" onclick="playSong(${i})">${i + 1}. ${s.name}</div>`
  ).join('');
}

async function loadSong(index) {
    const song = songs[index];
    if (!song) return;

    albumArt.src = 'square-image.jpg';

    try {
        const songData = await getMetaData(song.file);
        
        console.log("Metadata:", songData);
        
        title.textContent = songData.title || song.name;
        artist.textContent = songData.artist || "Unknown Artist";

        if (songData.picture) {
          let base64String = "";
          const data = songData.picture.data;
          const format = songData.picture.format;
          for (let i = 0; i < data.length; i++) {
            base64String += String.fromCharCode(data[i]);
          }
          const imageUrl = `data:${format};base64,${window.btoa(base64String)}`;
          albumArt.src = imageUrl;
        } else {
          albumArt.src = 'square-image.jpg';
        }
        
    } catch (error) {
        console.error('Failed to load song metadata:', error);
        title.textContent = song.name;
        artist.textContent = "Unknown Artist (Metadata Error)";
        albumArt.src = 'default.png';
    }

    audio.src = song.url;
}

async function playSong(index) {
  currentIndex = index;
  await loadSong(index);
  audio.play();

  playIcon.classList.add("hidden")
  pauseIcon.classList.remove("hidden")

  renderPlaylist()
}


audio.addEventListener('loadedmetadata', () => {
    const totalAudioTImeInSeconds = Math.round(audio.duration)
    totalDuration.innerHTML = `${Math.floor(totalAudioTImeInSeconds / 60)}:${totalAudioTImeInSeconds % 60}`
})

audio.addEventListener('play', () => {
  player.classList.add('playing');
});
audio.addEventListener('pause', () => {
  player.classList.remove('playing');
});
audio.addEventListener('ended', () => {
  player.classList.remove('playing');
});

document.getElementById('play').addEventListener('click', () => {
    if (audio.paused){
        audio.play()
        playIcon.classList.add("hidden")
        pauseIcon.classList.remove("hidden")
    } else {
        audio.pause()
        playIcon.classList.remove("hidden")
        pauseIcon.classList.add("hidden")
    }
});

document.getElementById('next').addEventListener('click', () => {
  currentIndex = (currentIndex + 1) % songs.length;
  playSong(currentIndex);
});

document.getElementById('prev').addEventListener('click', () => {
  currentIndex = (currentIndex - 1 + songs.length) % songs.length;
  playSong(currentIndex);
});

audio.addEventListener('timeupdate', () => {
  const progress = (audio.currentTime / audio.duration) * 100;
  progressBar.style.width = `${progress}%`;
  currentTimeDisplay.innerHTML = `${Math.floor(audio.currentTime / 60)}:${audio.currentTime % 60 < 10 ? "0" + Math.floor(audio.currentTime % 60) : Math.floor(audio.currentTime % 60)}`

});


progressBarContainer.addEventListener('click', (e) => {
    const width = progressBarContainer.clientWidth;
    
    const clickX = e.offsetX; 
    const clickPercent = (clickX / width);

    if (!isNaN(audio.duration)) {
        const newTime = clickPercent * audio.duration;
        
        audio.currentTime = newTime;
    }
});

function getMetaData(file){
    return new Promise((resolve, reject) => {
        if (!window.jsmediatags) {
            return reject("Jsmediatags library Not Found")
        }

        jsmediatags.read(file, {
        onSuccess: function(tag) {
            resolve(tag.tags)
        },
        onError: function(error) {
            console.error('Error reading metadata:', error);
            reject("No metadata found")
        }
        });
    })
}

volumeSlider.addEventListener('input', () => {
  audio.volume = volumeSlider.value;
  volumeValue.textContent = Math.round(audio.volume * 100) + '%';
  if (audio.volume === 0) {
    muteIcon.className = 'fa-solid fa-volume-xmark';
  } else {
    audio.muted = false;
    muteIcon.className = 'fa-solid fa-volume-high';
  }
});

muteBtn.addEventListener('click', () => {
  if (audio.muted || audio.volume === 0) {
    audio.muted = false;
    audio.volume = lastVolume;
    volumeSlider.value = lastVolume;
    volumeValue.textContent = Math.round(lastVolume * 100) + '%';
    muteIcon.className = 'fa-solid fa-volume-high';
  } else {
    lastVolume = audio.volume;
    audio.muted = true;
    audio.volume = 0;
    volumeSlider.value = 0;
    volumeValue.textContent = '0%';
    muteIcon.className = 'fa-solid fa-volume-xmark';
  }
});

// 🔁 Toggle shuffle mode
shuffleBtn.addEventListener('click', () => {
  isShuffle = !isShuffle;
  shuffleBtn.classList.toggle('active', isShuffle);
});

// 🎵 When song ends
audio.addEventListener('ended', () => {
  if (repeatMode === 1) {
    // Repeat current song
    audio.currentTime = 0;
    audio.play();
  } else if (isShuffle) {
    // Shuffle mode
    playRandomSong();
  } else {
    // Repeat all: move to next, loop back if needed
    playNextSong();
  }
});

// ▶️ Play next song (normal)

repeatBtn.addEventListener('click', () => {
  repeatMode = (repeatMode + 1) % 2;
  
  // Reset all visual states
  repeatBtn.classList.remove('active');
  repeatIcon.className = 'fa-solid fa-repeat';
  
  if (repeatMode === 1) {
    repeatBtn.classList.add('active');
  }
});

function playNextSong() {
  currentIndex = (currentIndex + 1) % songs.length;
  playSong(currentIndex);
}

// 🔀 Play random song (shuffle)
function playRandomSong() {
  let randomIndex;
  do {
    randomIndex = Math.floor(Math.random() * songs.length);
  } while (randomIndex === currentIndex && songs.length > 1);
  currentIndex = randomIndex;
  playSong(currentIndex);
}