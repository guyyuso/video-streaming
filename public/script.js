class StreamHubApp {
    constructor() {
        this.currentUser = null;
        this.authToken = localStorage.getItem('authToken');
        this.ws = null;
        this.currentMedia = null;
        this.isUploading = false;
        
        this.init();
    }

    async init() {
        this.setupEventListeners();
        this.setupNavigation();
        this.setupWebSocket();
        
        if (this.authToken) {
            await this.verifyAuth();
        } else {
            this.showAuthModal();
        }
    }

    setupEventListeners() {
        // Header scroll effect
        window.addEventListener('scroll', this.handleScroll.bind(this));
        
        // Search functionality
        const searchInput = document.getElementById('searchInput');
        searchInput.addEventListener('input', this.debounce(this.handleSearch.bind(this), 300));
        
        // Authentication
        document.getElementById('authForm').addEventListener('submit', this.handleAuth.bind(this));
        document.getElementById('toggleAuth').addEventListener('click', this.toggleAuthMode.bind(this));
        document.getElementById('closeAuth').addEventListener('click', this.hideAuthModal.bind(this));
        document.getElementById('logoutLink').addEventListener('click', this.logout.bind(this));
        
        // Upload functionality
        this.setupUploadListeners();
        
        // Player modal
        document.getElementById('closePlayer').addEventListener('click', this.closePlayer.bind(this));
        document.getElementById('deleteMediaBtn').addEventListener('click', this.deleteCurrentMedia.bind(this));
        
        // Hero buttons
        document.getElementById('heroUploadBtn').addEventListener('click', () => this.showSection('upload'));
        document.getElementById('heroBrowseBtn').addEventListener('click', () => this.showSection('library'));
        
        // Library controls
        document.getElementById('categoryFilter').addEventListener('change', this.filterLibrary.bind(this));
        
        // Click outside modal to close
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal') || e.target.classList.contains('player-modal')) {
                this.hideAuthModal();
                this.closePlayer();
            }
        });
    }

    setupNavigation() {
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const section = link.getAttribute('data-section');
                this.showSection(section);
                
                // Update active state
                navLinks.forEach(l => l.classList.remove('active'));
                link.classList.add('active');
            });
        });
    }

    setupWebSocket() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}`;
        
        this.ws = new WebSocket(wsUrl);
        
        this.ws.onopen = () => {
            console.log('WebSocket connected');
            this.ws.send(JSON.stringify({ type: 'ping' }));
        };
        
        this.ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            this.handleWebSocketMessage(data);
        };
        
        this.ws.onclose = () => {
            console.log('WebSocket disconnected');
            // Attempt to reconnect after 5 seconds
            setTimeout(() => this.setupWebSocket(), 5000);
        };
    }

    handleWebSocketMessage(data) {
        switch (data.type) {
            case 'pong':
                console.log('WebSocket connection active');
                break;
            case 'upload_progress':
                this.updateUploadProgress(data.progress);
                break;
            case 'upload_complete':
                this.handleUploadComplete(data.media);
                break;
            case 'system_status':
                this.updateSystemStatus(data.data);
                break;
        }
    }

    setupUploadListeners() {
        const uploadArea = document.getElementById('uploadArea');
        const mediaFile = document.getElementById('mediaFile');
        const uploadForm = document.getElementById('uploadForm');
        const cancelUpload = document.getElementById('cancelUpload');

        // Click to upload
        uploadArea.addEventListener('click', () => {
            if (!this.isUploading) {
                mediaFile.click();
            }
        });

        // Drag and drop
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('dragover');
        });

        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('dragover');
        });

        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            
            const files = e.dataTransfer.files;
            if (files.length > 0 && !this.isUploading) {
                mediaFile.files = files;
                this.handleFileSelect(files[0]);
            }
        });

        // File input change
        mediaFile.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.handleFileSelect(e.target.files[0]);
            }
        });

        // Form submission
        uploadForm.addEventListener('submit', this.handleUpload.bind(this));
        cancelUpload.addEventListener('click', this.cancelUpload.bind(this));
    }

    // Authentication methods
    async handleAuth(e) {
        e.preventDefault();
        
        const form = e.target;
        const formData = new FormData(form);
        const isLogin = document.getElementById('authSubmit').textContent === 'Login';
        
        const data = {
            username: formData.get('username'),
            password: formData.get('password')
        };
        
        if (!isLogin) {
            data.email = formData.get('email');
        }
        
        try {
            const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
            const response = await this.apiCall(endpoint, 'POST', data);
            
            if (response.success) {
                this.authToken = response.token;
                this.currentUser = response.user;
                localStorage.setItem('authToken', this.authToken);
                
                this.hideAuthModal();
                this.updateUserInterface();
                this.loadDashboard();
                this.showToast(`Welcome ${this.currentUser.username}!`, 'success');
            } else {
                this.showToast(response.error || 'Authentication failed', 'error');
            }
        } catch (error) {
            this.showToast('Authentication failed', 'error');
        }
    }

    async verifyAuth() {
        try {
            const response = await this.apiCall('/api/user/profile');
            if (response.success) {
                this.currentUser = response.user;
                this.updateUserInterface();
                this.loadDashboard();
            } else {
                this.logout();
            }
        } catch (error) {
            this.logout();
        }
    }

    logout() {
        this.authToken = null;
        this.currentUser = null;
        localStorage.removeItem('authToken');
        this.showAuthModal();
        this.updateUserInterface();
    }

    toggleAuthMode(e) {
        e.preventDefault();
        const authTitle = document.getElementById('authTitle');
        const authSubmit = document.getElementById('authSubmit');
        const emailGroup = document.getElementById('emailGroup');
        const toggleAuth = document.getElementById('toggleAuth');
        
        const isLogin = authSubmit.textContent === 'Login';
        
        if (isLogin) {
            authTitle.textContent = 'Create Account';
            authSubmit.textContent = 'Register';
            emailGroup.style.display = 'block';
            emailGroup.querySelector('input').required = true;
            toggleAuth.textContent = 'Login';
            toggleAuth.parentElement.innerHTML = 'Already have an account? <a href="#" id="toggleAuth">Login</a>';
        } else {
            authTitle.textContent = 'Welcome Back';
            authSubmit.textContent = 'Login';
            emailGroup.style.display = 'none';
            emailGroup.querySelector('input').required = false;
            toggleAuth.textContent = 'Register';
            toggleAuth.parentElement.innerHTML = 'Don\'t have an account? <a href="#" id="toggleAuth">Register</a>';
        }
        
        // Re-attach event listener
        document.getElementById('toggleAuth').addEventListener('click', this.toggleAuthMode.bind(this));
    }

    showAuthModal() {
        document.getElementById('authModal').classList.add('active');
    }

    hideAuthModal() {
        document.getElementById('authModal').classList.remove('active');
    }

    updateUserInterface() {
        const userAvatar = document.getElementById('userAvatar');
        
        if (this.currentUser) {
            userAvatar.textContent = this.currentUser.username.charAt(0).toUpperCase();
            document.getElementById('settingsUsername').value = this.currentUser.username;
            document.getElementById('settingsEmail').value = this.currentUser.email;
        } else {
            userAvatar.textContent = '?';
        }
    }

    // Navigation methods
    showSection(sectionName) {
        // Hide all sections
        document.querySelectorAll('.section').forEach(section => {
            section.classList.remove('active');
        });
        
        // Show target section
        const targetSection = document.getElementById(`${sectionName}Section`);
        if (targetSection) {
            targetSection.classList.add('active');
        }
        
        // Load section-specific content
        switch (sectionName) {
            case 'home':
                this.loadDashboard();
                break;
            case 'library':
                this.loadLibrary();
                break;
            case 'analytics':
                this.loadAnalytics();
                break;
            case 'upload':
                this.resetUploadForm();
                break;
        }
    }

    // Content loading methods
    async loadDashboard() {
        try {
            const [recentMedia, popularMedia, continueWatching] = await Promise.all([
                this.apiCall('/api/media?limit=6'),
                this.apiCall('/api/analytics/popular?limit=6'),
                this.apiCall('/api/user/continue-watching')
            ]);
            
            this.renderMediaGrid(recentMedia, 'recentMedia');
            this.renderMediaGrid(popularMedia, 'popularMedia');
            
            if (continueWatching && continueWatching.length > 0) {
                document.getElementById('continueWatchingHeader').style.display = 'flex';
                this.renderMediaGrid(continueWatching, 'continueWatching', true);
            }
        } catch (error) {
            console.error('Error loading dashboard:', error);
        }
    }

    async loadLibrary(filters = {}) {
        const libraryGrid = document.getElementById('libraryGrid');
        const libraryLoading = document.getElementById('libraryLoading');
        const libraryEmpty = document.getElementById('libraryEmpty');
        
        libraryLoading.style.display = 'flex';
        libraryGrid.innerHTML = '';
        libraryEmpty.style.display = 'none';
        
        try {
            const queryParams = new URLSearchParams(filters);
            const media = await this.apiCall(`/api/media?${queryParams}`);
            
            libraryLoading.style.display = 'none';
            
            if (media.length === 0) {
                libraryEmpty.style.display = 'block';
            } else {
                this.renderMediaGrid(media, 'libraryGrid');
            }
        } catch (error) {
            libraryLoading.style.display = 'none';
            libraryEmpty.style.display = 'block';
            console.error('Error loading library:', error);
        }
    }

    async loadAnalytics() {
        try {
            const [stats, engagement] = await Promise.all([
                this.apiCall('/api/analytics/stats'),
                this.apiCall('/api/user/engagement')
            ]);
            
            // Update stat cards
            document.getElementById('totalMediaCount').textContent = stats.systemHealth.totalMediaFiles;
            document.getElementById('totalPlaysCount').textContent = engagement.totalPlays;
            document.getElementById('storageUsed').textContent = this.formatFileSize(stats.systemHealth.storageUsed);
            document.getElementById('watchTime').textContent = this.formatDuration(engagement.totalWatchTime);
            
            // Update popular media list
            this.renderPopularList(stats.popularMedia);
            
        } catch (error) {
            console.error('Error loading analytics:', error);
        }
    }

    renderMediaGrid(media, containerId, showProgress = false) {
        const container = document.getElementById(containerId);
        
        if (!media || media.length === 0) {
            container.innerHTML = '';
            return;
        }
        
        const mediaHTML = media.map(item => `
            <div class="media-card" data-media-id="${item.id}">
                <div class="media-thumbnail">
                    <img src="/storage/thumbnails/${item.thumbnail_path || 'default.jpg'}" 
                         alt="${item.title}" 
                         onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjIyNSIgZmlsbD0iIzMzMyIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjMzMzIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZpbGw9IiM5OTkiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPk5vIEltYWdlPC90ZXh0Pjwvc3ZnPg=='">
                    <div class="media-duration">${this.formatDuration(item.duration)}</div>
                    <div class="play-overlay">
                        <div class="play-button">
                            <i class="fas fa-play"></i>
                        </div>
                    </div>
                </div>
                <div class="media-info">
                    <h3 class="media-title">${item.title}</h3>
                    <div class="media-meta">
                        <span>${new Date(item.upload_date).toLocaleDateString()}</span>
                        <span>${item.views || 0} views</span>
                    </div>
                    <span class="media-category">${item.category}</span>
                    ${showProgress && item.watchProgress ? `
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${(item.watchProgress.position / item.duration) * 100}%"></div>
                        </div>
                    ` : ''}
                </div>
            </div>
        `).join('');
        
        container.innerHTML = mediaHTML;
        
        // Add click handlers
        container.querySelectorAll('.media-card').forEach(card => {
            card.addEventListener('click', () => {
                const mediaId = card.getAttribute('data-media-id');
                this.playMedia(mediaId);
            });
        });
    }

    renderPopularList(popularMedia) {
        const popularList = document.getElementById('popularList');
        
        if (!popularMedia || popularMedia.length === 0) {
            popularList.innerHTML = '<p>No data available</p>';
            return;
        }
        
        const popularHTML = popularMedia.map((item, index) => `
            <div class="popular-item">
                <div class="popular-rank">#${index + 1}</div>
                <div class="popular-thumbnail">
                    <img src="/storage/thumbnails/${item.thumbnail_path || 'default.jpg'}" alt="${item.title}">
                </div>
                <div class="popular-info">
                    <div class="popular-title">${item.title}</div>
                    <div class="popular-stats">${item.play_count} plays • ${item.unique_viewers} viewers</div>
                </div>
            </div>
        `).join('');
        
        popularList.innerHTML = popularHTML;
    }

    // Upload methods
    handleFileSelect(file) {
        const fileName = file.name;
        const fileSize = this.formatFileSize(file.size);
        
        // Update upload area display
        const uploadArea = document.getElementById('uploadArea');
        uploadArea.innerHTML = `
            <i class="fas fa-file-video"></i>
            <h3>File Selected</h3>
            <p><strong>${fileName}</strong></p>
            <p>Size: ${fileSize}</p>
            <div class="supported-formats">
                <small>Ready to upload</small>
            </div>
        `;
        
        // Show upload details form
        document.getElementById('uploadDetails').style.display = 'block';
        
        // Auto-fill title if empty
        const titleInput = document.getElementById('mediaTitle');
        if (!titleInput.value) {
            titleInput.value = fileName.replace(/\.[^/.]+$/, "");
        }
    }

    async handleUpload(e) {
        e.preventDefault();
        
        if (this.isUploading) return;
        
        const formData = new FormData();
        const mediaFile = document.getElementById('mediaFile').files[0];
        
        if (!mediaFile) {
            this.showToast('Please select a file', 'error');
            return;
        }
        
        formData.append('video', mediaFile);
        formData.append('title', document.getElementById('mediaTitle').value);
        formData.append('category', document.getElementById('mediaCategory').value);
        formData.append('description', document.getElementById('mediaDescription').value);
        formData.append('tags', JSON.stringify(
            document.getElementById('mediaTags').value.split(',').map(tag => tag.trim()).filter(tag => tag)
        ));
        
        this.isUploading = true;
        this.showUploadProgress();
        
        try {
            const response = await fetch('/api/upload', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.authToken}`
                },
                body: formData
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.hideUploadProgress();
                this.resetUploadForm();
                this.showToast('Media uploaded successfully!', 'success');
                this.showSection('library');
                this.loadLibrary();
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            this.hideUploadProgress();
            this.showToast('Upload failed: ' + error.message, 'error');
        } finally {
            this.isUploading = false;
        }
    }

    showUploadProgress() {
        document.getElementById('uploadDetails').style.display = 'none';
        document.getElementById('uploadProgress').style.display = 'block';
        
        // Simulate progress (in real implementation, this would come from server)
        let progress = 0;
        const interval = setInterval(() => {
            progress += Math.random() * 10;
            if (progress >= 100) {
                progress = 100;
                clearInterval(interval);
            }
            
            document.querySelector('.progress-fill').style.width = `${progress}%`;
            document.querySelector('.progress-percent').textContent = `${Math.round(progress)}%`;
            
            let status = 'Uploading...';
            if (progress > 30) status = 'Processing video...';
            if (progress > 60) status = 'Generating thumbnail...';
            if (progress > 90) status = 'Finalizing...';
            
            document.querySelector('.progress-status').textContent = status;
        }, 500);
    }

    hideUploadProgress() {
        document.getElementById('uploadProgress').style.display = 'none';
    }

    resetUploadForm() {
        document.getElementById('uploadForm').reset();
        document.getElementById('uploadDetails').style.display = 'none';
        
        // Reset upload area
        const uploadArea = document.getElementById('uploadArea');
        uploadArea.innerHTML = `
            <i class="fas fa-cloud-upload-alt"></i>
            <h3>Drag & drop your media here</h3>
            <p>or click to browse files</p>
            <div class="supported-formats">
                <small>Supported formats: MP4, AVI, MKV, MOV, WMV, FLV, WebM</small>
            </div>
        `;
    }

    cancelUpload() {
        this.resetUploadForm();
    }

    // Player methods
    async playMedia(mediaId) {
        try {
            const media = await this.apiCall(`/api/media/${mediaId}`);
            this.currentMedia = media;
            
            // Update player content
            document.getElementById('playerTitle').textContent = media.title;
            document.getElementById('playerDescription').textContent = media.description || 'No description available';
            document.getElementById('playerCategory').textContent = media.category;
            document.getElementById('playerDuration').textContent = this.formatDuration(media.duration);
            document.getElementById('playerUploadDate').textContent = new Date(media.upload_date).toLocaleDateString();
            
            // Set video source
            const videoPlayer = document.getElementById('videoPlayer');
            videoPlayer.src = `/storage/media/${media.file_path}`;
            
            // Show player modal
            document.getElementById('playerModal').classList.add('active');
            document.body.style.overflow = 'hidden';
            
            // Play video
            videoPlayer.play();
            
            // Track play event
            if (this.authToken) {
                this.apiCall('/api/analytics/track', 'POST', {
                    event: 'play',
                    mediaId: mediaId
                });
            }
            
        } catch (error) {
            this.showToast('Error playing media', 'error');
            console.error('Error playing media:', error);
        }
    }

    closePlayer() {
        const playerModal = document.getElementById('playerModal');
        const videoPlayer = document.getElementById('videoPlayer');
        
        playerModal.classList.remove('active');
        videoPlayer.pause();
        videoPlayer.src = '';
        document.body.style.overflow = 'auto';
        
        // Save watch progress if authenticated
        if (this.currentMedia && this.authToken && videoPlayer.currentTime > 0) {
            this.apiCall('/api/media/' + this.currentMedia.id + '/watch-progress', 'POST', {
                position: Math.round(videoPlayer.currentTime),
                completed: videoPlayer.currentTime >= videoPlayer.duration * 0.9
            });
        }
        
        this.currentMedia = null;
    }

    async deleteCurrentMedia() {
        if (!this.currentMedia) return;
        
        if (confirm('Are you sure you want to delete this media? This action cannot be undone.')) {
            try {
                await this.apiCall(`/api/media/${this.currentMedia.id}`, 'DELETE');
                this.closePlayer();
                this.showToast('Media deleted successfully', 'success');
                this.loadLibrary();
            } catch (error) {
                this.showToast('Error deleting media', 'error');
            }
        }
    }

    // Search and filter methods
    async handleSearch(e) {
        const query = e.target.value.trim();
        
        if (!query) {
            this.loadLibrary();
            return;
        }
        
        try {
            const results = await this.apiCall(`/api/search?q=${encodeURIComponent(query)}`);
            this.renderMediaGrid(results, 'libraryGrid');
        } catch (error) {
            console.error('Search error:', error);
        }
    }

    filterLibrary() {
        const category = document.getElementById('categoryFilter').value;
        const filters = {};
        
        if (category) {
            filters.category = category;
        }
        
        this.loadLibrary(filters);
    }

    // Utility methods
    handleScroll() {
        const header = document.getElementById('header');
        if (window.scrollY > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    }

    async apiCall(endpoint, method = 'GET', data = null) {
        const config = {
            method,
            headers: {
                'Content-Type': 'application/json',
            }
        };
        
        if (this.authToken) {
            config.headers.Authorization = `Bearer ${this.authToken}`;
        }
        
        if (data && method !== 'GET') {
            config.body = JSON.stringify(data);
        }
        
        const response = await fetch(endpoint, config);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        return await response.json();
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    formatDuration(seconds) {
        if (!seconds) return '0:00';
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        
        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        } else {
            return `${minutes}:${secs.toString().padStart(2, '0')}`;
        }
    }

    showToast(message, type = 'info') {
        const toastContainer = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        
        toastContainer.appendChild(toast);
        
        // Show toast
        setTimeout(() => toast.classList.add('show'), 100);
        
        // Remove toast after 5 seconds
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toastContainer.removeChild(toast), 300);
        }, 5000);
    }

    debounce(func, wait) {
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
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.streamHub = new StreamHubApp();
});