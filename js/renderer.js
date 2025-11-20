// 3D Renderer - Three.js ile Labirent Görselleştirme

class Renderer {
    constructor(canvasId, maze, player) {
        this.canvas = document.getElementById(canvasId);
        this.maze = maze;
        this.player = player;

        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.roomSize = 10; // 3D uzayda oda boyutu
        this.wallHeight = 5;
        this.currentRoomMeshes = [];
        this.doorLabels = [];

        this.init();
    }

    init() {
        // Sahne oluştur
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87CEEB); // Açık mavi gökyüzü

        // Kamera
        this.camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        this.camera.position.set(0, 1.6, 0); // İnsan göz hizası

        // Renderer
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: true
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;

        // Işıklandırma
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(5, 10, 5);
        directionalLight.castShadow = true;
        this.scene.add(directionalLight);

        // Pencere yeniden boyutlandırma
        window.addEventListener('resize', () => this.onWindowResize());

        // İlk odayı oluştur
        this.createCurrentRoom();
    }

    createCurrentRoom() {
        // Önceki oda meshlerini temizle
        this.currentRoomMeshes.forEach(mesh => this.scene.remove(mesh));
        this.currentRoomMeshes = [];

        const room = this.player.getCurrentRoom(this.maze);
        if (!room) return;

        const halfSize = this.roomSize / 2;

        // Zemin (Ahşap parke)
        const floorGeometry = new THREE.PlaneGeometry(this.roomSize, this.roomSize);
        const floorMaterial = new THREE.MeshStandardMaterial({
            color: 0x8B6F47, // Kahverengi ahşap
            roughness: 0.7,
            metalness: 0.1
        });
        const floor = new THREE.Mesh(floorGeometry, floorMaterial);
        floor.rotation.x = -Math.PI / 2;
        floor.receiveShadow = true;
        this.scene.add(floor);
        this.currentRoomMeshes.push(floor);

        // Duvar süpürgeliği (baseboard) - 4 kenar
        this.createBaseboard(halfSize);

        // Tavan
        const ceilingGeometry = new THREE.PlaneGeometry(this.roomSize, this.roomSize);
        const ceilingMaterial = new THREE.MeshStandardMaterial({
            color: 0xEEEEEE,
            side: THREE.DoubleSide
        });
        const ceiling = new THREE.Mesh(ceilingGeometry, ceilingMaterial);
        ceiling.rotation.x = Math.PI / 2;
        ceiling.position.y = this.wallHeight;
        this.scene.add(ceiling);
        this.currentRoomMeshes.push(ceiling);

        // Duvarlar
        this.createWall('north', room.doors.north, 0, -halfSize, room);
        this.createWall('south', room.doors.south, 0, halfSize, room);
        this.createWall('east', room.doors.east, halfSize, 0, room);
        this.createWall('west', room.doors.west, -halfSize, 0, room);
    }

    createBaseboard(halfSize) {
        // Duvar süpürgeliği (baseboard) - 4 kenar
        const baseboardHeight = 0.15;
        const baseboardDepth = 0.1;
        const baseboardMaterial = new THREE.MeshStandardMaterial({
            color: 0x6B4423, // Koyu kahverengi
            roughness: 0.8,
            metalness: 0.1
        });

        // Kuzey baseboard
        const northBase = new THREE.Mesh(
            new THREE.BoxGeometry(this.roomSize, baseboardHeight, baseboardDepth),
            baseboardMaterial
        );
        northBase.position.set(0, baseboardHeight / 2, -halfSize + baseboardDepth / 2);
        this.scene.add(northBase);
        this.currentRoomMeshes.push(northBase);

        // Güney baseboard
        const southBase = new THREE.Mesh(
            new THREE.BoxGeometry(this.roomSize, baseboardHeight, baseboardDepth),
            baseboardMaterial
        );
        southBase.position.set(0, baseboardHeight / 2, halfSize - baseboardDepth / 2);
        this.scene.add(southBase);
        this.currentRoomMeshes.push(southBase);

        // Doğu baseboard
        const eastBase = new THREE.Mesh(
            new THREE.BoxGeometry(baseboardDepth, baseboardHeight, this.roomSize),
            baseboardMaterial
        );
        eastBase.position.set(halfSize - baseboardDepth / 2, baseboardHeight / 2, 0);
        this.scene.add(eastBase);
        this.currentRoomMeshes.push(eastBase);

        // Batı baseboard
        const westBase = new THREE.Mesh(
            new THREE.BoxGeometry(baseboardDepth, baseboardHeight, this.roomSize),
            baseboardMaterial
        );
        westBase.position.set(-halfSize + baseboardDepth / 2, baseboardHeight / 2, 0);
        this.scene.add(westBase);
        this.currentRoomMeshes.push(westBase);
    }

    createWall(direction, hasDoor, x, z, room) {
        const wallMaterial = new THREE.MeshStandardMaterial({
            color: 0x7A8B99, // Gri-mavi duvar
            roughness: 0.8,
            metalness: 0.05
        });

        if (hasDoor) {
            // Kapı ile duvar (kapı boşluklu)
            const doorWidth = 2;
            const doorHeight = 3;
            const sideWallWidth = (this.roomSize - doorWidth) / 2;
            const frameThickness = 0.15;
            const frameDepth = 0.3;

            // Duvar malzemesi
            const wallMat = wallMaterial;

            // Kapı çerçevesi malzemesi (ahşap görünümlü)
            const frameMaterial = new THREE.MeshStandardMaterial({
                color: 0x8B4513, // Kahverengi ahşap
                roughness: 0.8,
                metalness: 0.1
            });

            // Sol duvar
            const leftWall = this.createWallSegment(
                sideWallWidth,
                this.wallHeight,
                wallMat
            );

            // Sağ duvar
            const rightWall = this.createWallSegment(
                sideWallWidth,
                this.wallHeight,
                wallMat
            );

            // Üst duvar (kapı üstü)
            const topWall = this.createWallSegment(
                doorWidth,
                this.wallHeight - doorHeight,
                wallMat
            );

            // Kapı çerçevesi - Sol dikey
            const frameLeft = new THREE.Mesh(
                new THREE.BoxGeometry(frameThickness, doorHeight, frameDepth),
                frameMaterial
            );

            // Kapı çerçevesi - Sağ dikey
            const frameRight = new THREE.Mesh(
                new THREE.BoxGeometry(frameThickness, doorHeight, frameDepth),
                frameMaterial
            );

            // Kapı çerçevesi - Üst yatay
            const frameTop = new THREE.Mesh(
                new THREE.BoxGeometry(doorWidth + frameThickness * 2, frameThickness, frameDepth),
                frameMaterial
            );

            // Kapı eşiği (threshold)
            const threshold = new THREE.Mesh(
                new THREE.BoxGeometry(doorWidth, 0.05, frameDepth),
                frameMaterial
            );

            // Kapı kanadı oluştur
            const doorLeaf = this.createDoorLeaf(doorWidth, doorHeight, frameMaterial);

            // Konumlandırma
            if (direction === 'north' || direction === 'south') {
                // Duvarlar
                leftWall.position.set(x - this.roomSize / 4 - sideWallWidth / 4, this.wallHeight / 2, z);
                rightWall.position.set(x + this.roomSize / 4 + sideWallWidth / 4, this.wallHeight / 2, z);
                topWall.position.set(x, this.wallHeight - (this.wallHeight - doorHeight) / 2, z);

                // Kapı çerçevesi
                frameLeft.position.set(x - doorWidth / 2, doorHeight / 2, z);
                frameRight.position.set(x + doorWidth / 2, doorHeight / 2, z);
                frameTop.position.set(x, doorHeight, z);
                threshold.position.set(x, 0.025, z);

                // Kapı kanadı (sol menteşe, hafif açık)
                doorLeaf.position.set(x - doorWidth / 2, doorHeight / 2, z + 0.2);
                if (direction === 'north') {
                    doorLeaf.rotation.y = -0.35; // 20 derece açık (odaya doğru)
                } else {
                    doorLeaf.rotation.y = 0.35;
                }
            } else {
                // Duvarlar
                leftWall.position.set(x, this.wallHeight / 2, z - this.roomSize / 4 - sideWallWidth / 4);
                leftWall.rotation.y = Math.PI / 2;
                rightWall.position.set(x, this.wallHeight / 2, z + this.roomSize / 4 + sideWallWidth / 4);
                rightWall.rotation.y = Math.PI / 2;
                topWall.position.set(x, this.wallHeight - (this.wallHeight - doorHeight) / 2, z);
                topWall.rotation.y = Math.PI / 2;

                // Kapı çerçevesi
                frameLeft.position.set(x, doorHeight / 2, z - doorWidth / 2);
                frameLeft.rotation.y = Math.PI / 2;
                frameRight.position.set(x, doorHeight / 2, z + doorWidth / 2);
                frameRight.rotation.y = Math.PI / 2;
                frameTop.position.set(x, doorHeight, z);
                frameTop.rotation.y = Math.PI / 2;
                threshold.position.set(x, 0.025, z);
                threshold.rotation.y = Math.PI / 2;

                // Kapı kanadı (sol menteşe, hafif açık)
                doorLeaf.position.set(x + 0.2, doorHeight / 2, z - doorWidth / 2);
                doorLeaf.rotation.y = Math.PI / 2;
                if (direction === 'east') {
                    doorLeaf.rotation.y += -0.35; // Açık
                } else {
                    doorLeaf.rotation.y += 0.35; // Açık
                }
            }

            this.scene.add(leftWall);
            this.scene.add(rightWall);
            this.scene.add(topWall);
            this.scene.add(frameLeft);
            this.scene.add(frameRight);
            this.scene.add(frameTop);
            this.scene.add(threshold);
            this.scene.add(doorLeaf);

            this.currentRoomMeshes.push(leftWall, rightWall, topWall);
            this.currentRoomMeshes.push(frameLeft, frameRight, frameTop, threshold, doorLeaf);

            // Kapı etiketi (DEBUG)
            this.createDoorLabel(direction, x, z, room);

        } else {
            // Tam duvar (kapı yok)
            const wall = this.createWallSegment(
                this.roomSize,
                this.wallHeight,
                wallMaterial
            );

            wall.position.set(x, this.wallHeight / 2, z);

            if (direction === 'east' || direction === 'west') {
                wall.rotation.y = Math.PI / 2;
            }

            // Duvar texturu varsa ekle
            if (room.wallTextures[direction]) {
                this.addWallTexture(wall, room.wallTextures[direction]);
            }

            this.scene.add(wall);
            this.currentRoomMeshes.push(wall);
        }
    }

    createDoorLeaf(doorWidth, doorHeight, frameMaterial) {
        // Kapı kanadı grubu
        const doorGroup = new THREE.Group();

        // Kapı ana gövdesi
        const doorBody = new THREE.Mesh(
            new THREE.BoxGeometry(doorWidth - 0.1, doorHeight, 0.05),
            new THREE.MeshStandardMaterial({
                color: 0xA0826D, // Açık kahverengi ahşap
                roughness: 0.7,
                metalness: 0.1
            })
        );
        doorGroup.add(doorBody);

        // Kapı panel çerçeveleri (2 panel)
        const panelMaterial = new THREE.MeshStandardMaterial({
            color: 0x8B6F47,
            roughness: 0.8,
            metalness: 0.05
        });

        // Üst panel çerçevesi
        const topPanelFrame = new THREE.Mesh(
            new THREE.BoxGeometry(doorWidth - 0.3, doorHeight / 2 - 0.3, 0.03),
            panelMaterial
        );
        topPanelFrame.position.set(0, doorHeight / 4, 0.04);
        doorGroup.add(topPanelFrame);

        // Alt panel çerçevesi
        const bottomPanelFrame = new THREE.Mesh(
            new THREE.BoxGeometry(doorWidth - 0.3, doorHeight / 2 - 0.3, 0.03),
            panelMaterial
        );
        bottomPanelFrame.position.set(0, -doorHeight / 4, 0.04);
        doorGroup.add(bottomPanelFrame);

        // Kapı kolu
        const handleMaterial = new THREE.MeshStandardMaterial({
            color: 0xC0C0C0, // Gümüş
            roughness: 0.3,
            metalness: 0.8
        });

        const doorHandle = new THREE.Mesh(
            new THREE.CylinderGeometry(0.03, 0.03, 0.15, 16),
            handleMaterial
        );
        doorHandle.rotation.z = Math.PI / 2;
        doorHandle.position.set(doorWidth / 2 - 0.2, 0, 0.06);
        doorGroup.add(doorHandle);

        // Kol ucu (yuvarlak)
        const handleKnob = new THREE.Mesh(
            new THREE.SphereGeometry(0.04, 16, 16),
            handleMaterial
        );
        handleKnob.position.set(doorWidth / 2 - 0.125, 0, 0.06);
        doorGroup.add(handleKnob);

        return doorGroup;
    }

    createWallSegment(width, height, material) {
        const geometry = new THREE.BoxGeometry(width, height, 0.2);
        const mesh = new THREE.Mesh(geometry, material);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        return mesh;
    }

    createDoorLabel(direction, x, z, room) {
        // 3D metin için sprite tabanlı label
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 512;
        canvas.height = 256;

        // Arka plan
        context.fillStyle = 'rgba(0, 0, 0, 0.7)';
        context.fillRect(0, 0, canvas.width, canvas.height);

        // Metin
        context.font = 'Bold 40px Arial';
        context.fillStyle = 'white';
        context.textAlign = 'center';
        context.fillText(`${direction.toUpperCase()}`, canvas.width / 2, 80);
        context.fillText(`Oda: (${room.x}, ${room.y})`, canvas.width / 2, 140);

        // Sprite oluştur
        const texture = new THREE.CanvasTexture(canvas);
        const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
        const sprite = new THREE.Sprite(spriteMaterial);

        // Konumlandırma (kapı üstü, odanın içinde)
        const labelHeight = 3.5;
        if (direction === 'north') {
            sprite.position.set(x, labelHeight, z + 1); // Odaya doğru (+Z yönünde)
        } else if (direction === 'south') {
            sprite.position.set(x, labelHeight, z - 1); // Odaya doğru (-Z yönünde)
        } else if (direction === 'east') {
            sprite.position.set(x - 1, labelHeight, z); // Odaya doğru (-X yönünde)
        } else if (direction === 'west') {
            sprite.position.set(x + 1, labelHeight, z); // Odaya doğru (+X yönünde)
        }

        sprite.scale.set(2, 1, 1);

        this.scene.add(sprite);
        this.currentRoomMeshes.push(sprite);
    }

    addWallTexture(wall, textureUrl) {
        // Texture loader ile duvar texturu ekle (gelecek için)
        const loader = new THREE.TextureLoader();
        loader.load(textureUrl, (texture) => {
            wall.material.map = texture;
            wall.material.needsUpdate = true;
        });
    }

    updateCamera() {
        // Kamera pozisyonunu oyuncu pozisyonuna göre ayarla
        this.camera.position.x = this.player.position.x;
        this.camera.position.y = this.player.position.y;
        this.camera.position.z = this.player.position.z;

        // Kamera rotasyonunu oyuncu rotasyonuna göre ayarla
        this.camera.rotation.order = 'YXZ'; // Doğru rotasyon sırası
        this.camera.rotation.y = this.player.rotation; // Yatay (yaw)
        this.camera.rotation.x = this.player.pitch; // Dikey (pitch)
    }

    render() {
        this.renderer.render(this.scene, this.camera);
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    update() {
        this.updateCamera();
        this.render();
    }
}
