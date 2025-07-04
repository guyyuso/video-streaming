// Global variables
let currentVideo = null;
let videoDatabase = [];
let myList = JSON.parse(localStorage.getItem('myList')) || [];

// DOM elements
const videoGrid = document.getElementById('videoGrid');
const searchInput = document.getElementById('searchInput');
const playerModal = document.getElementById('playerModal');
const videoPlayer = document.getElementById('videoPlayer');
const closePlayer = document.getElementById('closePlayer');
const loadingIndicator = document.getElementById('loadingIndicator');
const uploadSection = document.getElementById('uploadSection');
const featuredSection = document.getElementById('featuredSection');

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    loadVideos();
    setupEventListeners();
    setupNavigation();
    setupUploadForm();
});

// Event listeners
function setupEventListeners() {
    // Header scroll effect
    window.addEventListener('scroll', () => {
        const header = document.querySelector('header');
        if (window.scrollY > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    });

    // Search functionality
    searchInput.addEventListener('input', debounce(handleSearch, 300));
    searchInput.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    });

    // Player modal
    closePlayer.addEventListener('click', closeVideoPlayer);
    playerModal.addEventListener('click', (e) => {
        if (e.target === playerModal) {
            closeVideoPlayer();
        }
    });

    // Hero buttons
    document.getElementById('uploadBtn').addEventListener('click', () => {
        showSection('upload');
    });

    document.getElementById('browseBtn').addEventListener('click', () => {
        showSection('home');
    });

    // Refresh videos
    document.getElementById('refreshVideos').addEventListener('click', loadVideos);

    // Player actions
    document.getElementById('addToListBtn').addEventListener('click', addToMyList);
    document.getElementById('deleteVideoBtn').addEventListener('click', deleteCurrentVideo);
}

// Navigation
function setupNavigation() {
    const navLinks = document.querySelectorAll('nav a[data-section]');
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const section = link.getAttribute('data-section');
            showSection(section);
            
            // Update active state
            navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');
        });
    });
}

// Show/hide sections
function showSection(section) {
    const sections = {
        'home': featuredSection,
        'upload': uploadSection,
        'movies': featuredSection,
        'tvshows': featuredSection,
        'mylist': featuredSection
    };

    // Hide all sections
    Object.values(sections).forEach(s => s.style.display = 'none');
    
    // Show selected section
    if (sections[section]) {
        sections[section].style.display = 'block';
    }

    // Load appropriate content
    if (section === 'movies') {
        loadVideos('movies');
    } else if (section === 'tvshows') {
        loadVideos('tvshows');
    } else if (section === 'mylist') {
        loadMyList();
    } else if (section === 'home') {
        loadVideos();
    }
}

// Upload form setup
function setupUploadForm() {
    const uploadArea = document.getElementById('uploadArea');
    const videoFile = document.getElementById('videoFile');
    const uploadForm = document.getElementById('uploadForm');

    // Click to upload
    uploadArea.addEventListener('click', () => {
        videoFile.click();
    });

    // Drag and drop
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.style.borderColor = '#e50914';
    });

    uploadArea.addEventListener('dragleave', () => {
        uploadArea.style.borderColor = '#808080';
    });

    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.style.borderColor = '#808080';
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            videoFile.files = files;
            handleFileSelect(files[0]);
        }
    });

    // File input change
    videoFile.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFileSelect(e.target.files[0]);
        }
    });

    // Form submission
    uploadForm.addEventListener('submit', handleUpload);
}

// Handle file selection
function handleFileSelect(file) {
    const fileName = file.name;
    const fileSize = (file.size / 1024 / 1024).toFixed(2);
    
    document.querySelector('#uploadArea p').innerHTML = `
        <strong>${fileName}</strong><br>
        Size: ${fileSize} MB<br>
        <small>Ready to upload</small>
    `;
    
    // Auto-fill title if empty
    const titleInput = document.getElementById('videoTitle');
    if (!titleInput.value) {
        titleInput.value = fileName.replace(/\.[^/.]+$/, "");
    }
}

// Handle upload
async function handleUpload(e) {
    e.preventDefault();
    
    const formData = new FormData();
    const videoFile = document.getElementById('videoFile').files[0];
    const title = document.getElementById('videoTitle').value;
    const category = document.getElementById('videoCategory').value;
    const description = document.getElementById('videoDescription').value;

    if (!videoFile) {
        alert('Please select a video file');
        return;
    }

    formData.append('video', videoFile);
    formData.append('title', title);
    formData.append('category', category);
    formData.append('description', description);

    showLoading(true);

    try {
        const response = await fetch('/upload', {
            method: 'POST',
            body: formData
        });

        const result = await response.json();

        if (result.success) {
            alert('Video uploaded and compressed successfully!');
            document.getElementById('uploadForm').reset();
            document.querySelector('#uploadArea p').innerHTML = 'Drag & drop your video here or click to browse';
            loadVideos();
            showSection('home');
        } else {
            alert('Upload failed: ' + result.error);
        }
    } catch (error) {
        console.error('Upload error:', error);
        alert('Upload failed. Please try again.');
    } finally {
        showLoading(false);
    }
}

