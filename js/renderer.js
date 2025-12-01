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
        this.videoElements = []; // Video elementlerini sakla (ses kontrolü için)
        this.audioEnabled = false; // Ses başlangıçta kapalı

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

        // Işıklandırma
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

        // Önceki oda videoları durdur ve temizle
        this.videoElements.forEach(video => {
            video.pause();
            video.src = '';
        });
        this.videoElements = [];

        console.log('renderRoom called, currentRoom:', this.currentRoom);
        if (!this.currentRoom) {
            console.warn('currentRoom is null, not rendering anything!');
            return;
        }

        const room = this.currentRoom;
        const halfSize = this.roomSize / 2;

        // Design'dan renkleri al (varsayılan değerlerle)
        const design = room.design || {};
        const floorColor = design.floor_color || '#6B4E3D';
        const ceilingColor = design.ceiling_color || '#EEEEEE';

        // Zemin (Ahşap parke)
        const floorGeometry = new THREE.PlaneGeometry(this.roomSize, this.roomSize);
        const floorMaterial = new THREE.MeshStandardMaterial({
            color: floorColor,
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
            color: ceilingColor,
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

        // Dekorasyonları ekle
        this.renderDecorations(room);
    }

    renderDecorations(room) {
        // Design verisi varsa ve dekorasyonlar tanımlıysa render et
        const decorations = room.design?.extra_features?.decorations || [];
        decorations.forEach(deco => {
            this.createDecoration(deco);
        });
    }

    async createDecoration(deco) {
        const { type, position, scale, color, properties } = deco;

        // Try to load 3D model first
        if (typeof modelLoader !== 'undefined' && modelLoader.hasModel(type)) {
            try {
                const mesh = await modelLoader.loadModel(type);
                if (mesh) {
                    // GLTF modelleri kendi renklerine sahip, tint uygulanmaz
                    mesh.position.set(position[0], position[1], position[2]);
                    mesh.scale.multiply(new THREE.Vector3(scale[0], scale[1], scale[2]));
                    this.scene.add(mesh);
                    this.currentRoomMeshes.push(mesh);
                    return;
                }
            } catch (error) {
                console.warn(`Failed to load model for ${type}, using primitive:`, error);
            }
        }

        // Fallback to primitive geometry
        const mesh = this.createPrimitiveDecoration(type, color, properties);
        if (mesh) {
            mesh.position.set(position[0], position[1], position[2]);
            mesh.scale.set(scale[0], scale[1], scale[2]);
            this.scene.add(mesh);
            this.currentRoomMeshes.push(mesh);
        }
    }

    createPrimitiveDecoration(type, color, properties) {
        switch (type) {
            // === CHRISTMAS DECORATIONS ===
            case 'christmas_tree': return this.createChristmasTree(color, properties);
            case 'gift_box': return this.createGiftBox(color, properties);
            case 'snowman': return this.createSnowman(color);
            case 'candy_cane': return this.createCandyCane(color);
            case 'string_lights': return this.createStringLights(properties);

            // === HALLOWEEN DECORATIONS ===
            case 'pumpkin': return this.createPumpkin(color, properties);
            case 'bat': return this.createBat(color);
            case 'spider_web': return this.createSpiderWeb(color);
            case 'cauldron': return this.createCauldron(color, properties);

            // === OFFICE DECORATIONS ===
            case 'desk': return this.createDesk(color);
            case 'office_chair': return this.createOfficeChair(color);
            case 'desk_lamp': return this.createDeskLamp(color);
            case 'water_cooler': return this.createWaterCooler(color);
            case 'clock': return this.createClock(color);

            // === OLD SALON DECORATIONS ===
            case 'fireplace': return this.createFireplace(color, properties);
            case 'chandelier': return this.createChandelier(color, properties);
            case 'grandfather_clock': return this.createGrandfatherClock(color);
            case 'armchair': return this.createArmchair(color, properties);
            case 'candelabra': return this.createCandelabra(color, properties);

            // === SPACESHIP DECORATIONS ===
            case 'control_panel': return this.createControlPanel(color, properties);
            case 'hologram': return this.createHologram(color, properties);
            case 'light_tube': return this.createLightTube(color);
            case 'cryopod': return this.createCryopod(color, properties);
            case 'robot': return this.createRobot(color);

            // === UNDERWATER DECORATIONS ===
            case 'coral': return this.createCoral(color);
            case 'seashell': return this.createSeashell(color);
            case 'starfish': return this.createStarfish(color);
            case 'bubbles': return this.createBubbles(color, properties);
            case 'fish': return this.createFish(color, properties);
            case 'treasure_chest': return this.createTreasureChest(color, properties);

            // === FOREST DECORATIONS ===
            case 'tree_stump': return this.createTreeStump(color);
            case 'mushroom': return this.createMushroom(color, properties);
            case 'fern': return this.createFern(color);
            case 'rock': return this.createRock(color);
            case 'fireflies': return this.createFireflies(color, properties);
            case 'bird': return this.createBird(color);

            // === DESERT DECORATIONS ===
            case 'cactus': return this.createCactus(color);
            case 'sand_dune': return this.createSandDune(color);
            case 'skull': return this.createSkull(color);
            case 'tumbleweed': return this.createTumbleweed(color);
            case 'pottery': return this.createPottery(color);
            case 'sun': return this.createSun(color, properties);

            // === CYBERPUNK DECORATIONS ===
            case 'neon_sign': return this.createNeonSign(color, properties);
            case 'neon_tube': return this.createNeonTube(color);
            case 'holographic_screen': return this.createHolographicScreen(color, properties);
            case 'robot_parts': return this.createRobotParts(color);
            case 'server_rack': return this.createServerRack(color, properties);
            case 'drone': return this.createDrone(color, properties);

            // === MEDIEVAL DECORATIONS ===
            case 'torch': return this.createTorch(color, properties);
            case 'armor_stand': return this.createArmorStand(color);
            case 'barrel': return this.createBarrel(color);
            case 'banner': return this.createBanner(color, properties);
            case 'sword_display': return this.createSwordDisplay(color);
            case 'chest': return this.createChest(color);

            // === COMMON DECORATIONS ===
            case 'potted_plant': return this.createPottedPlant(color);
            case 'floor_lamp': return this.createFloorLamp(color);

            default:
                console.warn('Unknown decoration type:', type);
                return null;
        }
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
        // Design'dan duvar rengini al
        const design = room.design || {};
        const wallColor = design.wall_color || '#5A6A75';

        const wallMaterial = new THREE.MeshStandardMaterial({
            color: wallColor,
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
            if (room.wallTextures && room.wallTextures[direction]) {
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

        // Varsayılan değerler - daha büyük boyutlar
        const adWidth = adConfig.width || 6;  // 2'den 6'ya çıkarıldı (duvar genişliği 10)
        const adHeight = adConfig.height || 3.5; // 1'den 3.5'e çıkarıldı
        const adY = adConfig.position?.y || 2.5; // Varsayılan yükseklik (duvar ortası)
        const adOffsetX = adConfig.position?.x || 0; // Yatay offset

        // Reklam paneli geometrisi
        const adGeometry = new THREE.PlaneGeometry(adWidth, adHeight);

        // Proxy helper function
        const getProxiedUrl = (url) => {
            if (!url) return url;
            // Check if it's an external URL
            if (url.startsWith('http://') || url.startsWith('https://')) {
                return `/api/room/proxy?url=${encodeURIComponent(url)}`;
            }
            return url;
        };

        // Detect video from URL (support both adConfig.url and adConfig.content_url)
        const adUrl = adConfig.url || adConfig.content_url;
        const isVideo = adUrl && (
            adUrl.endsWith('.mp4') ||
            adUrl.endsWith('.webm') ||
            adUrl.endsWith('.ogg') ||
            adConfig.type === 'video'
        );

        // Material oluştur (image veya video)
        let adMaterial;

        if (isVideo) {
            // Video texture
            const video = document.createElement('video');
            video.src = getProxiedUrl(adUrl);
            video.loop = true;
            video.muted = true; // Otomatik oynatma için sessize al
            video.autoplay = true;
            // Remove crossOrigin when using proxy
            // video.crossOrigin = 'anonymous';

            console.log('🎬 Game video ad created (proxied):', adUrl, '→', video.src);

            // Video metadata yüklendiğinde aspect ratio'yu ayarla (her zaman)
            video.addEventListener('loadedmetadata', () => {
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
            });

            video.play().catch(err => console.warn('Video autoplay failed:', err));

            const videoTexture = new THREE.VideoTexture(video);
            videoTexture.minFilter = THREE.LinearFilter;
            videoTexture.magFilter = THREE.LinearFilter;

            adMaterial = new THREE.MeshBasicMaterial({
                map: videoTexture,
                side: THREE.DoubleSide
            });

            // Video elementini sakla (temizlik ve ses kontrolü için)
            adMaterial.userData.video = video;
            this.videoElements.push(video); // Video listesine ekle

            // Eğer ses zaten açıksa (kullanıcı daha önce oyunu başlatmışsa)
            if (this.audioEnabled) {
                video.muted = false;
                video.volume = 0.5;
                console.log('Video reklam oluşturuldu - ses açık');
            } else {
                console.log('Video reklam oluşturuldu - ses kapalı (oyuna başladığınızda açılacak)');
            }
        } else {
            // Image texture - Canvas tabanlı texture oluştur (internet gerektirmez)
            if (!adUrl || adUrl.startsWith('canvas:')) {
                // Canvas texture oluştur (yüksek çözünürlük için daha büyük)
                const canvas = document.createElement('canvas');
                canvas.width = 1024;  // Daha yüksek çözünürlük
                canvas.height = 512;
                const ctx = canvas.getContext('2d');

                // Arka plan rengi
                const bgColor = adConfig.bgColor || '#FF6B6B';
                const textColor = adConfig.textColor || '#FFFFFF';
                const text = adConfig.text || adConfig.content_text || 'REKLAM';

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
                const proxiedUrl = getProxiedUrl(adUrl);

                console.log('🖼️ Game image ad loading (proxied):', adUrl, '→', proxiedUrl);

                // Aspect ratio koruma için callback kullan (her zaman)
                const imageTexture = textureLoader.load(
                    proxiedUrl,
                    (texture) => {
                        console.log('✅ Game image ad loaded successfully:', adUrl);
                        // Texture yüklendikten sonra aspect ratio'yu ayarla
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
                    },
                    undefined,
                    (error) => {
                        console.error('❌ Error loading game image ad:', error, 'URL:', proxiedUrl);
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

    // === DECORATION CREATION METHODS ===

    // === CHRISTMAS DECORATIONS ===
    createChristmasTree(color, properties = {}) {
        const group = new THREE.Group();
        const treeColors = [color, '#008000', '#006400'];
        for (let i = 0; i < 3; i++) {
            const coneGeom = new THREE.ConeGeometry(0.8 - i * 0.2, 1.2 - i * 0.2, 8);
            const coneMat = new THREE.MeshStandardMaterial({ color: treeColors[i % 3] });
            const cone = new THREE.Mesh(coneGeom, coneMat);
            cone.position.y = 0.8 + i * 0.7;
            group.add(cone);
        }
        const trunkGeom = new THREE.CylinderGeometry(0.15, 0.2, 0.5, 8);
        const trunkMat = new THREE.MeshStandardMaterial({ color: '#8B4513' });
        const trunk = new THREE.Mesh(trunkGeom, trunkMat);
        trunk.position.y = 0.25;
        group.add(trunk);
        if (properties.star_color) {
            const starGeom = new THREE.OctahedronGeometry(0.15, 0);
            const starMat = new THREE.MeshStandardMaterial({ color: properties.star_color, emissive: properties.star_color, emissiveIntensity: 0.5 });
            const star = new THREE.Mesh(starGeom, starMat);
            star.position.y = 2.8;
            group.add(star);
        }
        if (properties.lights) {
            const ballColors = ['#FF0000', '#FFD700', '#0000FF', '#FF00FF'];
            for (let i = 0; i < 12; i++) {
                const ballGeom = new THREE.SphereGeometry(0.08, 8, 8);
                const ballMat = new THREE.MeshStandardMaterial({ color: ballColors[i % 4], emissive: ballColors[i % 4], emissiveIntensity: 0.3 });
                const ball = new THREE.Mesh(ballGeom, ballMat);
                const angle = (i / 12) * Math.PI * 2;
                const radius = 0.5 + (i % 3) * 0.15;
                const height = 0.8 + (i % 3) * 0.7;
                ball.position.set(Math.cos(angle) * radius, height, Math.sin(angle) * radius);
                group.add(ball);
            }
        }
        return group;
    }

    createGiftBox(color, properties = {}) {
        const group = new THREE.Group();
        const boxGeom = new THREE.BoxGeometry(0.8, 0.8, 0.8);
        const boxMat = new THREE.MeshStandardMaterial({ color: color });
        const box = new THREE.Mesh(boxGeom, boxMat);
        box.position.y = 0.4;
        group.add(box);
        const ribbonColor = properties.ribbon_color || '#FFD700';
        const ribbonMat = new THREE.MeshStandardMaterial({ color: ribbonColor });
        const ribbonH = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.1, 0.15), ribbonMat);
        ribbonH.position.y = 0.8;
        group.add(ribbonH);
        const ribbonV = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.1, 0.85), ribbonMat);
        ribbonV.position.y = 0.8;
        group.add(ribbonV);
        const bowGeom = new THREE.SphereGeometry(0.15, 8, 8);
        const bow = new THREE.Mesh(bowGeom, ribbonMat);
        bow.position.y = 0.95;
        group.add(bow);
        return group;
    }

    createSnowman(color) {
        const group = new THREE.Group();
        const snowMat = new THREE.MeshStandardMaterial({ color: color });
        const sizes = [0.5, 0.35, 0.25];
        let y = 0;
        sizes.forEach((size) => {
            const sphere = new THREE.Mesh(new THREE.SphereGeometry(size, 16, 16), snowMat);
            y += size;
            sphere.position.y = y;
            y += size * 0.8;
            group.add(sphere);
        });
        const eyeMat = new THREE.MeshStandardMaterial({ color: '#000000' });
        [-0.08, 0.08].forEach(x => {
            const eye = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 8), eyeMat);
            eye.position.set(x, 1.65, 0.2);
            group.add(eye);
        });
        const noseGeom = new THREE.ConeGeometry(0.04, 0.2, 8);
        const noseMat = new THREE.MeshStandardMaterial({ color: '#FF6600' });
        const nose = new THREE.Mesh(noseGeom, noseMat);
        nose.position.set(0, 1.55, 0.25);
        nose.rotation.x = Math.PI / 2;
        group.add(nose);
        const hatMat = new THREE.MeshStandardMaterial({ color: '#1A1A1A' });
        const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.05, 16), hatMat);
        brim.position.y = 1.85;
        group.add(brim);
        const top = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.3, 16), hatMat);
        top.position.y = 2.05;
        group.add(top);
        return group;
    }

    createCandyCane(color) {
        const group = new THREE.Group();
        const straightGeom = new THREE.CylinderGeometry(0.1, 0.1, 1.5, 8);
        const candyMat = new THREE.MeshStandardMaterial({ color: color });
        const straight = new THREE.Mesh(straightGeom, candyMat);
        straight.position.y = 0.75;
        group.add(straight);
        const curveGeom = new THREE.TorusGeometry(0.2, 0.1, 8, 16, Math.PI);
        const curve = new THREE.Mesh(curveGeom, candyMat);
        curve.position.set(0.2, 1.5, 0);
        curve.rotation.z = Math.PI / 2;
        group.add(curve);
        return group;
    }

    createStringLights(properties = {}) {
        const group = new THREE.Group();
        const colors = properties.colors || ['#FF0000', '#00FF00', '#0000FF', '#FFD700'];
        const radius = 4.5;
        const numLights = 24;
        for (let i = 0; i < numLights; i++) {
            const angle = (i / numLights) * Math.PI * 2;
            const bulbGeom = new THREE.SphereGeometry(0.08, 8, 8);
            const bulbMat = new THREE.MeshStandardMaterial({ color: colors[i % colors.length], emissive: colors[i % colors.length], emissiveIntensity: 0.5 });
            const bulb = new THREE.Mesh(bulbGeom, bulbMat);
            bulb.position.set(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
            group.add(bulb);
        }
        return group;
    }

    // === HALLOWEEN DECORATIONS ===
    createPumpkin(color, properties = {}) {
        const group = new THREE.Group();
        const pumpkinGeom = new THREE.SphereGeometry(0.5, 16, 16);
        const pumpkinMat = new THREE.MeshStandardMaterial({ color: color, emissive: properties.glowing ? '#FF6600' : '#000000', emissiveIntensity: properties.glowing ? 0.3 : 0 });
        const pumpkin = new THREE.Mesh(pumpkinGeom, pumpkinMat);
        pumpkin.scale.set(1, 0.8, 1);
        pumpkin.position.y = 0.4;
        group.add(pumpkin);
        const stemGeom = new THREE.CylinderGeometry(0.05, 0.08, 0.2, 8);
        const stemMat = new THREE.MeshStandardMaterial({ color: '#228B22' });
        const stem = new THREE.Mesh(stemGeom, stemMat);
        stem.position.y = 0.85;
        group.add(stem);
        if (properties.glowing) {
            const eyeMat = new THREE.MeshStandardMaterial({ color: '#FFD700', emissive: '#FFD700', emissiveIntensity: 0.8 });
            [-0.15, 0.15].forEach(x => {
                const eyeGeom = new THREE.ConeGeometry(0.08, 0.1, 3);
                const eye = new THREE.Mesh(eyeGeom, eyeMat);
                eye.position.set(x, 0.5, 0.45);
                eye.rotation.x = Math.PI;
                group.add(eye);
            });
            const mouthGeom = new THREE.BoxGeometry(0.25, 0.08, 0.1);
            const mouth = new THREE.Mesh(mouthGeom, eyeMat);
            mouth.position.set(0, 0.3, 0.45);
            group.add(mouth);
        }
        return group;
    }

    createBat(color) {
        const group = new THREE.Group();
        const bodyGeom = new THREE.SphereGeometry(0.15, 8, 8);
        const batMat = new THREE.MeshStandardMaterial({ color: color });
        const body = new THREE.Mesh(bodyGeom, batMat);
        body.scale.set(1, 0.8, 0.6);
        group.add(body);
        const wingGeom = new THREE.PlaneGeometry(0.4, 0.3);
        const wingMat = new THREE.MeshStandardMaterial({ color: color, side: THREE.DoubleSide });
        [-0.25, 0.25].forEach((x, i) => {
            const wing = new THREE.Mesh(wingGeom, wingMat);
            wing.position.set(x, 0, 0);
            wing.rotation.y = i === 0 ? -0.3 : 0.3;
            group.add(wing);
        });
        const eyeMat = new THREE.MeshStandardMaterial({ color: '#FF0000', emissive: '#FF0000', emissiveIntensity: 0.3 });
        [-0.05, 0.05].forEach(x => {
            const eye = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 8), eyeMat);
            eye.position.set(x, 0.05, 0.12);
            group.add(eye);
        });
        return group;
    }

    createSpiderWeb(color) {
        const group = new THREE.Group();
        const webMat = new THREE.LineBasicMaterial({ color: color, transparent: true, opacity: 0.6 });
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            const points = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(Math.cos(angle), Math.sin(angle), 0)];
            const lineGeom = new THREE.BufferGeometry().setFromPoints(points);
            const line = new THREE.Line(lineGeom, webMat);
            group.add(line);
        }
        for (let ring = 0.2; ring <= 1; ring += 0.2) {
            const points = [];
            for (let i = 0; i <= 32; i++) {
                const angle = (i / 32) * Math.PI * 2;
                points.push(new THREE.Vector3(Math.cos(angle) * ring, Math.sin(angle) * ring, 0));
            }
            const ringGeom = new THREE.BufferGeometry().setFromPoints(points);
            const ringLine = new THREE.Line(ringGeom, webMat);
            group.add(ringLine);
        }
        return group;
    }

    createCauldron(color, properties = {}) {
        const group = new THREE.Group();
        const cauldronGeom = new THREE.SphereGeometry(0.5, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2);
        const cauldronMat = new THREE.MeshStandardMaterial({ color: color, metalness: 0.5 });
        const cauldron = new THREE.Mesh(cauldronGeom, cauldronMat);
        cauldron.rotation.x = Math.PI;
        cauldron.position.y = 0.5;
        group.add(cauldron);
        const rimGeom = new THREE.TorusGeometry(0.5, 0.05, 8, 32);
        const rim = new THREE.Mesh(rimGeom, cauldronMat);
        rim.position.y = 0.5;
        rim.rotation.x = Math.PI / 2;
        group.add(rim);
        if (properties.bubbling) {
            const liquidGeom = new THREE.CircleGeometry(0.45, 16);
            const liquidMat = new THREE.MeshStandardMaterial({ color: properties.smoke_color || '#00FF00', emissive: properties.smoke_color || '#00FF00', emissiveIntensity: 0.5 });
            const liquid = new THREE.Mesh(liquidGeom, liquidMat);
            liquid.rotation.x = -Math.PI / 2;
            liquid.position.y = 0.45;
            group.add(liquid);
        }
        return group;
    }

    // === OFFICE DECORATIONS ===
    createDesk(color) {
        const group = new THREE.Group();
        const deskMat = new THREE.MeshStandardMaterial({ color: color });
        const topGeom = new THREE.BoxGeometry(2, 0.1, 1);
        const top = new THREE.Mesh(topGeom, deskMat);
        top.position.y = 0.75;
        group.add(top);
        const legGeom = new THREE.BoxGeometry(0.1, 0.75, 0.1);
        [[-0.9, -0.4], [-0.9, 0.4], [0.9, -0.4], [0.9, 0.4]].forEach(([x, z]) => {
            const leg = new THREE.Mesh(legGeom, deskMat);
            leg.position.set(x, 0.375, z);
            group.add(leg);
        });
        return group;
    }

    createOfficeChair(color) {
        const group = new THREE.Group();
        const chairMat = new THREE.MeshStandardMaterial({ color: color });
        const seatGeom = new THREE.BoxGeometry(0.5, 0.1, 0.5);
        const seat = new THREE.Mesh(seatGeom, chairMat);
        seat.position.y = 0.5;
        group.add(seat);
        const backGeom = new THREE.BoxGeometry(0.5, 0.6, 0.1);
        const back = new THREE.Mesh(backGeom, chairMat);
        back.position.set(0, 0.85, -0.2);
        group.add(back);
        const baseGeom = new THREE.CylinderGeometry(0.05, 0.05, 0.5, 8);
        const baseMat = new THREE.MeshStandardMaterial({ color: '#C0C0C0' });
        const base = new THREE.Mesh(baseGeom, baseMat);
        base.position.y = 0.25;
        group.add(base);
        return group;
    }

    createDeskLamp(color) {
        const group = new THREE.Group();
        const metalMat = new THREE.MeshStandardMaterial({ color: color, metalness: 0.7 });
        const baseGeom = new THREE.CylinderGeometry(0.15, 0.15, 0.05, 16);
        const base = new THREE.Mesh(baseGeom, metalMat);
        base.position.y = 0.025;
        group.add(base);
        const armGeom = new THREE.CylinderGeometry(0.02, 0.02, 0.5, 8);
        const arm = new THREE.Mesh(armGeom, metalMat);
        arm.position.set(0, 0.3, 0);
        arm.rotation.z = 0.3;
        group.add(arm);
        const headGeom = new THREE.ConeGeometry(0.15, 0.2, 16);
        const head = new THREE.Mesh(headGeom, metalMat);
        head.position.set(0.15, 0.55, 0);
        head.rotation.z = -Math.PI / 2;
        group.add(head);
        const light = new THREE.PointLight(0xFFFFAA, 0.5, 2);
        light.position.set(0.25, 0.5, 0);
        group.add(light);
        return group;
    }

    createWaterCooler(color) {
        const group = new THREE.Group();
        const bodyGeom = new THREE.BoxGeometry(0.4, 1.2, 0.4);
        const bodyMat = new THREE.MeshStandardMaterial({ color: '#FFFFFF' });
        const body = new THREE.Mesh(bodyGeom, bodyMat);
        body.position.y = 0.6;
        group.add(body);
        const bottleGeom = new THREE.CylinderGeometry(0.15, 0.15, 0.5, 16);
        const bottleMat = new THREE.MeshStandardMaterial({ color: color, transparent: true, opacity: 0.6 });
        const bottle = new THREE.Mesh(bottleGeom, bottleMat);
        bottle.position.y = 1.45;
        group.add(bottle);
        return group;
    }

    createClock(color) {
        const group = new THREE.Group();
        const faceGeom = new THREE.CircleGeometry(0.4, 32);
        const faceMat = new THREE.MeshStandardMaterial({ color: color });
        const face = new THREE.Mesh(faceGeom, faceMat);
        group.add(face);
        const frameGeom = new THREE.RingGeometry(0.38, 0.42, 32);
        const frameMat = new THREE.MeshStandardMaterial({ color: '#1A1A1A' });
        const frame = new THREE.Mesh(frameGeom, frameMat);
        frame.position.z = 0.01;
        group.add(frame);
        const handMat = new THREE.MeshStandardMaterial({ color: '#1A1A1A' });
        const hourHand = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.2, 0.02), handMat);
        hourHand.position.set(0, 0.1, 0.02);
        group.add(hourHand);
        const minuteHand = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.3, 0.015), handMat);
        minuteHand.position.set(0, 0.15, 0.02);
        minuteHand.rotation.z = Math.PI / 3;
        group.add(minuteHand);
        return group;
    }

    // === OLD SALON DECORATIONS ===
    createFireplace(color, properties = {}) {
        const group = new THREE.Group();
        const brickMat = new THREE.MeshStandardMaterial({ color: color });
        const frameGeom = new THREE.BoxGeometry(2, 1.5, 0.3);
        const frame = new THREE.Mesh(frameGeom, brickMat);
        frame.position.y = 0.75;
        group.add(frame);
        const openingGeom = new THREE.BoxGeometry(1.2, 1, 0.35);
        const openingMat = new THREE.MeshStandardMaterial({ color: '#1A1A1A' });
        const opening = new THREE.Mesh(openingGeom, openingMat);
        opening.position.set(0, 0.5, 0.05);
        group.add(opening);
        const mantleGeom = new THREE.BoxGeometry(2.2, 0.1, 0.4);
        const mantle = new THREE.Mesh(mantleGeom, brickMat);
        mantle.position.y = 1.55;
        group.add(mantle);
        if (properties.fire) {
            const fireLight = new THREE.PointLight(0xFF6600, 0.8, 3);
            fireLight.position.set(0, 0.5, 0.3);
            group.add(fireLight);
            const fireGeom = new THREE.ConeGeometry(0.3, 0.6, 8);
            const fireMat = new THREE.MeshStandardMaterial({ color: '#FF4500', emissive: '#FF4500', emissiveIntensity: 0.8 });
            const fire = new THREE.Mesh(fireGeom, fireMat);
            fire.position.set(0, 0.3, 0.2);
            group.add(fire);
        }
        return group;
    }

    createChandelier(color, properties = {}) {
        const group = new THREE.Group();
        const metalMat = new THREE.MeshStandardMaterial({ color: color, metalness: 0.8 });
        const centralGeom = new THREE.CylinderGeometry(0.1, 0.15, 0.3, 8);
        const central = new THREE.Mesh(centralGeom, metalMat);
        group.add(central);
        const numCandles = properties.candles || 6;
        for (let i = 0; i < numCandles; i++) {
            const angle = (i / numCandles) * Math.PI * 2;
            const radius = 0.4;
            const armGeom = new THREE.CylinderGeometry(0.02, 0.02, radius * 2, 8);
            const arm = new THREE.Mesh(armGeom, metalMat);
            arm.position.set(Math.cos(angle) * radius / 2, -0.1, Math.sin(angle) * radius / 2);
            arm.rotation.z = Math.PI / 2;
            arm.rotation.y = angle;
            group.add(arm);
            const holderGeom = new THREE.CylinderGeometry(0.04, 0.05, 0.1, 8);
            const holder = new THREE.Mesh(holderGeom, metalMat);
            holder.position.set(Math.cos(angle) * radius, -0.2, Math.sin(angle) * radius);
            group.add(holder);
            const flameGeom = new THREE.SphereGeometry(0.04, 8, 8);
            const flameMat = new THREE.MeshStandardMaterial({ color: '#FFD700', emissive: '#FFD700', emissiveIntensity: 0.8 });
            const flame = new THREE.Mesh(flameGeom, flameMat);
            flame.position.set(Math.cos(angle) * radius, -0.1, Math.sin(angle) * radius);
            group.add(flame);
        }
        const light = new THREE.PointLight(0xFFD700, 0.6, 5);
        light.position.y = -0.2;
        group.add(light);
        return group;
    }

    createGrandfatherClock(color) {
        const group = new THREE.Group();
        const woodMat = new THREE.MeshStandardMaterial({ color: color });
        const bodyGeom = new THREE.BoxGeometry(0.6, 2.2, 0.4);
        const body = new THREE.Mesh(bodyGeom, woodMat);
        body.position.y = 1.1;
        group.add(body);
        const crownGeom = new THREE.BoxGeometry(0.7, 0.2, 0.45);
        const crown = new THREE.Mesh(crownGeom, woodMat);
        crown.position.y = 2.3;
        group.add(crown);
        const faceGeom = new THREE.CircleGeometry(0.2, 32);
        const faceMat = new THREE.MeshStandardMaterial({ color: '#FFFFF0' });
        const face = new THREE.Mesh(faceGeom, faceMat);
        face.position.set(0, 1.8, 0.21);
        group.add(face);
        return group;
    }

    createArmchair(color, properties = {}) {
        const group = new THREE.Group();
        const fabricMat = new THREE.MeshStandardMaterial({ color: color });
        const seatGeom = new THREE.BoxGeometry(0.8, 0.2, 0.8);
        const seat = new THREE.Mesh(seatGeom, fabricMat);
        seat.position.y = 0.4;
        group.add(seat);
        const backGeom = new THREE.BoxGeometry(0.8, 0.8, 0.15);
        const back = new THREE.Mesh(backGeom, fabricMat);
        back.position.set(0, 0.9, -0.35);
        group.add(back);
        [0.45, -0.45].forEach(x => {
            const armGeom = new THREE.BoxGeometry(0.15, 0.3, 0.8);
            const arm = new THREE.Mesh(armGeom, fabricMat);
            arm.position.set(x, 0.65, 0);
            group.add(arm);
        });
        if (properties.rotation_y) group.rotation.y = properties.rotation_y;
        return group;
    }

    createCandelabra(color, properties = {}) {
        const group = new THREE.Group();
        const metalMat = new THREE.MeshStandardMaterial({ color: color, metalness: 0.8 });
        const baseGeom = new THREE.CylinderGeometry(0.1, 0.15, 0.05, 16);
        const base = new THREE.Mesh(baseGeom, metalMat);
        group.add(base);
        const stemGeom = new THREE.CylinderGeometry(0.02, 0.02, 0.4, 8);
        const stem = new THREE.Mesh(stemGeom, metalMat);
        stem.position.y = 0.22;
        group.add(stem);
        const positions = [[0, 0], [-0.1, 0], [0.1, 0]];
        positions.forEach(([x, z], i) => {
            const holderGeom = new THREE.CylinderGeometry(0.03, 0.03, 0.05, 8);
            const holder = new THREE.Mesh(holderGeom, metalMat);
            holder.position.set(x, 0.45 + i * 0.05, z);
            group.add(holder);
            if (properties.lit) {
                const flameGeom = new THREE.ConeGeometry(0.02, 0.06, 8);
                const flameMat = new THREE.MeshStandardMaterial({ color: '#FF6600', emissive: '#FF6600', emissiveIntensity: 0.8 });
                const flame = new THREE.Mesh(flameGeom, flameMat);
                flame.position.set(x, 0.52 + i * 0.05, z);
                group.add(flame);
            }
        });
        return group;
    }

    // === SPACESHIP DECORATIONS ===
    createControlPanel(color, properties = {}) {
        const group = new THREE.Group();
        const panelMat = new THREE.MeshStandardMaterial({ color: color });
        const baseGeom = new THREE.BoxGeometry(3, 1.2, 0.3);
        const base = new THREE.Mesh(baseGeom, panelMat);
        base.position.y = 0.6;
        group.add(base);
        const screenMat = new THREE.MeshStandardMaterial({ color: properties.screen_color || '#00FFFF', emissive: properties.screen_color || '#00FFFF', emissiveIntensity: 0.5 });
        for (let i = -1; i <= 1; i++) {
            const screenGeom = new THREE.PlaneGeometry(0.8, 0.6);
            const screen = new THREE.Mesh(screenGeom, screenMat);
            screen.position.set(i * 0.9, 0.8, 0.16);
            group.add(screen);
        }
        const buttonMat = new THREE.MeshStandardMaterial({ color: '#FF0000', emissive: '#FF0000', emissiveIntensity: properties.blinking ? 0.5 : 0.2 });
        for (let i = 0; i < 6; i++) {
            const buttonGeom = new THREE.CylinderGeometry(0.03, 0.03, 0.02, 8);
            const button = new THREE.Mesh(buttonGeom, buttonMat);
            button.position.set(-1 + i * 0.4, 0.3, 0.16);
            button.rotation.x = Math.PI / 2;
            group.add(button);
        }
        return group;
    }

    createHologram(color, properties = {}) {
        const group = new THREE.Group();
        const holoMat = new THREE.MeshStandardMaterial({ color: color, emissive: color, emissiveIntensity: 0.5, transparent: true, opacity: 0.6 });
        const projGeom = new THREE.CylinderGeometry(0.3, 0.4, 0.1, 16);
        const projMat = new THREE.MeshStandardMaterial({ color: '#1A1A1A', metalness: 0.8 });
        const proj = new THREE.Mesh(projGeom, projMat);
        group.add(proj);
        let holoGeom = properties.shape === 'globe' ? new THREE.SphereGeometry(0.4, 16, 16) : new THREE.IcosahedronGeometry(0.4, 0);
        const holo = new THREE.Mesh(holoGeom, holoMat);
        holo.position.y = 0.6;
        group.add(holo);
        const beamGeom = new THREE.ConeGeometry(0.1, 0.5, 16);
        const beamMat = new THREE.MeshStandardMaterial({ color: color, transparent: true, opacity: 0.3 });
        const beam = new THREE.Mesh(beamGeom, beamMat);
        beam.position.y = 0.25;
        group.add(beam);
        return group;
    }

    createLightTube(color) {
        const group = new THREE.Group();
        const tubeGeom = new THREE.CylinderGeometry(0.05, 0.05, 3, 8);
        const tubeMat = new THREE.MeshStandardMaterial({ color: color, emissive: color, emissiveIntensity: 0.8 });
        const tube = new THREE.Mesh(tubeGeom, tubeMat);
        group.add(tube);
        const light = new THREE.PointLight(new THREE.Color(color).getHex(), 0.5, 3);
        group.add(light);
        return group;
    }

    createCryopod(color, properties = {}) {
        const group = new THREE.Group();
        const podGeom = new THREE.CapsuleGeometry(0.4, 1.2, 8, 16);
        const podMat = new THREE.MeshStandardMaterial({ color: color, transparent: true, opacity: 0.6, metalness: 0.5 });
        const pod = new THREE.Mesh(podGeom, podMat);
        pod.position.y = 1;
        group.add(pod);
        const baseGeom = new THREE.CylinderGeometry(0.5, 0.6, 0.2, 16);
        const baseMat = new THREE.MeshStandardMaterial({ color: '#1A1A1A', metalness: 0.8 });
        const base = new THREE.Mesh(baseGeom, baseMat);
        base.position.y = 0.1;
        group.add(base);
        if (properties.frost) {
            const frostLight = new THREE.PointLight(0x87CEEB, 0.3, 2);
            frostLight.position.y = 1;
            group.add(frostLight);
        }
        return group;
    }

    createRobot(color) {
        const group = new THREE.Group();
        const metalMat = new THREE.MeshStandardMaterial({ color: color, metalness: 0.8 });
        const headGeom = new THREE.BoxGeometry(0.4, 0.3, 0.3);
        const head = new THREE.Mesh(headGeom, metalMat);
        head.position.y = 1.4;
        group.add(head);
        const eyeMat = new THREE.MeshStandardMaterial({ color: '#00FF00', emissive: '#00FF00', emissiveIntensity: 0.5 });
        [-0.1, 0.1].forEach(x => {
            const eye = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), eyeMat);
            eye.position.set(x, 1.45, 0.16);
            group.add(eye);
        });
        const bodyGeom = new THREE.BoxGeometry(0.5, 0.6, 0.35);
        const body = new THREE.Mesh(bodyGeom, metalMat);
        body.position.y = 1;
        group.add(body);
        [-0.15, 0.15].forEach(x => {
            const legGeom = new THREE.BoxGeometry(0.15, 0.7, 0.15);
            const leg = new THREE.Mesh(legGeom, metalMat);
            leg.position.set(x, 0.35, 0);
            group.add(leg);
        });
        [-0.35, 0.35].forEach(x => {
            const armGeom = new THREE.BoxGeometry(0.1, 0.4, 0.1);
            const arm = new THREE.Mesh(armGeom, metalMat);
            arm.position.set(x, 1, 0);
            group.add(arm);
        });
        return group;
    }

    // === UNDERWATER DECORATIONS ===
    createCoral(color) {
        const group = new THREE.Group();
        const coralMat = new THREE.MeshStandardMaterial({ color: color });
        for (let i = 0; i < 5; i++) {
            const branchGeom = new THREE.CylinderGeometry(0.02, 0.08, 0.5 + Math.random() * 0.5, 8);
            const branch = new THREE.Mesh(branchGeom, coralMat);
            branch.position.set((Math.random() - 0.5) * 0.4, (0.25 + Math.random() * 0.25), (Math.random() - 0.5) * 0.4);
            branch.rotation.x = (Math.random() - 0.5) * 0.5;
            branch.rotation.z = (Math.random() - 0.5) * 0.5;
            group.add(branch);
        }
        return group;
    }

    createSeashell(color) {
        const group = new THREE.Group();
        const shellGeom = new THREE.SphereGeometry(0.3, 16, 8, 0, Math.PI);
        const shellMat = new THREE.MeshStandardMaterial({ color: color });
        const shell = new THREE.Mesh(shellGeom, shellMat);
        shell.rotation.x = -Math.PI / 2;
        shell.scale.y = 0.5;
        group.add(shell);
        return group;
    }

    createStarfish(color) {
        const group = new THREE.Group();
        const starMat = new THREE.MeshStandardMaterial({ color: color });
        const centerGeom = new THREE.CylinderGeometry(0.15, 0.15, 0.05, 16);
        const center = new THREE.Mesh(centerGeom, starMat);
        center.rotation.x = Math.PI / 2;
        group.add(center);
        for (let i = 0; i < 5; i++) {
            const angle = (i / 5) * Math.PI * 2;
            const armGeom = new THREE.ConeGeometry(0.08, 0.4, 8);
            const arm = new THREE.Mesh(armGeom, starMat);
            arm.position.set(Math.cos(angle) * 0.25, 0, Math.sin(angle) * 0.25);
            arm.rotation.z = Math.PI / 2;
            arm.rotation.y = -angle;
            group.add(arm);
        }
        return group;
    }

    createBubbles(color, properties = {}) {
        const group = new THREE.Group();
        const bubbleMat = new THREE.MeshStandardMaterial({ color: color, transparent: true, opacity: 0.4 });
        for (let i = 0; i < 15; i++) {
            const size = 0.05 + Math.random() * 0.1;
            const bubbleGeom = new THREE.SphereGeometry(size, 8, 8);
            const bubble = new THREE.Mesh(bubbleGeom, bubbleMat);
            bubble.position.set((Math.random() - 0.5) * 4, Math.random() * 3, (Math.random() - 0.5) * 4);
            group.add(bubble);
        }
        return group;
    }

    createFish(color, properties = {}) {
        const group = new THREE.Group();
        const fishMat = new THREE.MeshStandardMaterial({ color: color });
        const bodyGeom = new THREE.SphereGeometry(0.2, 16, 16);
        const body = new THREE.Mesh(bodyGeom, fishMat);
        body.scale.set(1.5, 0.8, 0.5);
        group.add(body);
        const tailGeom = new THREE.ConeGeometry(0.15, 0.3, 8);
        const tail = new THREE.Mesh(tailGeom, fishMat);
        tail.position.x = -0.35;
        tail.rotation.z = Math.PI / 2;
        group.add(tail);
        const eyeMat = new THREE.MeshStandardMaterial({ color: '#FFFFFF' });
        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 8), eyeMat);
        eye.position.set(0.2, 0.05, 0.08);
        group.add(eye);
        return group;
    }

    createTreasureChest(color, properties = {}) {
        const group = new THREE.Group();
        const woodMat = new THREE.MeshStandardMaterial({ color: color });
        const baseGeom = new THREE.BoxGeometry(0.8, 0.4, 0.5);
        const base = new THREE.Mesh(baseGeom, woodMat);
        base.position.y = 0.2;
        group.add(base);
        const lidGeom = new THREE.CylinderGeometry(0.25, 0.25, 0.8, 16, 1, false, 0, Math.PI);
        const lid = new THREE.Mesh(lidGeom, woodMat);
        lid.rotation.z = Math.PI / 2;
        lid.position.y = 0.4;
        if (properties.open) { lid.rotation.x = -0.5; lid.position.z = -0.15; }
        group.add(lid);
        if (properties.gold && properties.open) {
            const goldMat = new THREE.MeshStandardMaterial({ color: '#FFD700', emissive: '#FFD700', emissiveIntensity: 0.3, metalness: 0.8 });
            for (let i = 0; i < 8; i++) {
                const coinGeom = new THREE.CylinderGeometry(0.05, 0.05, 0.02, 8);
                const coin = new THREE.Mesh(coinGeom, goldMat);
                coin.position.set((Math.random() - 0.5) * 0.4, 0.35 + Math.random() * 0.1, (Math.random() - 0.5) * 0.2);
                coin.rotation.x = Math.random() * Math.PI;
                group.add(coin);
            }
        }
        return group;
    }

    // === FOREST DECORATIONS ===
    createTreeStump(color) {
        const group = new THREE.Group();
        const woodMat = new THREE.MeshStandardMaterial({ color: color });
        const stumpGeom = new THREE.CylinderGeometry(0.4, 0.5, 0.6, 12);
        const stump = new THREE.Mesh(stumpGeom, woodMat);
        stump.position.y = 0.3;
        group.add(stump);
        const topGeom = new THREE.CircleGeometry(0.4, 12);
        const topMat = new THREE.MeshStandardMaterial({ color: '#DEB887' });
        const top = new THREE.Mesh(topGeom, topMat);
        top.rotation.x = -Math.PI / 2;
        top.position.y = 0.61;
        group.add(top);
        return group;
    }

    createMushroom(color, properties = {}) {
        const group = new THREE.Group();
        const stemGeom = new THREE.CylinderGeometry(0.08, 0.1, 0.3, 8);
        const stemMat = new THREE.MeshStandardMaterial({ color: '#FFFFF0' });
        const stem = new THREE.Mesh(stemGeom, stemMat);
        stem.position.y = 0.15;
        group.add(stem);
        const capGeom = new THREE.SphereGeometry(0.2, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2);
        const capMat = new THREE.MeshStandardMaterial({ color: color });
        const cap = new THREE.Mesh(capGeom, capMat);
        cap.position.y = 0.3;
        group.add(cap);
        if (properties.spots) {
            const spotMat = new THREE.MeshStandardMaterial({ color: '#FFFFFF' });
            for (let i = 0; i < 5; i++) {
                const spotGeom = new THREE.CircleGeometry(0.03, 8);
                const spot = new THREE.Mesh(spotGeom, spotMat);
                const angle = (i / 5) * Math.PI * 2;
                spot.position.set(Math.cos(angle) * 0.12, 0.35 + Math.sin(angle * 2) * 0.03, Math.sin(angle) * 0.12);
                spot.lookAt(spot.position.clone().multiplyScalar(2));
                group.add(spot);
            }
        }
        return group;
    }

    createFern(color) {
        const group = new THREE.Group();
        const fernMat = new THREE.MeshStandardMaterial({ color: color, side: THREE.DoubleSide });
        for (let i = 0; i < 8; i++) {
            const frondGeom = new THREE.PlaneGeometry(0.1, 0.8);
            const frond = new THREE.Mesh(frondGeom, fernMat);
            const angle = (i / 8) * Math.PI * 2;
            frond.position.set(Math.cos(angle) * 0.1, 0.4, Math.sin(angle) * 0.1);
            frond.rotation.y = angle;
            frond.rotation.x = -0.5;
            group.add(frond);
        }
        return group;
    }

    createRock(color) {
        const group = new THREE.Group();
        const rockMat = new THREE.MeshStandardMaterial({ color: color, roughness: 0.9 });
        const rockGeom = new THREE.DodecahedronGeometry(0.4, 1);
        const rock = new THREE.Mesh(rockGeom, rockMat);
        rock.scale.set(1, 0.6, 1);
        rock.position.y = 0.2;
        group.add(rock);
        return group;
    }

    createFireflies(color, properties = {}) {
        const group = new THREE.Group();
        const count = properties.count || 20;
        const fireflyMat = new THREE.MeshStandardMaterial({ color: color, emissive: color, emissiveIntensity: 0.8 });
        for (let i = 0; i < count; i++) {
            const fireflyGeom = new THREE.SphereGeometry(0.03, 8, 8);
            const firefly = new THREE.Mesh(fireflyGeom, fireflyMat);
            firefly.position.set((Math.random() - 0.5) * 4, 0.5 + Math.random() * 2.5, (Math.random() - 0.5) * 4);
            group.add(firefly);
        }
        return group;
    }

    createBird(color) {
        const group = new THREE.Group();
        const birdMat = new THREE.MeshStandardMaterial({ color: color });
        const bodyGeom = new THREE.SphereGeometry(0.15, 8, 8);
        const body = new THREE.Mesh(bodyGeom, birdMat);
        body.scale.set(1.2, 0.8, 0.8);
        group.add(body);
        const headGeom = new THREE.SphereGeometry(0.1, 8, 8);
        const head = new THREE.Mesh(headGeom, birdMat);
        head.position.set(0.15, 0.08, 0);
        group.add(head);
        const beakGeom = new THREE.ConeGeometry(0.03, 0.1, 8);
        const beakMat = new THREE.MeshStandardMaterial({ color: '#FFD700' });
        const beak = new THREE.Mesh(beakGeom, beakMat);
        beak.position.set(0.28, 0.08, 0);
        beak.rotation.z = -Math.PI / 2;
        group.add(beak);
        const wingGeom = new THREE.PlaneGeometry(0.2, 0.1);
        [0.08, -0.08].forEach(z => {
            const wing = new THREE.Mesh(wingGeom, birdMat);
            wing.position.set(0, 0.05, z);
            wing.rotation.x = z > 0 ? 0.3 : -0.3;
            group.add(wing);
        });
        return group;
    }

    // === DESERT DECORATIONS ===
    createCactus(color) {
        const group = new THREE.Group();
        const cactusMat = new THREE.MeshStandardMaterial({ color: color });
        const bodyGeom = new THREE.CylinderGeometry(0.2, 0.25, 1.5, 8);
        const body = new THREE.Mesh(bodyGeom, cactusMat);
        body.position.y = 0.75;
        group.add(body);
        const armGeom = new THREE.CylinderGeometry(0.1, 0.12, 0.5, 8);
        const leftArm = new THREE.Mesh(armGeom, cactusMat);
        leftArm.position.set(-0.3, 0.8, 0);
        leftArm.rotation.z = Math.PI / 4;
        group.add(leftArm);
        const rightArm = new THREE.Mesh(armGeom, cactusMat);
        rightArm.position.set(0.3, 1, 0);
        rightArm.rotation.z = -Math.PI / 4;
        group.add(rightArm);
        return group;
    }

    createSandDune(color) {
        const group = new THREE.Group();
        const sandMat = new THREE.MeshStandardMaterial({ color: color });
        const duneGeom = new THREE.SphereGeometry(1, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2);
        const dune = new THREE.Mesh(duneGeom, sandMat);
        dune.scale.set(1, 0.3, 1);
        group.add(dune);
        return group;
    }

    createSkull(color) {
        const group = new THREE.Group();
        const boneMat = new THREE.MeshStandardMaterial({ color: color });
        const craniumGeom = new THREE.SphereGeometry(0.2, 16, 16);
        const cranium = new THREE.Mesh(craniumGeom, boneMat);
        cranium.scale.set(0.8, 1, 0.9);
        cranium.position.y = 0.15;
        group.add(cranium);
        const jawGeom = new THREE.BoxGeometry(0.15, 0.08, 0.12);
        const jaw = new THREE.Mesh(jawGeom, boneMat);
        jaw.position.set(0, 0.02, 0.08);
        group.add(jaw);
        const socketMat = new THREE.MeshStandardMaterial({ color: '#000000' });
        [-0.06, 0.06].forEach(x => {
            const socket = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 8), socketMat);
            socket.position.set(x, 0.18, 0.15);
            group.add(socket);
        });
        return group;
    }

    createTumbleweed(color) {
        const group = new THREE.Group();
        const twMat = new THREE.MeshStandardMaterial({ color: color, wireframe: true });
        const twGeom = new THREE.IcosahedronGeometry(0.3, 1);
        const tw = new THREE.Mesh(twGeom, twMat);
        group.add(tw);
        return group;
    }

    createPottery(color) {
        const group = new THREE.Group();
        const clayMat = new THREE.MeshStandardMaterial({ color: color });
        const points = [];
        for (let i = 0; i < 10; i++) {
            const t = i / 9;
            const r = 0.15 + Math.sin(t * Math.PI) * 0.15;
            points.push(new THREE.Vector2(r, t * 0.8));
        }
        const vaseGeom = new THREE.LatheGeometry(points, 16);
        const vase = new THREE.Mesh(vaseGeom, clayMat);
        group.add(vase);
        return group;
    }

    createSun(color, properties = {}) {
        const group = new THREE.Group();
        const sunMat = new THREE.MeshStandardMaterial({ color: color, emissive: color, emissiveIntensity: properties.glowing ? 0.8 : 0.3 });
        const sunGeom = new THREE.CircleGeometry(0.5, 32);
        const sun = new THREE.Mesh(sunGeom, sunMat);
        group.add(sun);
        for (let i = 0; i < 8; i++) {
            const rayGeom = new THREE.PlaneGeometry(0.1, 0.3);
            const ray = new THREE.Mesh(rayGeom, sunMat);
            const angle = (i / 8) * Math.PI * 2;
            ray.position.set(Math.cos(angle) * 0.7, Math.sin(angle) * 0.7, 0);
            ray.rotation.z = angle + Math.PI / 2;
            group.add(ray);
        }
        if (properties.glowing) {
            const light = new THREE.PointLight(0xFFD700, 0.5, 5);
            group.add(light);
        }
        return group;
    }

    // === CYBERPUNK DECORATIONS ===
    createNeonSign(color, properties = {}) {
        const group = new THREE.Group();
        const neonMat = new THREE.MeshStandardMaterial({ color: color, emissive: color, emissiveIntensity: properties.flicker ? 0.8 : 0.6 });
        const backGeom = new THREE.BoxGeometry(2.5, 0.8, 0.1);
        const backMat = new THREE.MeshStandardMaterial({ color: '#1A1A1A' });
        const back = new THREE.Mesh(backGeom, backMat);
        group.add(back);
        const textGeom = new THREE.BoxGeometry(2, 0.5, 0.05);
        const text = new THREE.Mesh(textGeom, neonMat);
        text.position.z = 0.08;
        group.add(text);
        const light = new THREE.PointLight(new THREE.Color(color).getHex(), 0.5, 3);
        light.position.z = 0.5;
        group.add(light);
        return group;
    }

    createNeonTube(color) {
        const group = new THREE.Group();
        const neonMat = new THREE.MeshStandardMaterial({ color: color, emissive: color, emissiveIntensity: 0.8 });
        const tubeGeom = new THREE.CylinderGeometry(0.02, 0.02, 3, 8);
        const tube = new THREE.Mesh(tubeGeom, neonMat);
        group.add(tube);
        const light = new THREE.PointLight(new THREE.Color(color).getHex(), 0.3, 2);
        group.add(light);
        return group;
    }

    createHolographicScreen(color, properties = {}) {
        const group = new THREE.Group();
        const screenMat = new THREE.MeshStandardMaterial({ color: color, emissive: color, emissiveIntensity: 0.5, transparent: true, opacity: 0.7 });
        const screenGeom = new THREE.PlaneGeometry(1.5, 1);
        const screen = new THREE.Mesh(screenGeom, screenMat);
        group.add(screen);
        const frameMat = new THREE.MeshStandardMaterial({ color: '#333333', metalness: 0.8 });
        const frameGeom = new THREE.BoxGeometry(1.6, 1.1, 0.05);
        const frame = new THREE.Mesh(frameGeom, frameMat);
        frame.position.z = -0.03;
        group.add(frame);
        return group;
    }

    createRobotParts(color) {
        const group = new THREE.Group();
        const metalMat = new THREE.MeshStandardMaterial({ color: color, metalness: 0.8 });
        const parts = [
            { geom: new THREE.BoxGeometry(0.3, 0.2, 0.2), pos: [0, 0.1, 0] },
            { geom: new THREE.CylinderGeometry(0.1, 0.1, 0.4, 8), pos: [0.3, 0.1, 0.2] },
            { geom: new THREE.SphereGeometry(0.15, 8, 8), pos: [-0.2, 0.15, 0.3] },
            { geom: new THREE.BoxGeometry(0.4, 0.1, 0.1), pos: [0.1, 0.05, -0.2] }
        ];
        parts.forEach(part => {
            const mesh = new THREE.Mesh(part.geom, metalMat);
            mesh.position.set(...part.pos);
            mesh.rotation.set(Math.random(), Math.random(), Math.random());
            group.add(mesh);
        });
        return group;
    }

    createServerRack(color, properties = {}) {
        const group = new THREE.Group();
        const rackMat = new THREE.MeshStandardMaterial({ color: color });
        const rackGeom = new THREE.BoxGeometry(0.8, 2, 0.5);
        const rack = new THREE.Mesh(rackGeom, rackMat);
        rack.position.y = 1;
        group.add(rack);
        const serverMat = new THREE.MeshStandardMaterial({ color: '#2A2A2A' });
        for (let i = 0; i < 5; i++) {
            const serverGeom = new THREE.BoxGeometry(0.75, 0.3, 0.45);
            const server = new THREE.Mesh(serverGeom, serverMat);
            server.position.set(0, 0.3 + i * 0.35, 0.03);
            group.add(server);
            if (properties.lights) {
                const lightMat = new THREE.MeshStandardMaterial({ color: i % 2 === 0 ? '#00FF00' : '#FF0000', emissive: i % 2 === 0 ? '#00FF00' : '#FF0000', emissiveIntensity: 0.5 });
                const lightGeom = new THREE.CircleGeometry(0.02, 8);
                const light = new THREE.Mesh(lightGeom, lightMat);
                light.position.set(0.3, 0.3 + i * 0.35, 0.26);
                group.add(light);
            }
        }
        return group;
    }

    createDrone(color, properties = {}) {
        const group = new THREE.Group();
        const droneMat = new THREE.MeshStandardMaterial({ color: color });
        const bodyGeom = new THREE.BoxGeometry(0.3, 0.1, 0.3);
        const body = new THREE.Mesh(bodyGeom, droneMat);
        group.add(body);
        const armMat = new THREE.MeshStandardMaterial({ color: '#1A1A1A' });
        [[0.2, 0.2], [0.2, -0.2], [-0.2, 0.2], [-0.2, -0.2]].forEach(([x, z]) => {
            const armGeom = new THREE.CylinderGeometry(0.02, 0.02, 0.15, 8);
            const arm = new THREE.Mesh(armGeom, armMat);
            arm.position.set(x * 0.8, 0, z * 0.8);
            arm.rotation.z = Math.PI / 2;
            group.add(arm);
            const propGeom = new THREE.CircleGeometry(0.1, 16);
            const propMat = new THREE.MeshStandardMaterial({ color: '#666666', side: THREE.DoubleSide });
            const prop = new THREE.Mesh(propGeom, propMat);
            prop.position.set(x * 0.8, 0.08, z * 0.8);
            prop.rotation.x = -Math.PI / 2;
            group.add(prop);
        });
        const eyeGeom = new THREE.SphereGeometry(0.05, 8, 8);
        const eyeMat = new THREE.MeshStandardMaterial({ color: '#FF0000', emissive: '#FF0000', emissiveIntensity: 0.5 });
        const eye = new THREE.Mesh(eyeGeom, eyeMat);
        eye.position.set(0, -0.08, 0.1);
        group.add(eye);
        return group;
    }

    // === MEDIEVAL DECORATIONS ===
    createTorch(color, properties = {}) {
        const group = new THREE.Group();
        const woodMat = new THREE.MeshStandardMaterial({ color: color });
        const handleGeom = new THREE.CylinderGeometry(0.03, 0.04, 0.4, 8);
        const handle = new THREE.Mesh(handleGeom, woodMat);
        group.add(handle);
        const headGeom = new THREE.CylinderGeometry(0.06, 0.04, 0.15, 8);
        const headMat = new THREE.MeshStandardMaterial({ color: '#4A3728' });
        const head = new THREE.Mesh(headGeom, headMat);
        head.position.y = 0.25;
        group.add(head);
        if (properties.fire) {
            const fireMat = new THREE.MeshStandardMaterial({ color: '#FF4500', emissive: '#FF4500', emissiveIntensity: 0.8 });
            const fireGeom = new THREE.ConeGeometry(0.08, 0.2, 8);
            const fire = new THREE.Mesh(fireGeom, fireMat);
            fire.position.y = 0.4;
            group.add(fire);
            const light = new THREE.PointLight(0xFF6600, 0.5, 3);
            light.position.y = 0.4;
            group.add(light);
        }
        return group;
    }

    createArmorStand(color) {
        const group = new THREE.Group();
        const metalMat = new THREE.MeshStandardMaterial({ color: color, metalness: 0.8 });
        const baseMat = new THREE.MeshStandardMaterial({ color: '#4A3728' });
        const baseGeom = new THREE.CylinderGeometry(0.3, 0.35, 0.1, 16);
        const base = new THREE.Mesh(baseGeom, baseMat);
        base.position.y = 0.05;
        group.add(base);
        const poleGeom = new THREE.CylinderGeometry(0.03, 0.03, 1.8, 8);
        const pole = new THREE.Mesh(poleGeom, baseMat);
        pole.position.y = 1;
        group.add(pole);
        const helmetGeom = new THREE.SphereGeometry(0.15, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2);
        const helmet = new THREE.Mesh(helmetGeom, metalMat);
        helmet.position.y = 1.85;
        group.add(helmet);
        const chestGeom = new THREE.BoxGeometry(0.4, 0.5, 0.2);
        const chest = new THREE.Mesh(chestGeom, metalMat);
        chest.position.y = 1.4;
        group.add(chest);
        [-0.25, 0.25].forEach(x => {
            const shoulderGeom = new THREE.SphereGeometry(0.1, 8, 8);
            const shoulder = new THREE.Mesh(shoulderGeom, metalMat);
            shoulder.position.set(x, 1.55, 0);
            group.add(shoulder);
        });
        return group;
    }

    createBarrel(color) {
        const group = new THREE.Group();
        const woodMat = new THREE.MeshStandardMaterial({ color: color });
        const barrelGeom = new THREE.CylinderGeometry(0.3, 0.35, 0.8, 12);
        const barrel = new THREE.Mesh(barrelGeom, woodMat);
        barrel.position.y = 0.4;
        group.add(barrel);
        const bandMat = new THREE.MeshStandardMaterial({ color: '#4A4A4A', metalness: 0.6 });
        [0.15, 0.45, 0.65].forEach(y => {
            const bandGeom = new THREE.TorusGeometry(0.32, 0.02, 8, 24);
            const band = new THREE.Mesh(bandGeom, bandMat);
            band.position.y = y;
            band.rotation.x = Math.PI / 2;
            group.add(band);
        });
        return group;
    }

    createBanner(color, properties = {}) {
        const group = new THREE.Group();
        const fabricMat = new THREE.MeshStandardMaterial({ color: color, side: THREE.DoubleSide });
        const bannerGeom = new THREE.PlaneGeometry(0.8, 1.5);
        const banner = new THREE.Mesh(bannerGeom, fabricMat);
        group.add(banner);
        const poleMat = new THREE.MeshStandardMaterial({ color: '#8B4513' });
        const poleGeom = new THREE.CylinderGeometry(0.02, 0.02, 1.8, 8);
        const pole = new THREE.Mesh(poleGeom, poleMat);
        pole.position.y = 0.9;
        group.add(pole);
        const emblemMat = new THREE.MeshStandardMaterial({ color: '#FFD700' });
        const emblemGeom = new THREE.CircleGeometry(0.2, 16);
        const emblem = new THREE.Mesh(emblemGeom, emblemMat);
        emblem.position.z = 0.01;
        group.add(emblem);
        return group;
    }

    createSwordDisplay(color) {
        const group = new THREE.Group();
        const metalMat = new THREE.MeshStandardMaterial({ color: color, metalness: 0.8 });
        const bladeGeom = new THREE.BoxGeometry(0.05, 1, 0.01);
        const blade = new THREE.Mesh(bladeGeom, metalMat);
        group.add(blade);
        const guardGeom = new THREE.BoxGeometry(0.3, 0.05, 0.05);
        const guardMat = new THREE.MeshStandardMaterial({ color: '#FFD700', metalness: 0.8 });
        const guard = new THREE.Mesh(guardGeom, guardMat);
        guard.position.y = -0.5;
        group.add(guard);
        const handleGeom = new THREE.CylinderGeometry(0.03, 0.03, 0.2, 8);
        const handleMat = new THREE.MeshStandardMaterial({ color: '#4A3728' });
        const handle = new THREE.Mesh(handleGeom, handleMat);
        handle.position.y = -0.65;
        group.add(handle);
        const pommelGeom = new THREE.SphereGeometry(0.04, 8, 8);
        const pommel = new THREE.Mesh(pommelGeom, guardMat);
        pommel.position.y = -0.78;
        group.add(pommel);
        return group;
    }

    createChest(color) {
        const group = new THREE.Group();
        const woodMat = new THREE.MeshStandardMaterial({ color: color });
        const baseGeom = new THREE.BoxGeometry(0.8, 0.5, 0.5);
        const base = new THREE.Mesh(baseGeom, woodMat);
        base.position.y = 0.25;
        group.add(base);
        const lidGeom = new THREE.BoxGeometry(0.85, 0.15, 0.55);
        const lid = new THREE.Mesh(lidGeom, woodMat);
        lid.position.y = 0.575;
        group.add(lid);
        const metalMat = new THREE.MeshStandardMaterial({ color: '#4A4A4A', metalness: 0.6 });
        const lockGeom = new THREE.BoxGeometry(0.1, 0.15, 0.05);
        const lock = new THREE.Mesh(lockGeom, metalMat);
        lock.position.set(0, 0.4, 0.28);
        group.add(lock);
        return group;
    }

    // === COMMON DECORATIONS ===
    createPottedPlant(color) {
        const group = new THREE.Group();
        const potGeom = new THREE.CylinderGeometry(0.2, 0.15, 0.3, 12);
        const potMat = new THREE.MeshStandardMaterial({ color: '#8B4513' });
        const pot = new THREE.Mesh(potGeom, potMat);
        pot.position.y = 0.15;
        group.add(pot);
        const soilGeom = new THREE.CircleGeometry(0.18, 12);
        const soilMat = new THREE.MeshStandardMaterial({ color: '#3D2914' });
        const soil = new THREE.Mesh(soilGeom, soilMat);
        soil.rotation.x = -Math.PI / 2;
        soil.position.y = 0.3;
        group.add(soil);
        const leafMat = new THREE.MeshStandardMaterial({ color: color, side: THREE.DoubleSide });
        for (let i = 0; i < 8; i++) {
            const leafGeom = new THREE.PlaneGeometry(0.15, 0.4);
            const leaf = new THREE.Mesh(leafGeom, leafMat);
            const angle = (i / 8) * Math.PI * 2;
            leaf.position.set(Math.cos(angle) * 0.08, 0.5, Math.sin(angle) * 0.08);
            leaf.rotation.y = angle;
            leaf.rotation.x = -0.3;
            group.add(leaf);
        }
        return group;
    }

    createFloorLamp(color) {
        const group = new THREE.Group();
        const baseGeom = new THREE.CylinderGeometry(0.2, 0.25, 0.05, 16);
        const baseMat = new THREE.MeshStandardMaterial({ color: '#1A1A1A' });
        const base = new THREE.Mesh(baseGeom, baseMat);
        base.position.y = 0.025;
        group.add(base);
        const poleGeom = new THREE.CylinderGeometry(0.02, 0.02, 1.5, 8);
        const poleMat = new THREE.MeshStandardMaterial({ color: '#C0C0C0', metalness: 0.8 });
        const pole = new THREE.Mesh(poleGeom, poleMat);
        pole.position.y = 0.8;
        group.add(pole);
        const shadeGeom = new THREE.CylinderGeometry(0.25, 0.35, 0.3, 16, 1, true);
        const shadeMat = new THREE.MeshStandardMaterial({ color: color, side: THREE.DoubleSide, emissive: color, emissiveIntensity: 0.2 });
        const shade = new THREE.Mesh(shadeGeom, shadeMat);
        shade.position.y = 1.6;
        group.add(shade);
        const light = new THREE.PointLight(0xFFFFAA, 0.5, 4);
        light.position.y = 1.5;
        group.add(light);
        return group;
    }

    // Video seslerini aç (kullanıcı interaction sonrası)
    enableAudio() {
        if (this.audioEnabled) return; // Zaten açıksa tekrar açma

        this.videoElements.forEach(video => {
            video.muted = false;
            video.volume = 0.5; // %50 ses seviyesi
        });

        this.audioEnabled = true;
        console.log(`${this.videoElements.length} video için ses açıldı`);
    }
}
