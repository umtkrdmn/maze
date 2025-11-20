// 3D Renderer - Three.js ile Labirent Görselleştirme

class Renderer {
    constructor(canvasId, currentRoom, player) {
        this.canvas = document.getElementById(canvasId);
        this.currentRoom = currentRoom; // Artık maze yok, sadece currentRoom var
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
        this.scene.background = new THREE.Color(0x1a1a1a); // Koyu gri/siyah

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

        // Işıklandırma (daha iyi)
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);

        // Ana ışık (yukarıdan)
        const topLight = new THREE.DirectionalLight(0xffffff, 0.6);
        topLight.position.set(0, 5, 0);
        topLight.castShadow = true;
        this.scene.add(topLight);

        // Yardımcı ışıklar (duvarları aydınlatmak için)
        const frontLight = new THREE.DirectionalLight(0xffffff, 0.3);
        frontLight.position.set(0, 2, -5);
        this.scene.add(frontLight);

        const backLight = new THREE.DirectionalLight(0xffffff, 0.3);
        backLight.position.set(0, 2, 5);
        this.scene.add(backLight);

        // Pencere yeniden boyutlandırma
        window.addEventListener('resize', () => this.onWindowResize());

        // İlk odayı oluştur
        this.renderRoom();
    }

    // Yeni oda render etmek için (oda değiştiğinde çağrılır)
    updateRoom(newRoom) {
        this.currentRoom = newRoom;
        this.renderRoom();
    }

    renderRoom() {
        // Önceki oda meshlerini temizle
        this.currentRoomMeshes.forEach(mesh => this.scene.remove(mesh));
        this.currentRoomMeshes = [];

        if (!this.currentRoom) return;

        const room = this.currentRoom;
        const halfSize = this.roomSize / 2;

        // Zemin (Ahşap parke)
        const floorGeometry = new THREE.PlaneGeometry(this.roomSize, this.roomSize);
        const floorMaterial = new THREE.MeshStandardMaterial({
            color: 0x6B4E3D, // Koyu kahverengi ahşap
            roughness: 0.8,
            metalness: 0.05
        });
        const floor = new THREE.Mesh(floorGeometry, floorMaterial);
        floor.rotation.x = -Math.PI / 2;
        floor.receiveShadow = true;
        this.scene.add(floor);
        this.currentRoomMeshes.push(floor);

        // Duvar süpürgeliği (baseboard) - 4 kenar
        this.createBaseboard(halfSize, room);

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

    createBaseboard(halfSize, room) {
        // Duvar süpürgeliği (baseboard) - kapı alanlarında kesilmiş
        const baseboardHeight = 0.15;
        const baseboardDepth = 0.1;
        const doorWidth = 2;
        const sideWidth = (this.roomSize - doorWidth) / 2; // 4 birim
        const wallThickness = 0.2; // Duvar kalınlığı

        const baseboardMaterial = new THREE.MeshStandardMaterial({
            color: 0x6B4423, // Koyu kahverengi
            roughness: 0.8,
            metalness: 0.1
        });

        // Kuzey baseboard (kapı varsa bölünmüş) - duvarın iç kenarından başlayıp odaya uzanır
        if (room.doors.north) {
            // Sol parça
            const northLeftBase = new THREE.Mesh(
                new THREE.BoxGeometry(sideWidth, baseboardHeight, baseboardDepth),
                baseboardMaterial
            );
            northLeftBase.position.set(-doorWidth / 2 - sideWidth / 2, baseboardHeight / 2, -halfSize + wallThickness / 2 + baseboardDepth / 2);
            this.scene.add(northLeftBase);
            this.currentRoomMeshes.push(northLeftBase);

            // Sağ parça
            const northRightBase = new THREE.Mesh(
                new THREE.BoxGeometry(sideWidth, baseboardHeight, baseboardDepth),
                baseboardMaterial
            );
            northRightBase.position.set(doorWidth / 2 + sideWidth / 2, baseboardHeight / 2, -halfSize + wallThickness / 2 + baseboardDepth / 2);
            this.scene.add(northRightBase);
            this.currentRoomMeshes.push(northRightBase);
        } else {
            // Tam baseboard
            const northBase = new THREE.Mesh(
                new THREE.BoxGeometry(this.roomSize, baseboardHeight, baseboardDepth),
                baseboardMaterial
            );
            northBase.position.set(0, baseboardHeight / 2, -halfSize + wallThickness / 2 + baseboardDepth / 2);
            this.scene.add(northBase);
            this.currentRoomMeshes.push(northBase);
        }

        // Güney baseboard (kapı varsa bölünmüş) - duvarın iç kenarından başlayıp odaya uzanır
        if (room.doors.south) {
            // Sol parça
            const southLeftBase = new THREE.Mesh(
                new THREE.BoxGeometry(sideWidth, baseboardHeight, baseboardDepth),
                baseboardMaterial
            );
            southLeftBase.position.set(-doorWidth / 2 - sideWidth / 2, baseboardHeight / 2, halfSize - wallThickness / 2 - baseboardDepth / 2);
            this.scene.add(southLeftBase);
            this.currentRoomMeshes.push(southLeftBase);

            // Sağ parça
            const southRightBase = new THREE.Mesh(
                new THREE.BoxGeometry(sideWidth, baseboardHeight, baseboardDepth),
                baseboardMaterial
            );
            southRightBase.position.set(doorWidth / 2 + sideWidth / 2, baseboardHeight / 2, halfSize - wallThickness / 2 - baseboardDepth / 2);
            this.scene.add(southRightBase);
            this.currentRoomMeshes.push(southRightBase);
        } else {
            // Tam baseboard
            const southBase = new THREE.Mesh(
                new THREE.BoxGeometry(this.roomSize, baseboardHeight, baseboardDepth),
                baseboardMaterial
            );
            southBase.position.set(0, baseboardHeight / 2, halfSize - wallThickness / 2 - baseboardDepth / 2);
            this.scene.add(southBase);
            this.currentRoomMeshes.push(southBase);
        }

        // Doğu baseboard (kapı varsa bölünmüş) - duvarın iç kenarından başlayıp odaya uzanır
        if (room.doors.east) {
            // Üst parça
            const eastTopBase = new THREE.Mesh(
                new THREE.BoxGeometry(baseboardDepth, baseboardHeight, sideWidth),
                baseboardMaterial
            );
            eastTopBase.position.set(halfSize - wallThickness / 2 - baseboardDepth / 2, baseboardHeight / 2, -doorWidth / 2 - sideWidth / 2);
            this.scene.add(eastTopBase);
            this.currentRoomMeshes.push(eastTopBase);

            // Alt parça
            const eastBottomBase = new THREE.Mesh(
                new THREE.BoxGeometry(baseboardDepth, baseboardHeight, sideWidth),
                baseboardMaterial
            );
            eastBottomBase.position.set(halfSize - wallThickness / 2 - baseboardDepth / 2, baseboardHeight / 2, doorWidth / 2 + sideWidth / 2);
            this.scene.add(eastBottomBase);
            this.currentRoomMeshes.push(eastBottomBase);
        } else {
            // Tam baseboard
            const eastBase = new THREE.Mesh(
                new THREE.BoxGeometry(baseboardDepth, baseboardHeight, this.roomSize),
                baseboardMaterial
            );
            eastBase.position.set(halfSize - wallThickness / 2 - baseboardDepth / 2, baseboardHeight / 2, 0);
            this.scene.add(eastBase);
            this.currentRoomMeshes.push(eastBase);
        }

        // Batı baseboard (kapı varsa bölünmüş) - duvarın iç kenarından başlayıp odaya uzanır
        if (room.doors.west) {
            // Üst parça
            const westTopBase = new THREE.Mesh(
                new THREE.BoxGeometry(baseboardDepth, baseboardHeight, sideWidth),
                baseboardMaterial
            );
            westTopBase.position.set(-halfSize + wallThickness / 2 + baseboardDepth / 2, baseboardHeight / 2, -doorWidth / 2 - sideWidth / 2);
            this.scene.add(westTopBase);
            this.currentRoomMeshes.push(westTopBase);

            // Alt parça
            const westBottomBase = new THREE.Mesh(
                new THREE.BoxGeometry(baseboardDepth, baseboardHeight, sideWidth),
                baseboardMaterial
            );
            westBottomBase.position.set(-halfSize + wallThickness / 2 + baseboardDepth / 2, baseboardHeight / 2, doorWidth / 2 + sideWidth / 2);
            this.scene.add(westBottomBase);
            this.currentRoomMeshes.push(westBottomBase);
        } else {
            // Tam baseboard
            const westBase = new THREE.Mesh(
                new THREE.BoxGeometry(baseboardDepth, baseboardHeight, this.roomSize),
                baseboardMaterial
            );
            westBase.position.set(-halfSize + wallThickness / 2 + baseboardDepth / 2, baseboardHeight / 2, 0);
            this.scene.add(westBase);
            this.currentRoomMeshes.push(westBase);
        }
    }

    createWall(direction, hasDoor, x, z, room) {
        const wallMaterial = new THREE.MeshStandardMaterial({
            color: 0x5A6A75, // Koyu gri-mavi duvar
            roughness: 0.9,
            metalness: 0.02
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
                // Duvarlar (doğrudan kapı açıklığına kadar)
                leftWall.position.set(x - doorWidth / 2 - sideWallWidth / 2, this.wallHeight / 2, z);
                rightWall.position.set(x + doorWidth / 2 + sideWallWidth / 2, this.wallHeight / 2, z);
                topWall.position.set(x, this.wallHeight - (this.wallHeight - doorHeight) / 2, z);

                // Kapı çerçevesi
                frameLeft.position.set(x - doorWidth / 2, doorHeight / 2, z);
                frameRight.position.set(x + doorWidth / 2, doorHeight / 2, z);
                frameTop.position.set(x, doorHeight, z);
                threshold.position.set(x, 0.025, z);

                // Kapı kanadı (kapalı durumda, çerçeve içinde)
                doorLeaf.position.set(x, doorHeight / 2, z + 0.15);
                doorLeaf.rotation.y = 0; // Kapalı
            } else {
                // Duvarlar (doğrudan kapı açıklığına kadar)
                leftWall.position.set(x, this.wallHeight / 2, z - doorWidth / 2 - sideWallWidth / 2);
                leftWall.rotation.y = Math.PI / 2;
                rightWall.position.set(x, this.wallHeight / 2, z + doorWidth / 2 + sideWallWidth / 2);
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

                // Kapı kanadı (kapalı durumda, çerçeve içinde)
                doorLeaf.position.set(x + 0.15, doorHeight / 2, z);
                doorLeaf.rotation.y = Math.PI / 2; // Kapalı
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

        // Reklam varsa ekle (sadece kapısız tam duvarlarda)
        if (!hasDoor && room.ads && room.ads[direction]) {
            this.createAdPanel(room.ads[direction], direction, x, z);
        }
    }

    createDoorLeaf(doorWidth, doorHeight, frameMaterial) {
        // Kapı kanadı grubu
        const doorGroup = new THREE.Group();

        // Kapı ana gövdesi (çerçeve kalınlığını hesaba katarak)
        const doorMaterial = new THREE.MeshStandardMaterial({
            color: 0x8B6F47, // Orta ton kahverengi ahşap
            roughness: 0.75,
            metalness: 0.1
        });

        const frameThickness = 0.15;
        // Çerçevenin iç genişliği = doorWidth - frameThickness (çünkü çerçeve doorWidth/2'de merkezlenmiş)
        const actualDoorWidth = doorWidth - frameThickness; // 2 - 0.15 = 1.85
        const doorBody = new THREE.Mesh(
            new THREE.BoxGeometry(actualDoorWidth, doorHeight, 0.08),
            doorMaterial
        );
        doorGroup.add(doorBody);

        // Panel çerçeveleri (daha belirgin)
        const panelMaterial = new THREE.MeshStandardMaterial({
            color: 0x6B4E3D, // Koyu kahverengi
            roughness: 0.8,
            metalness: 0.1
        });

        // ÖN YÜZ - Paneller
        // Üst panel çerçevesi (daha kalın ve belirgin)
        const topPanelOuter = new THREE.Mesh(
            new THREE.BoxGeometry(actualDoorWidth - 0.3, doorHeight / 2 - 0.4, 0.04),
            panelMaterial
        );
        topPanelOuter.position.set(0, doorHeight / 4, 0.06);
        doorGroup.add(topPanelOuter);

        // Üst panel iç çerçeve (derinlik için)
        const topPanelInner = new THREE.Mesh(
            new THREE.BoxGeometry(actualDoorWidth - 0.5, doorHeight / 2 - 0.55, 0.02),
            new THREE.MeshStandardMaterial({
                color: 0x5A4332,
                roughness: 0.9,
                metalness: 0.05
            })
        );
        topPanelInner.position.set(0, doorHeight / 4, 0.04);
        doorGroup.add(topPanelInner);

        // Alt panel çerçevesi (daha kalın ve belirgin)
        const bottomPanelOuter = new THREE.Mesh(
            new THREE.BoxGeometry(actualDoorWidth - 0.3, doorHeight / 2 - 0.4, 0.04),
            panelMaterial
        );
        bottomPanelOuter.position.set(0, -doorHeight / 4, 0.06);
        doorGroup.add(bottomPanelOuter);

        // Alt panel iç çerçeve
        const bottomPanelInner = new THREE.Mesh(
            new THREE.BoxGeometry(actualDoorWidth - 0.5, doorHeight / 2 - 0.55, 0.02),
            new THREE.MeshStandardMaterial({
                color: 0x5A4332,
                roughness: 0.9,
                metalness: 0.05
            })
        );
        bottomPanelInner.position.set(0, -doorHeight / 4, 0.04);
        doorGroup.add(bottomPanelInner);

        // ARKA YÜZ - Paneller
        // Üst panel çerçevesi (arka)
        const topPanelOuterBack = new THREE.Mesh(
            new THREE.BoxGeometry(actualDoorWidth - 0.3, doorHeight / 2 - 0.4, 0.04),
            panelMaterial
        );
        topPanelOuterBack.position.set(0, doorHeight / 4, -0.06);
        doorGroup.add(topPanelOuterBack);

        // Üst panel iç çerçeve (arka)
        const topPanelInnerBack = new THREE.Mesh(
            new THREE.BoxGeometry(actualDoorWidth - 0.5, doorHeight / 2 - 0.55, 0.02),
            new THREE.MeshStandardMaterial({
                color: 0x5A4332,
                roughness: 0.9,
                metalness: 0.05
            })
        );
        topPanelInnerBack.position.set(0, doorHeight / 4, -0.04);
        doorGroup.add(topPanelInnerBack);

        // Alt panel çerçevesi (arka)
        const bottomPanelOuterBack = new THREE.Mesh(
            new THREE.BoxGeometry(actualDoorWidth - 0.3, doorHeight / 2 - 0.4, 0.04),
            panelMaterial
        );
        bottomPanelOuterBack.position.set(0, -doorHeight / 4, -0.06);
        doorGroup.add(bottomPanelOuterBack);

        // Alt panel iç çerçeve (arka)
        const bottomPanelInnerBack = new THREE.Mesh(
            new THREE.BoxGeometry(actualDoorWidth - 0.5, doorHeight / 2 - 0.55, 0.02),
            new THREE.MeshStandardMaterial({
                color: 0x5A4332,
                roughness: 0.9,
                metalness: 0.05
            })
        );
        bottomPanelInnerBack.position.set(0, -doorHeight / 4, -0.04);
        doorGroup.add(bottomPanelInnerBack);

        // Kapı tokmağı (ÇOK BÜYÜK ve parlak)
        const handleMaterial = new THREE.MeshStandardMaterial({
            color: 0xFFD700, // Parlak altın
            roughness: 0.2,
            metalness: 0.9,
            emissive: 0xFFD700,
            emissiveIntensity: 0.1
        });

        // ÖN YÜZ - Tokmak
        // Ana topuz - Kapının sağ tarafında
        const doorHandle = new THREE.Mesh(
            new THREE.SphereGeometry(0.08, 32, 32), // Normal boyut
            handleMaterial
        );
        doorHandle.position.set(actualDoorWidth / 2 - 0.3, 0, 0.12);
        doorGroup.add(doorHandle);

        // Topuz tabanı (daha gerçekçi için)
        const handleBase = new THREE.Mesh(
            new THREE.CylinderGeometry(0.06, 0.07, 0.04, 24),
            handleMaterial
        );
        handleBase.rotation.z = Math.PI / 2;
        handleBase.position.set(actualDoorWidth / 2 - 0.3, 0, 0.09);
        doorGroup.add(handleBase);

        // ARKA YÜZ - Tokmak
        // Ana topuz (arka)
        const doorHandleBack = new THREE.Mesh(
            new THREE.SphereGeometry(0.08, 32, 32), // Normal boyut
            handleMaterial
        );
        doorHandleBack.position.set(actualDoorWidth / 2 - 0.3, 0, -0.12);
        doorGroup.add(doorHandleBack);

        // Topuz tabanı (arka)
        const handleBaseBack = new THREE.Mesh(
            new THREE.CylinderGeometry(0.06, 0.07, 0.04, 24),
            handleMaterial
        );
        handleBaseBack.rotation.z = Math.PI / 2;
        handleBaseBack.position.set(actualDoorWidth / 2 - 0.3, 0, -0.09);
        doorGroup.add(handleBaseBack);

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

    // Reklam paneli oluştur
    createAdPanel(adConfig, direction, wallX, wallZ) {
        if (!adConfig) return;

        // Varsayılan değerler
        const adWidth = adConfig.width || 2;
        const adHeight = adConfig.height || 1;
        const adY = adConfig.position?.y || 2.5; // Varsayılan yükseklik (duvar ortası)
        const adOffsetX = adConfig.position?.x || 0; // Yatay offset

        // Reklam paneli geometrisi
        const adGeometry = new THREE.PlaneGeometry(adWidth, adHeight);

        // Material oluştur (image veya video)
        let adMaterial;

        if (adConfig.type === 'video') {
            // Video texture
            const video = document.createElement('video');
            video.src = adConfig.url;
            video.loop = true;
            video.muted = true; // Otomatik oynatma için sessize al
            video.autoplay = true;
            video.crossOrigin = 'anonymous'; // CORS için

            // Video metadata yüklendiğinde aspect ratio'yu ayarla
            video.addEventListener('loadedmetadata', () => {
                if (adConfig.fitMode === 'contain') {
                    const videoWidth = video.videoWidth;
                    const videoHeight = video.videoHeight;
                    const videoAspect = videoWidth / videoHeight;
                    const panelAspect = adWidth / adHeight;

                    let finalWidth = adWidth;
                    let finalHeight = adHeight;

                    // Aspect ratio koruyarak fit et
                    if (videoAspect > panelAspect) {
                        // Video daha geniş - genişliğe göre fit et
                        finalHeight = adWidth / videoAspect;
                    } else {
                        // Video daha yüksek - yüksekliğe göre fit et
                        finalWidth = adHeight * videoAspect;
                    }

                    // Geometry'yi yeniden boyutlandır
                    adPanel.geometry.dispose();
                    adPanel.geometry = new THREE.PlaneGeometry(finalWidth, finalHeight);

                    console.log(`Video aspect ratio: ${videoAspect.toFixed(2)}, Panel adjusted to: ${finalWidth.toFixed(2)}x${finalHeight.toFixed(2)}`);
                }
            });

            video.play().catch(err => console.warn('Video autoplay failed:', err));

            const videoTexture = new THREE.VideoTexture(video);
            videoTexture.minFilter = THREE.LinearFilter;
            videoTexture.magFilter = THREE.LinearFilter;

            adMaterial = new THREE.MeshBasicMaterial({
                map: videoTexture,
                side: THREE.DoubleSide
            });

            // Video elementini sakla (temizlik için)
            adMaterial.userData.video = video;
        } else {
            // Image texture - Canvas tabanlı texture oluştur (internet gerektirmez)
            if (adConfig.url.startsWith('canvas:')) {
                // Canvas texture oluştur (yüksek çözünürlük için daha büyük)
                const canvas = document.createElement('canvas');
                canvas.width = 1024;  // Daha yüksek çözünürlük
                canvas.height = 512;
                const ctx = canvas.getContext('2d');

                // Arka plan rengi
                const bgColor = adConfig.bgColor || '#FF6B6B';
                const textColor = adConfig.textColor || '#FFFFFF';
                const text = adConfig.text || 'REKLAM';

                ctx.fillStyle = bgColor;
                ctx.fillRect(0, 0, canvas.width, canvas.height);

                // Metin (çok satırlı destekle, daha büyük font)
                ctx.fillStyle = textColor;
                ctx.font = 'Bold 80px Arial';  // Daha büyük font
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';

                const lines = text.split('\n');
                const lineHeight = 100;  // Daha büyük satır yüksekliği
                const startY = canvas.height / 2 - ((lines.length - 1) * lineHeight) / 2;

                lines.forEach((line, index) => {
                    ctx.fillText(line, canvas.width / 2, startY + index * lineHeight);
                });

                const canvasTexture = new THREE.CanvasTexture(canvas);
                adMaterial = new THREE.MeshBasicMaterial({
                    map: canvasTexture,
                    side: THREE.DoubleSide
                });
            } else {
                // URL'den texture yükle
                const textureLoader = new THREE.TextureLoader();

                // Aspect ratio koruma için callback kullan
                const imageTexture = textureLoader.load(
                    adConfig.url,
                    (texture) => {
                        // Texture yüklendikten sonra aspect ratio'yu kontrol et
                        if (adConfig.fitMode === 'contain') {
                            const imgWidth = texture.image.width;
                            const imgHeight = texture.image.height;
                            const imgAspect = imgWidth / imgHeight;
                            const panelAspect = adWidth / adHeight;

                            let finalWidth = adWidth;
                            let finalHeight = adHeight;

                            // Aspect ratio koruyarak fit et
                            if (imgAspect > panelAspect) {
                                // Resim daha geniş - genişliğe göre fit et
                                finalHeight = adWidth / imgAspect;
                            } else {
                                // Resim daha yüksek - yüksekliğe göre fit et
                                finalWidth = adHeight * imgAspect;
                            }

                            // Geometry'yi yeniden boyutlandır
                            adPanel.geometry.dispose();
                            adPanel.geometry = new THREE.PlaneGeometry(finalWidth, finalHeight);

                            console.log(`Image aspect ratio: ${imgAspect.toFixed(2)}, Panel adjusted to: ${finalWidth.toFixed(2)}x${finalHeight.toFixed(2)}`);
                        }
                    }
                );

                adMaterial = new THREE.MeshBasicMaterial({
                    map: imageTexture,
                    color: 0xFFFFFF, // Beyaz (texture yüklendiğinde tam renk)
                    side: THREE.DoubleSide
                });
            }
        }

        const adPanel = new THREE.Mesh(adGeometry, adMaterial);

        // Konumlandırma - duvara göre (odanın içine doğru)
        const offset = 0.11; // Duvardan hafifçe odaya doğru (z-fighting önlemek için)

        if (direction === 'north') {
            adPanel.position.set(wallX + adOffsetX, adY, wallZ + offset);
            adPanel.rotation.y = 0; // Güneye bakıyor (odaya doğru)
        } else if (direction === 'south') {
            adPanel.position.set(wallX + adOffsetX, adY, wallZ - offset);
            adPanel.rotation.y = Math.PI; // Kuzeye bakıyor (odaya doğru)
        } else if (direction === 'east') {
            adPanel.position.set(wallX - offset, adY, wallZ + adOffsetX);
            adPanel.rotation.y = -Math.PI / 2; // Batıya bakıyor (odaya doğru)
        } else if (direction === 'west') {
            adPanel.position.set(wallX + offset, adY, wallZ + adOffsetX);
            adPanel.rotation.y = Math.PI / 2; // Doğuya bakıyor (odaya doğru)
        }

        this.scene.add(adPanel);
        this.currentRoomMeshes.push(adPanel);
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