// Load videos from server
async function loadVideos(category = null) {
    try {
        const response = await fetch('/api/videos');
        const videos = await response.json();
        
        videoDatabase = videos;
        
        let filteredVideos = videos;
        if (category) {
            filteredVideos = videos.filter(video => 
                video.category.toLowerCase() === category.toLowerCase()
            );
        }
        
        displayVideos(filteredVideos);
    } catch (error) {
        console.error('Error loading videos:', error);
        displayEmptyState();
    }
}

// Display videos
function displayVideos(videos) {
    if (videos.length === 0) {
        displayEmptyState();
        return;
    }

    const videoHTML = videos.map(video => `
        <div class="video-card" data-video-id="${video.id}">
            <div class="thumbnail">
                <img src="/thumbnails/${video.thumbnail}" alt="${video.title}" onerror="this.style.display='none'">
                <div class="duration">${video.duration}</div>
                <div class="play-icon">
                    <i class="fas fa-play"></i>
                </div>
            </div>
            <div class="video-info">
                <h3>${video.title}</h3>
                <div class="video-meta">
                    <span>${video.uploadDate.split('T')[0]}</span>
                    <span>${video.rating}</span>
                </div>
                <div class="views-count">${video.views} views</div>
                <span class="category-badge">${video.category}</span>
            </div>
        </div>
    `).join('');

    videoGrid.innerHTML = videoHTML;

    // Add click handlers
    const videoCards = document.querySelectorAll('.video-card');
    videoCards.forEach(card => {
        card.addEventListener('click', () => {
            const videoId = card.getAttribute('data-video-id');
            playVideo(videoId);
        });
    });
}

// Display empty state
function displayEmptyState() {
    videoGrid.innerHTML = `
        <div class="empty-state">
            <i class="fas fa-film"></i>
            <h3>No videos found</h3>
            <p>Upload your first video to get started!</p>
            <button class="btn btn-primary" onclick="showSection('upload')">
                <i class="fas fa-upload"></i> Upload Video
            </button>
        </div>
    `;
}

// Play video
async function playVideo(videoId) {
    try {
        const response = await fetch(`/api/videos/${videoId}`);
        const video = await response.json();
        
        if (video.error) {
            alert('Video not found');
            return;
        }

        currentVideo = video;
        
        // Set video source
        videoPlayer.src = `/videos/${video.filename}`;
        
        // Update modal content
        document.getElementById('playerTitle').textContent = video.title;
        document.getElementById('playerDescription').textContent = video.description || 'No description available';
        
        // Show modal
        playerModal.classList.add('active');
        document.body.style.overflow = 'hidden';
        
        // Play video
        videoPlayer.play();
        
    } catch (error) {
        console.error('Error playing video:', error);
        alert('Error playing video');
    }
}

// Close video player
function closeVideoPlayer() {
    playerModal.classList.remove('active');
    videoPlayer.pause();
    videoPlayer.src = '';
    document.body.style.overflow = 'auto';
    currentVideo = null;
}

// Search videos
async function handleSearch() {
    const query = searchInput.value.trim();
    
    if (!query) {
        loadVideos();
        return;
    }

    try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const videos = await response.json();
        displayVideos(videos);
    } catch (error) {
        console.error('Search error:', error);
    }
}

// Add to my list
function addToMyList() {
    if (!currentVideo) return;
    
    if (!myList.find(video => video.id === currentVideo.id)) {
        myList.push(currentVideo);
        localStorage.setItem('myList', JSON.stringify(myList));
        alert('Added to your list!');
    } else {
        alert('Video already in your list!');
    }
}

// Load my list
function loadMyList() {
    const myListVideos = JSON.parse(localStorage.getItem('myList')) || [];
    displayVideos(myListVideos);
}

// Delete current video
async function deleteCurrentVideo() {
    if (!currentVideo) return;
    
    if (confirm('Are you sure you want to delete this video?')) {
        try {
            const response = await fetch(`/api/videos/${currentVideo.id}`, {
                method: 'DELETE'
            });
            
            const result = await response.json();
            
            if (result.success) {
                alert('Video deleted successfully');
                closeVideoPlayer();
                loadVideos();
            } else {
                alert('Error deleting video');
            }
        } catch (error) {
            console.error('Delete error:', error);
            alert('Error deleting video');
        }
    }
}

// Show/hide loading indicator
function showLoading(show) {
    loadingIndicator.style.display = show ? 'flex' : 'none';
}

// Debounce function
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && playerModal.classList.contains('active')) {
        closeVideoPlayer();
    }
});