// Room Preview - 3D Room Visualization
// Uses the same rendering mechanism as the game

class RoomPreview {
    constructor(canvas) {
        this.canvas = canvas;
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.currentRoomMeshes = [];
        this.roomSize = 10;
        this.wallHeight = 5;
        this.animationId = null;

        this.init();
    }

    init() {
        // Create scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x000000);

        // Create camera
        this.camera = new THREE.PerspectiveCamera(
            75,
            this.canvas.clientWidth / this.canvas.clientHeight,
            0.1,
            1000
        );
        // Position camera to view the room from an angle
        this.camera.position.set(8, 6, 8);
        this.camera.lookAt(0, 2, 0);

        // Create renderer
        this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true });
        this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight);
        this.renderer.shadowMap.enabled = true;

        // Add lights
        this.addLights();

        // Handle window resize
        window.addEventListener('resize', () => this.onResize());

        // Start animation loop
        this.animate();
    }

    addLights() {
        // Ambient light
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);

        // Directional light
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
        directionalLight.position.set(5, 10, 5);
        directionalLight.castShadow = true;
        this.scene.add(directionalLight);

        // Point light for better visibility
        const pointLight = new THREE.PointLight(0xffffff, 0.3);
        pointLight.position.set(0, this.wallHeight - 1, 0);
        this.scene.add(pointLight);
    }

    onResize() {
        if (!this.canvas.clientWidth || !this.canvas.clientHeight) return;

        this.camera.aspect = this.canvas.clientWidth / this.canvas.clientHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight);
    }

    clearRoom() {
        // Remove all current room meshes
        this.currentRoomMeshes.forEach(mesh => {
            if (mesh.geometry) mesh.geometry.dispose();
            if (mesh.material) {
                if (Array.isArray(mesh.material)) {
                    mesh.material.forEach(m => m.dispose());
                } else {
                    mesh.material.dispose();
                }
            }
            this.scene.remove(mesh);
        });
        this.currentRoomMeshes = [];
    }

    renderRoom(roomData, design = {}) {
        this.clearRoom();

        // Extract room properties
        const doors = {
            north: roomData.door_north || false,
            south: roomData.door_south || false,
            east: roomData.door_east || false,
            west: roomData.door_west || false
        };

        // Apply design defaults
        const wallColor = design.wall_color || '#808080';
        const floorColor = design.floor_color || '#6B4E3D';
        const ceilingColor = design.ceiling_color || '#EEEEEE';
        const ambientLightColor = design.ambient_light_color || '#FFFFFF';
        const ambientLightIntensity = design.ambient_light_intensity || 0.5;

        // Update ambient light
        const ambientLight = this.scene.children.find(child => child instanceof THREE.AmbientLight);
        if (ambientLight) {
            ambientLight.color.set(ambientLightColor);
            ambientLight.intensity = ambientLightIntensity;
        }

        // Create floor
        this.createFloor(floorColor);

        // Create ceiling
        this.createCeiling(ceilingColor);

        // Create walls with doors
        this.createWalls(wallColor, doors);

        // Add ads if provided
        if (roomData.ads && roomData.ads.length > 0) {
            roomData.ads.forEach(ad => {
                this.createAdPanel(ad, ad.wall);
            });
        }
    }

    createFloor(color) {
        const floorGeometry = new THREE.PlaneGeometry(this.roomSize, this.roomSize);
        const floorMaterial = new THREE.MeshStandardMaterial({
            color: color,
            roughness: 0.8,
            metalness: 0.2
        });
        const floor = new THREE.Mesh(floorGeometry, floorMaterial);
        floor.rotation.x = -Math.PI / 2;
        floor.receiveShadow = true;
        this.scene.add(floor);
        this.currentRoomMeshes.push(floor);
    }

    createCeiling(color) {
        const ceilingGeometry = new THREE.PlaneGeometry(this.roomSize, this.roomSize);
        const ceilingMaterial = new THREE.MeshStandardMaterial({
            color: color,
            roughness: 0.9,
            metalness: 0.1,
            side: THREE.DoubleSide
        });
        const ceiling = new THREE.Mesh(ceilingGeometry, ceilingMaterial);
        ceiling.rotation.x = Math.PI / 2;
        ceiling.position.y = this.wallHeight;
        this.scene.add(ceiling);
        this.currentRoomMeshes.push(ceiling);
    }

    createWalls(color, doors) {
        const wallMaterial = new THREE.MeshStandardMaterial({
            color: color,
            roughness: 0.9,
            metalness: 0.1
        });

        const wallThickness = 0.2;
        const doorWidth = 2;
        const doorHeight = 3;
        const halfRoom = this.roomSize / 2;

        // North wall (z = -halfRoom)
        if (!doors.north) {
            const wallGeometry = new THREE.BoxGeometry(this.roomSize, this.wallHeight, wallThickness);
            const wall = new THREE.Mesh(wallGeometry, wallMaterial);
            wall.position.set(0, this.wallHeight / 2, -halfRoom);
            wall.castShadow = true;
            this.scene.add(wall);
            this.currentRoomMeshes.push(wall);
        } else {
            this.createWallWithDoor('north', wallMaterial, halfRoom, doorWidth, doorHeight, wallThickness);
        }

        // South wall (z = halfRoom)
        if (!doors.south) {
            const wallGeometry = new THREE.BoxGeometry(this.roomSize, this.wallHeight, wallThickness);
            const wall = new THREE.Mesh(wallGeometry, wallMaterial);
            wall.position.set(0, this.wallHeight / 2, halfRoom);
            wall.castShadow = true;
            this.scene.add(wall);
            this.currentRoomMeshes.push(wall);
        } else {
            this.createWallWithDoor('south', wallMaterial, halfRoom, doorWidth, doorHeight, wallThickness);
        }

        // East wall (x = halfRoom)
        if (!doors.east) {
            const wallGeometry = new THREE.BoxGeometry(wallThickness, this.wallHeight, this.roomSize);
            const wall = new THREE.Mesh(wallGeometry, wallMaterial);
            wall.position.set(halfRoom, this.wallHeight / 2, 0);
            wall.castShadow = true;
            this.scene.add(wall);
            this.currentRoomMeshes.push(wall);
        } else {
            this.createWallWithDoor('east', wallMaterial, halfRoom, doorWidth, doorHeight, wallThickness);
        }

        // West wall (x = -halfRoom)
        if (!doors.west) {
            const wallGeometry = new THREE.BoxGeometry(wallThickness, this.wallHeight, this.roomSize);
            const wall = new THREE.Mesh(wallGeometry, wallMaterial);
            wall.position.set(-halfRoom, this.wallHeight / 2, 0);
            wall.castShadow = true;
            this.scene.add(wall);
            this.currentRoomMeshes.push(wall);
        } else {
            this.createWallWithDoor('west', wallMaterial, halfRoom, doorWidth, doorHeight, wallThickness);
        }
    }

    createWallWithDoor(direction, wallMaterial, halfRoom, doorWidth, doorHeight, wallThickness) {
        const segmentSize = (this.roomSize - doorWidth) / 2;
        const doorBottom = 0;

        if (direction === 'north' || direction === 'south') {
            const z = direction === 'north' ? -halfRoom : halfRoom;

            // Left segment
            const leftGeom = new THREE.BoxGeometry(segmentSize, this.wallHeight, wallThickness);
            const leftWall = new THREE.Mesh(leftGeom, wallMaterial);
            leftWall.position.set(-halfRoom / 2 - doorWidth / 4, this.wallHeight / 2, z);
            this.scene.add(leftWall);
            this.currentRoomMeshes.push(leftWall);

            // Right segment
            const rightGeom = new THREE.BoxGeometry(segmentSize, this.wallHeight, wallThickness);
            const rightWall = new THREE.Mesh(rightGeom, wallMaterial);
            rightWall.position.set(halfRoom / 2 + doorWidth / 4, this.wallHeight / 2, z);
            this.scene.add(rightWall);
            this.currentRoomMeshes.push(rightWall);

            // Top segment (above door)
            const topHeight = this.wallHeight - doorHeight;
            if (topHeight > 0) {
                const topGeom = new THREE.BoxGeometry(doorWidth, topHeight, wallThickness);
                const topWall = new THREE.Mesh(topGeom, wallMaterial);
                topWall.position.set(0, doorHeight + topHeight / 2, z);
                this.scene.add(topWall);
                this.currentRoomMeshes.push(topWall);
            }
        } else {
            const x = direction === 'east' ? halfRoom : -halfRoom;

            // Front segment
            const frontGeom = new THREE.BoxGeometry(wallThickness, this.wallHeight, segmentSize);
            const frontWall = new THREE.Mesh(frontGeom, wallMaterial);
            frontWall.position.set(x, this.wallHeight / 2, -halfRoom / 2 - doorWidth / 4);
            this.scene.add(frontWall);
            this.currentRoomMeshes.push(frontWall);

            // Back segment
            const backGeom = new THREE.BoxGeometry(wallThickness, this.wallHeight, segmentSize);
            const backWall = new THREE.Mesh(backGeom, wallMaterial);
            backWall.position.set(x, this.wallHeight / 2, halfRoom / 2 + doorWidth / 4);
            this.scene.add(backWall);
            this.currentRoomMeshes.push(backWall);

            // Top segment (above door)
            const topHeight = this.wallHeight - doorHeight;
            if (topHeight > 0) {
                const topGeom = new THREE.BoxGeometry(wallThickness, topHeight, doorWidth);
                const topWall = new THREE.Mesh(topGeom, wallMaterial);
                topWall.position.set(x, doorHeight + topHeight / 2, 0);
                this.scene.add(topWall);
                this.currentRoomMeshes.push(topWall);
            }
        }
    }

    createAdPanel(ad, wall) {
        const adWidth = ad.width || 2;
        const adHeight = ad.height || 1.5;
        const posY = ad.position_y || 2;
        const halfRoom = this.roomSize / 2;

        let position, rotation;
        switch (wall) {
            case 'north':
                position = new THREE.Vector3(0, posY, -halfRoom + 0.11);
                rotation = new THREE.Euler(0, 0, 0);
                break;
            case 'south':
                position = new THREE.Vector3(0, posY, halfRoom - 0.11);
                rotation = new THREE.Euler(0, Math.PI, 0);
                break;
            case 'east':
                position = new THREE.Vector3(halfRoom - 0.11, posY, 0);
                rotation = new THREE.Euler(0, -Math.PI / 2, 0);
                break;
            case 'west':
                position = new THREE.Vector3(-halfRoom + 0.11, posY, 0);
                rotation = new THREE.Euler(0, Math.PI / 2, 0);
                break;
        }

        // Create ad panel geometry
        const panelGeometry = new THREE.PlaneGeometry(adWidth, adHeight);

        // Create material based on ad type
        let panelMaterial;

        // Check if it's a video file based on URL extension
        const isVideo = ad.content_url && (
            ad.content_url.endsWith('.mp4') ||
            ad.content_url.endsWith('.webm') ||
            ad.content_url.endsWith('.ogg')
        );

        // Proxy external URLs to avoid CORS issues
        const getProxiedUrl = (url) => {
            if (!url) return url;
            // Check if it's an external URL (not localhost or relative)
            if (url.startsWith('http://') || url.startsWith('https://')) {
                return `/api/room/proxy?url=${encodeURIComponent(url)}`;
            }
            return url;
        };

        if (isVideo) {
            // Video texture
            const video = document.createElement('video');
            video.src = getProxiedUrl(ad.content_url);
            video.loop = true;
            video.muted = true;
            video.autoplay = true;
            video.crossOrigin = 'anonymous';
            video.playsInline = true;

            video.play().catch(err => console.warn('Video autoplay failed:', err));

            const videoTexture = new THREE.VideoTexture(video);
            videoTexture.minFilter = THREE.LinearFilter;
            videoTexture.magFilter = THREE.LinearFilter;

            panelMaterial = new THREE.MeshBasicMaterial({
                map: videoTexture,
                side: THREE.DoubleSide
            });

            console.log('Video ad created (proxied):', ad.content_url);
        } else if (ad.ad_type === 'image' && ad.content_url) {
            // Image texture
            const textureLoader = new THREE.TextureLoader();
            const imageTexture = textureLoader.load(
                getProxiedUrl(ad.content_url),
                (texture) => {
                    console.log('Image ad loaded (proxied):', ad.content_url);
                },
                undefined,
                (error) => {
                    console.error('Error loading ad image:', error);
                }
            );

            panelMaterial = new THREE.MeshBasicMaterial({
                map: imageTexture,
                color: 0xffffff,
                side: THREE.DoubleSide
            });
        } else if (ad.ad_type === 'canvas' && ad.content_text) {
            // Create canvas texture
            const canvas = document.createElement('canvas');
            canvas.width = 1024;
            canvas.height = 512;
            const ctx = canvas.getContext('2d');

            // Background
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Text
            ctx.fillStyle = '#000000';
            ctx.font = 'bold 80px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(ad.content_text, canvas.width / 2, canvas.height / 2);

            const texture = new THREE.CanvasTexture(canvas);
            panelMaterial = new THREE.MeshBasicMaterial({
                map: texture,
                side: THREE.DoubleSide
            });

            console.log('Canvas ad created:', ad.content_text);
        } else {
            // Fallback material
            panelMaterial = new THREE.MeshBasicMaterial({
                color: 0x333333,
                side: THREE.DoubleSide
            });
            console.warn('Ad with unknown type:', ad);
        }

        const panel = new THREE.Mesh(panelGeometry, panelMaterial);
        panel.position.copy(position);
        panel.rotation.copy(rotation);

        this.scene.add(panel);
        this.currentRoomMeshes.push(panel);
    }

    animate() {
        this.animationId = requestAnimationFrame(() => this.animate());

        // Slowly rotate the camera around the room
        const time = Date.now() * 0.0002;
        const radius = 10;
        this.camera.position.x = Math.sin(time) * radius;
        this.camera.position.z = Math.cos(time) * radius;
        this.camera.lookAt(0, 2, 0);

        this.renderer.render(this.scene, this.camera);
    }

    destroy() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        this.clearRoom();
        if (this.renderer) {
            this.renderer.dispose();
        }
    }
}
