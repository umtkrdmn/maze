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

        // Drag-and-drop properties
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.draggableObjects = [];  // Meshes that can be dragged
        this.decorationDataMap = new Map();  // Map mesh to decoration data
        this.selectedObject = null;
        this.isDragging = false;
        this.dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);  // Horizontal plane
        this.dragOffset = new THREE.Vector3();
        this.onDecorationMoved = null;  // Callback when decoration is moved

        // FPS-style camera controls
        this.moveSpeed = 0.08;
        this.lookSpeed = 0.002;
        this.keys = { w: false, a: false, s: false, d: false };
        this.yaw = 0;    // Horizontal rotation (left-right)
        this.pitch = 0;  // Vertical rotation (up-down)
        this.isLooking = false;  // True when right mouse button is held
        this.lastMouseX = 0;
        this.lastMouseY = 0;

        this.init();
    }

    init() {
        // Create scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x000000);

        // Get canvas dimensions, use defaults if canvas is not visible yet
        const width = this.canvas.clientWidth || 800;
        const height = this.canvas.clientHeight || 600;

        // Create camera
        this.camera = new THREE.PerspectiveCamera(
            75,
            width / height,
            0.1,
            1000
        );
        // Position camera inside the room at eye level
        this.camera.position.set(0, 1.7, 0);
        this.camera.lookAt(0, 1.7, -5);

        // Create renderer
        this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true });
        this.renderer.setSize(width, height);
        this.renderer.shadowMap.enabled = true;

        // Add lights
        this.addLights();

        // Handle window resize
        window.addEventListener('resize', () => this.onResize());

        // Keyboard controls for movement (WASD)
        window.addEventListener('keydown', (e) => this.onKeyDown(e));
        window.addEventListener('keyup', (e) => this.onKeyUp(e));

        // Mouse controls - left click for dragging, right click for looking
        this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
        this.canvas.addEventListener('mouseup', (e) => this.onMouseUp(e));
        this.canvas.addEventListener('mouseleave', (e) => this.onMouseUp(e));
        this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());  // Disable right-click menu

        // Touch support
        this.canvas.addEventListener('touchstart', (e) => this.onTouchStart(e));
        this.canvas.addEventListener('touchmove', (e) => this.onTouchMove(e));
        this.canvas.addEventListener('touchend', (e) => this.onTouchEnd(e));

        // Start animation loop
        this.animate();
    }

    // Public method to force resize update (call after modal becomes visible)
    forceResize() {
        // Get the parent container dimensions
        const parent = this.canvas.parentElement;
        if (parent) {
            const rect = parent.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0) {
                // Set canvas size to match parent
                this.canvas.style.width = rect.width + 'px';
                this.canvas.style.height = rect.height + 'px';

                // Update renderer and camera
                this.renderer.setSize(rect.width, rect.height);
                this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
                this.camera.aspect = rect.width / rect.height;
                this.camera.updateProjectionMatrix();
                return;
            }
        }
        // Fallback to standard resize
        this.onResize();
    }

    addLights() {
        // Strong ambient light for overall visibility
        const ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
        this.scene.add(ambientLight);

        // Directional light from above
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(0, 10, 0);
        directionalLight.castShadow = true;
        this.scene.add(directionalLight);

        // Central point light (ceiling)
        const ceilingLight = new THREE.PointLight(0xffffff, 0.8);
        ceilingLight.position.set(0, this.wallHeight - 0.5, 0);
        this.scene.add(ceilingLight);

        // Additional point lights in corners for even illumination
        const cornerPositions = [
            [-3, 3, -3],
            [3, 3, -3],
            [-3, 3, 3],
            [3, 3, 3]
        ];
        cornerPositions.forEach(pos => {
            const light = new THREE.PointLight(0xffffff, 0.3);
            light.position.set(...pos);
            this.scene.add(light);
        });
    }

    onResize() {
        // Try to get dimensions from parent first
        const parent = this.canvas.parentElement;
        let width, height;

        if (parent) {
            const rect = parent.getBoundingClientRect();
            width = rect.width || this.canvas.clientWidth;
            height = rect.height || this.canvas.clientHeight;
        } else {
            width = this.canvas.clientWidth;
            height = this.canvas.clientHeight;
        }

        if (!width || !height) return;

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
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

        // Clear drag-and-drop data
        this.draggableObjects = [];
        this.decorationDataMap.clear();
        this.selectedObject = null;
        this.isDragging = false;
    }

    renderRoom(roomData, design = {}) {
        this.clearRoom();

        // Reset camera to center of room
        this.camera.position.set(0, 1.7, 0);
        this.yaw = 0;
        this.pitch = 0;
        this.updateCameraRotation();

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

        // Add decorations if provided (async loading)
        const decorations = design.extra_features?.decorations || [];
        decorations.forEach(deco => {
            this.createDecoration(deco);
        });
    }

    async createDecoration(deco) {
        const { type, position, scale, color, properties } = deco;
        let mesh = null;

        // Try to load 3D model first
        if (typeof modelLoader !== 'undefined' && modelLoader.hasModel(type)) {
            try {
                mesh = await modelLoader.loadModel(type);
                if (mesh) {
                    // GLTF modelleri kendi renklerine sahip, tint uygulanmaz
                    // Position and scale
                    mesh.position.set(position[0], position[1], position[2]);
                    mesh.scale.multiply(new THREE.Vector3(scale[0], scale[1], scale[2]));
                    this.scene.add(mesh);
                    this.currentRoomMeshes.push(mesh);

                    // Make decoration draggable
                    mesh.userData.isDraggable = true;
                    mesh.userData.decorationData = deco;
                    this.draggableObjects.push(mesh);
                    this.decorationDataMap.set(mesh, deco);
                    return;
                }
            } catch (error) {
                console.warn(`Failed to load model for ${type}, falling back to primitive:`, error);
            }
        }

        // Fallback to primitive geometry
        switch (type) {
            // === CHRISTMAS DECORATIONS ===
            case 'christmas_tree':
                mesh = this.createChristmasTree(color, properties);
                break;
            case 'gift_box':
                mesh = this.createGiftBox(color, properties);
                break;
            case 'snowman':
                mesh = this.createSnowman(color);
                break;
            case 'candy_cane':
                mesh = this.createCandyCane(color);
                break;
            case 'string_lights':
                mesh = this.createStringLights(properties);
                break;

            // === HALLOWEEN DECORATIONS ===
            case 'pumpkin':
                mesh = this.createPumpkin(color, properties);
                break;
            case 'bat':
                mesh = this.createBat(color);
                break;
            case 'spider_web':
                mesh = this.createSpiderWeb(color);
                break;
            case 'cauldron':
                mesh = this.createCauldron(color, properties);
                break;

            // === OFFICE DECORATIONS ===
            case 'desk':
                mesh = this.createDesk(color);
                break;
            case 'office_chair':
                mesh = this.createOfficeChair(color);
                break;
            case 'desk_lamp':
                mesh = this.createDeskLamp(color);
                break;
            case 'water_cooler':
                mesh = this.createWaterCooler(color);
                break;
            case 'clock':
                mesh = this.createClock(color);
                break;

            // === OLD SALON DECORATIONS ===
            case 'fireplace':
                mesh = this.createFireplace(color, properties);
                break;
            case 'chandelier':
                mesh = this.createChandelier(color, properties);
                break;
            case 'grandfather_clock':
                mesh = this.createGrandfatherClock(color);
                break;
            case 'armchair':
                mesh = this.createArmchair(color, properties);
                break;
            case 'candelabra':
                mesh = this.createCandelabra(color, properties);
                break;

            // === SPACESHIP DECORATIONS ===
            case 'control_panel':
                mesh = this.createControlPanel(color, properties);
                break;
            case 'hologram':
                mesh = this.createHologram(color, properties);
                break;
            case 'light_tube':
                mesh = this.createLightTube(color);
                break;
            case 'cryopod':
                mesh = this.createCryopod(color, properties);
                break;
            case 'robot':
                mesh = this.createRobot(color);
                break;

            // === UNDERWATER DECORATIONS ===
            case 'coral':
                mesh = this.createCoral(color);
                break;
            case 'seashell':
                mesh = this.createSeashell(color);
                break;
            case 'starfish':
                mesh = this.createStarfish(color);
                break;
            case 'bubbles':
                mesh = this.createBubbles(color, properties);
                break;
            case 'fish':
                mesh = this.createFish(color, properties);
                break;
            case 'treasure_chest':
                mesh = this.createTreasureChest(color, properties);
                break;

            // === FOREST DECORATIONS ===
            case 'tree_stump':
                mesh = this.createTreeStump(color);
                break;
            case 'mushroom':
                mesh = this.createMushroom(color, properties);
                break;
            case 'fern':
                mesh = this.createFern(color);
                break;
            case 'rock':
                mesh = this.createRock(color);
                break;
            case 'fireflies':
                mesh = this.createFireflies(color, properties);
                break;
            case 'bird':
                mesh = this.createBird(color);
                break;

            // === DESERT DECORATIONS ===
            case 'cactus':
                mesh = this.createCactus(color);
                break;
            case 'sand_dune':
                mesh = this.createSandDune(color);
                break;
            case 'skull':
                mesh = this.createSkull(color);
                break;
            case 'tumbleweed':
                mesh = this.createTumbleweed(color);
                break;
            case 'pottery':
                mesh = this.createPottery(color);
                break;
            case 'sun':
                mesh = this.createSun(color, properties);
                break;

            // === CYBERPUNK DECORATIONS ===
            case 'neon_sign':
                mesh = this.createNeonSign(color, properties);
                break;
            case 'neon_tube':
                mesh = this.createNeonTube(color);
                break;
            case 'holographic_screen':
                mesh = this.createHolographicScreen(color, properties);
                break;
            case 'robot_parts':
                mesh = this.createRobotParts(color);
                break;
            case 'server_rack':
                mesh = this.createServerRack(color, properties);
                break;
            case 'drone':
                mesh = this.createDrone(color, properties);
                break;

            // === MEDIEVAL DECORATIONS ===
            case 'torch':
                mesh = this.createTorch(color, properties);
                break;
            case 'armor_stand':
                mesh = this.createArmorStand(color);
                break;
            case 'barrel':
                mesh = this.createBarrel(color);
                break;
            case 'banner':
                mesh = this.createBanner(color, properties);
                break;
            case 'sword_display':
                mesh = this.createSwordDisplay(color);
                break;
            case 'chest':
                mesh = this.createChest(color);
                break;

            // === COMMON DECORATIONS ===
            case 'potted_plant':
                mesh = this.createPottedPlant(color);
                break;
            case 'floor_lamp':
                mesh = this.createFloorLamp(color);
                break;

            default:
                console.warn('Unknown decoration type:', type);
                return;
        }

        if (mesh) {
            mesh.position.set(position[0], position[1], position[2]);
            mesh.scale.set(scale[0], scale[1], scale[2]);
            this.scene.add(mesh);
            this.currentRoomMeshes.push(mesh);

            // Make decoration draggable
            mesh.userData.isDraggable = true;
            mesh.userData.decorationData = deco;
            this.draggableObjects.push(mesh);
            this.decorationDataMap.set(mesh, deco);
        }
    }

    // === CHRISTMAS DECORATIONS ===
    createChristmasTree(color, properties = {}) {
        const group = new THREE.Group();

        // Tree cone layers
        const treeColors = [color, '#008000', '#006400'];
        for (let i = 0; i < 3; i++) {
            const coneGeom = new THREE.ConeGeometry(0.8 - i * 0.2, 1.2 - i * 0.2, 8);
            const coneMat = new THREE.MeshStandardMaterial({ color: treeColors[i % 3] });
            const cone = new THREE.Mesh(coneGeom, coneMat);
            cone.position.y = 0.8 + i * 0.7;
            group.add(cone);
        }

        // Trunk
        const trunkGeom = new THREE.CylinderGeometry(0.15, 0.2, 0.5, 8);
        const trunkMat = new THREE.MeshStandardMaterial({ color: '#8B4513' });
        const trunk = new THREE.Mesh(trunkGeom, trunkMat);
        trunk.position.y = 0.25;
        group.add(trunk);

        // Star on top
        if (properties.star_color) {
            const starGeom = new THREE.OctahedronGeometry(0.15, 0);
            const starMat = new THREE.MeshStandardMaterial({
                color: properties.star_color,
                emissive: properties.star_color,
                emissiveIntensity: 0.5
            });
            const star = new THREE.Mesh(starGeom, starMat);
            star.position.y = 2.8;
            group.add(star);
        }

        // Decorative lights/balls
        if (properties.lights) {
            const ballColors = ['#FF0000', '#FFD700', '#0000FF', '#FF00FF'];
            for (let i = 0; i < 12; i++) {
                const ballGeom = new THREE.SphereGeometry(0.08, 8, 8);
                const ballMat = new THREE.MeshStandardMaterial({
                    color: ballColors[i % 4],
                    emissive: ballColors[i % 4],
                    emissiveIntensity: 0.3
                });
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

        // Box
        const boxGeom = new THREE.BoxGeometry(0.8, 0.8, 0.8);
        const boxMat = new THREE.MeshStandardMaterial({ color: color });
        const box = new THREE.Mesh(boxGeom, boxMat);
        box.position.y = 0.4;
        group.add(box);

        // Ribbon
        const ribbonColor = properties.ribbon_color || '#FFD700';
        const ribbonMat = new THREE.MeshStandardMaterial({ color: ribbonColor });

        const ribbonH = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.1, 0.15), ribbonMat);
        ribbonH.position.y = 0.8;
        group.add(ribbonH);

        const ribbonV = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.1, 0.85), ribbonMat);
        ribbonV.position.y = 0.8;
        group.add(ribbonV);

        // Bow
        const bowGeom = new THREE.SphereGeometry(0.15, 8, 8);
        const bow = new THREE.Mesh(bowGeom, ribbonMat);
        bow.position.y = 0.95;
        group.add(bow);

        return group;
    }

    createSnowman(color) {
        const group = new THREE.Group();
        const snowMat = new THREE.MeshStandardMaterial({ color: color });

        // Body spheres
        const sizes = [0.5, 0.35, 0.25];
        let y = 0;
        sizes.forEach((size, i) => {
            const sphere = new THREE.Mesh(new THREE.SphereGeometry(size, 16, 16), snowMat);
            y += size;
            sphere.position.y = y;
            y += size * 0.8;
            group.add(sphere);
        });

        // Eyes
        const eyeMat = new THREE.MeshStandardMaterial({ color: '#000000' });
        [-0.08, 0.08].forEach(x => {
            const eye = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 8), eyeMat);
            eye.position.set(x, 1.65, 0.2);
            group.add(eye);
        });

        // Nose (carrot)
        const noseGeom = new THREE.ConeGeometry(0.04, 0.2, 8);
        const noseMat = new THREE.MeshStandardMaterial({ color: '#FF6600' });
        const nose = new THREE.Mesh(noseGeom, noseMat);
        nose.position.set(0, 1.55, 0.25);
        nose.rotation.x = Math.PI / 2;
        group.add(nose);

        // Hat
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

        // Straight part
        const straightGeom = new THREE.CylinderGeometry(0.1, 0.1, 1.5, 8);
        const candyMat = new THREE.MeshStandardMaterial({ color: color });
        const straight = new THREE.Mesh(straightGeom, candyMat);
        straight.position.y = 0.75;
        group.add(straight);

        // Curved part (simple representation)
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

        // Create lights around the room perimeter
        const radius = 4.5;
        const numLights = 24;
        for (let i = 0; i < numLights; i++) {
            const angle = (i / numLights) * Math.PI * 2;
            const bulbGeom = new THREE.SphereGeometry(0.08, 8, 8);
            const bulbMat = new THREE.MeshStandardMaterial({
                color: colors[i % colors.length],
                emissive: colors[i % colors.length],
                emissiveIntensity: 0.5
            });
            const bulb = new THREE.Mesh(bulbGeom, bulbMat);
            bulb.position.set(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
            group.add(bulb);
        }

        return group;
    }

    // === HALLOWEEN DECORATIONS ===
    createPumpkin(color, properties = {}) {
        const group = new THREE.Group();

        // Main pumpkin body
        const pumpkinGeom = new THREE.SphereGeometry(0.5, 16, 16);
        const pumpkinMat = new THREE.MeshStandardMaterial({
            color: color,
            emissive: properties.glowing ? '#FF6600' : '#000000',
            emissiveIntensity: properties.glowing ? 0.3 : 0
        });
        const pumpkin = new THREE.Mesh(pumpkinGeom, pumpkinMat);
        pumpkin.scale.set(1, 0.8, 1);
        pumpkin.position.y = 0.4;
        group.add(pumpkin);

        // Stem
        const stemGeom = new THREE.CylinderGeometry(0.05, 0.08, 0.2, 8);
        const stemMat = new THREE.MeshStandardMaterial({ color: '#228B22' });
        const stem = new THREE.Mesh(stemGeom, stemMat);
        stem.position.y = 0.85;
        group.add(stem);

        // Face (carved eyes and mouth)
        if (properties.glowing) {
            const eyeMat = new THREE.MeshStandardMaterial({
                color: '#FFD700',
                emissive: '#FFD700',
                emissiveIntensity: 0.8
            });

            // Eyes (triangular)
            [-0.15, 0.15].forEach(x => {
                const eyeGeom = new THREE.ConeGeometry(0.08, 0.1, 3);
                const eye = new THREE.Mesh(eyeGeom, eyeMat);
                eye.position.set(x, 0.5, 0.45);
                eye.rotation.x = Math.PI;
                group.add(eye);
            });

            // Mouth
            const mouthGeom = new THREE.BoxGeometry(0.25, 0.08, 0.1);
            const mouth = new THREE.Mesh(mouthGeom, eyeMat);
            mouth.position.set(0, 0.3, 0.45);
            group.add(mouth);
        }

        return group;
    }

    createBat(color) {
        const group = new THREE.Group();

        // Body
        const bodyGeom = new THREE.SphereGeometry(0.15, 8, 8);
        const batMat = new THREE.MeshStandardMaterial({ color: color });
        const body = new THREE.Mesh(bodyGeom, batMat);
        body.scale.set(1, 0.8, 0.6);
        group.add(body);

        // Wings
        const wingGeom = new THREE.PlaneGeometry(0.4, 0.3);
        const wingMat = new THREE.MeshStandardMaterial({ color: color, side: THREE.DoubleSide });
        [-0.25, 0.25].forEach((x, i) => {
            const wing = new THREE.Mesh(wingGeom, wingMat);
            wing.position.set(x, 0, 0);
            wing.rotation.y = i === 0 ? -0.3 : 0.3;
            group.add(wing);
        });

        // Eyes
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

        // Create web using lines
        const webMat = new THREE.LineBasicMaterial({ color: color, transparent: true, opacity: 0.6 });

        // Radial lines
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            const points = [
                new THREE.Vector3(0, 0, 0),
                new THREE.Vector3(Math.cos(angle), Math.sin(angle), 0)
            ];
            const lineGeom = new THREE.BufferGeometry().setFromPoints(points);
            const line = new THREE.Line(lineGeom, webMat);
            group.add(line);
        }

        // Spiral rings
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

        // Cauldron body
        const cauldronGeom = new THREE.SphereGeometry(0.5, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2);
        const cauldronMat = new THREE.MeshStandardMaterial({ color: color, metalness: 0.5 });
        const cauldron = new THREE.Mesh(cauldronGeom, cauldronMat);
        cauldron.rotation.x = Math.PI;
        cauldron.position.y = 0.5;
        group.add(cauldron);

        // Rim
        const rimGeom = new THREE.TorusGeometry(0.5, 0.05, 8, 32);
        const rim = new THREE.Mesh(rimGeom, cauldronMat);
        rim.position.y = 0.5;
        rim.rotation.x = Math.PI / 2;
        group.add(rim);

        // Bubbling liquid
        if (properties.bubbling) {
            const liquidGeom = new THREE.CircleGeometry(0.45, 16);
            const liquidMat = new THREE.MeshStandardMaterial({
                color: properties.smoke_color || '#00FF00',
                emissive: properties.smoke_color || '#00FF00',
                emissiveIntensity: 0.5
            });
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

        // Desktop
        const topGeom = new THREE.BoxGeometry(2, 0.1, 1);
        const top = new THREE.Mesh(topGeom, deskMat);
        top.position.y = 0.75;
        group.add(top);

        // Legs
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

        // Seat
        const seatGeom = new THREE.BoxGeometry(0.5, 0.1, 0.5);
        const seat = new THREE.Mesh(seatGeom, chairMat);
        seat.position.y = 0.5;
        group.add(seat);

        // Back
        const backGeom = new THREE.BoxGeometry(0.5, 0.6, 0.1);
        const back = new THREE.Mesh(backGeom, chairMat);
        back.position.set(0, 0.85, -0.2);
        group.add(back);

        // Base
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

        // Base
        const baseGeom = new THREE.CylinderGeometry(0.15, 0.15, 0.05, 16);
        const base = new THREE.Mesh(baseGeom, metalMat);
        base.position.y = 0.025;
        group.add(base);

        // Arm
        const armGeom = new THREE.CylinderGeometry(0.02, 0.02, 0.5, 8);
        const arm = new THREE.Mesh(armGeom, metalMat);
        arm.position.set(0, 0.3, 0);
        arm.rotation.z = 0.3;
        group.add(arm);

        // Head
        const headGeom = new THREE.ConeGeometry(0.15, 0.2, 16);
        const head = new THREE.Mesh(headGeom, metalMat);
        head.position.set(0.15, 0.55, 0);
        head.rotation.z = -Math.PI / 2;
        group.add(head);

        // Light
        const light = new THREE.PointLight(0xFFFFAA, 0.5, 2);
        light.position.set(0.25, 0.5, 0);
        group.add(light);

        return group;
    }

    createWaterCooler(color) {
        const group = new THREE.Group();

        // Body
        const bodyGeom = new THREE.BoxGeometry(0.4, 1.2, 0.4);
        const bodyMat = new THREE.MeshStandardMaterial({ color: '#FFFFFF' });
        const body = new THREE.Mesh(bodyGeom, bodyMat);
        body.position.y = 0.6;
        group.add(body);

        // Water bottle
        const bottleGeom = new THREE.CylinderGeometry(0.15, 0.15, 0.5, 16);
        const bottleMat = new THREE.MeshStandardMaterial({ color: color, transparent: true, opacity: 0.6 });
        const bottle = new THREE.Mesh(bottleGeom, bottleMat);
        bottle.position.y = 1.45;
        group.add(bottle);

        return group;
    }

    createClock(color) {
        const group = new THREE.Group();

        // Face
        const faceGeom = new THREE.CircleGeometry(0.4, 32);
        const faceMat = new THREE.MeshStandardMaterial({ color: color });
        const face = new THREE.Mesh(faceGeom, faceMat);
        group.add(face);

        // Frame
        const frameGeom = new THREE.RingGeometry(0.38, 0.42, 32);
        const frameMat = new THREE.MeshStandardMaterial({ color: '#1A1A1A' });
        const frame = new THREE.Mesh(frameGeom, frameMat);
        frame.position.z = 0.01;
        group.add(frame);

        // Hands
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

        // Frame
        const frameGeom = new THREE.BoxGeometry(2, 1.5, 0.3);
        const frame = new THREE.Mesh(frameGeom, brickMat);
        frame.position.y = 0.75;
        group.add(frame);

        // Opening
        const openingGeom = new THREE.BoxGeometry(1.2, 1, 0.35);
        const openingMat = new THREE.MeshStandardMaterial({ color: '#1A1A1A' });
        const opening = new THREE.Mesh(openingGeom, openingMat);
        opening.position.set(0, 0.5, 0.05);
        group.add(opening);

        // Mantle
        const mantleGeom = new THREE.BoxGeometry(2.2, 0.1, 0.4);
        const mantle = new THREE.Mesh(mantleGeom, brickMat);
        mantle.position.y = 1.55;
        group.add(mantle);

        // Fire
        if (properties.fire) {
            const fireLight = new THREE.PointLight(0xFF6600, 0.8, 3);
            fireLight.position.set(0, 0.5, 0.3);
            group.add(fireLight);

            // Fire visual
            const fireGeom = new THREE.ConeGeometry(0.3, 0.6, 8);
            const fireMat = new THREE.MeshStandardMaterial({
                color: '#FF4500',
                emissive: '#FF4500',
                emissiveIntensity: 0.8
            });
            const fire = new THREE.Mesh(fireGeom, fireMat);
            fire.position.set(0, 0.3, 0.2);
            group.add(fire);
        }

        return group;
    }

    createChandelier(color, properties = {}) {
        const group = new THREE.Group();
        const metalMat = new THREE.MeshStandardMaterial({ color: color, metalness: 0.8 });

        // Central piece
        const centralGeom = new THREE.CylinderGeometry(0.1, 0.15, 0.3, 8);
        const central = new THREE.Mesh(centralGeom, metalMat);
        group.add(central);

        // Arms and candles
        const numCandles = properties.candles || 6;
        for (let i = 0; i < numCandles; i++) {
            const angle = (i / numCandles) * Math.PI * 2;
            const radius = 0.4;

            // Arm
            const armGeom = new THREE.CylinderGeometry(0.02, 0.02, radius * 2, 8);
            const arm = new THREE.Mesh(armGeom, metalMat);
            arm.position.set(Math.cos(angle) * radius / 2, -0.1, Math.sin(angle) * radius / 2);
            arm.rotation.z = Math.PI / 2;
            arm.rotation.y = angle;
            group.add(arm);

            // Candle holder
            const holderGeom = new THREE.CylinderGeometry(0.04, 0.05, 0.1, 8);
            const holder = new THREE.Mesh(holderGeom, metalMat);
            holder.position.set(Math.cos(angle) * radius, -0.2, Math.sin(angle) * radius);
            group.add(holder);

            // Flame
            const flameGeom = new THREE.SphereGeometry(0.04, 8, 8);
            const flameMat = new THREE.MeshStandardMaterial({
                color: '#FFD700',
                emissive: '#FFD700',
                emissiveIntensity: 0.8
            });
            const flame = new THREE.Mesh(flameGeom, flameMat);
            flame.position.set(Math.cos(angle) * radius, -0.1, Math.sin(angle) * radius);
            group.add(flame);
        }

        // Light source
        const light = new THREE.PointLight(0xFFD700, 0.6, 5);
        light.position.y = -0.2;
        group.add(light);

        return group;
    }

    createGrandfatherClock(color) {
        const group = new THREE.Group();
        const woodMat = new THREE.MeshStandardMaterial({ color: color });

        // Body
        const bodyGeom = new THREE.BoxGeometry(0.6, 2.2, 0.4);
        const body = new THREE.Mesh(bodyGeom, woodMat);
        body.position.y = 1.1;
        group.add(body);

        // Top crown
        const crownGeom = new THREE.BoxGeometry(0.7, 0.2, 0.45);
        const crown = new THREE.Mesh(crownGeom, woodMat);
        crown.position.y = 2.3;
        group.add(crown);

        // Clock face
        const faceGeom = new THREE.CircleGeometry(0.2, 32);
        const faceMat = new THREE.MeshStandardMaterial({ color: '#FFFFF0' });
        const face = new THREE.Mesh(faceGeom, faceMat);
        face.position.set(0, 1.8, 0.21);
        group.add(face);

        // Pendulum window
        const windowGeom = new THREE.PlaneGeometry(0.3, 0.5);
        const windowMat = new THREE.MeshStandardMaterial({ color: '#000000', transparent: true, opacity: 0.5 });
        const window = new THREE.Mesh(windowGeom, windowMat);
        window.position.set(0, 1, 0.21);
        group.add(window);

        return group;
    }

    createArmchair(color, properties = {}) {
        const group = new THREE.Group();
        const fabricMat = new THREE.MeshStandardMaterial({ color: color });

        // Seat
        const seatGeom = new THREE.BoxGeometry(0.8, 0.2, 0.8);
        const seat = new THREE.Mesh(seatGeom, fabricMat);
        seat.position.y = 0.4;
        group.add(seat);

        // Back
        const backGeom = new THREE.BoxGeometry(0.8, 0.8, 0.15);
        const back = new THREE.Mesh(backGeom, fabricMat);
        back.position.set(0, 0.9, -0.35);
        group.add(back);

        // Arms
        [0.45, -0.45].forEach(x => {
            const armGeom = new THREE.BoxGeometry(0.15, 0.3, 0.8);
            const arm = new THREE.Mesh(armGeom, fabricMat);
            arm.position.set(x, 0.65, 0);
            group.add(arm);
        });

        // Rotate if specified
        if (properties.rotation_y) {
            group.rotation.y = properties.rotation_y;
        }

        return group;
    }

    createCandelabra(color, properties = {}) {
        const group = new THREE.Group();
        const metalMat = new THREE.MeshStandardMaterial({ color: color, metalness: 0.8 });

        // Base
        const baseGeom = new THREE.CylinderGeometry(0.1, 0.15, 0.05, 16);
        const base = new THREE.Mesh(baseGeom, metalMat);
        group.add(base);

        // Stem
        const stemGeom = new THREE.CylinderGeometry(0.02, 0.02, 0.4, 8);
        const stem = new THREE.Mesh(stemGeom, metalMat);
        stem.position.y = 0.22;
        group.add(stem);

        // Candle holders and flames
        const positions = [[0, 0], [-0.1, 0], [0.1, 0]];
        positions.forEach(([x, z], i) => {
            const holderGeom = new THREE.CylinderGeometry(0.03, 0.03, 0.05, 8);
            const holder = new THREE.Mesh(holderGeom, metalMat);
            holder.position.set(x, 0.45 + i * 0.05, z);
            group.add(holder);

            if (properties.lit) {
                const flameGeom = new THREE.ConeGeometry(0.02, 0.06, 8);
                const flameMat = new THREE.MeshStandardMaterial({
                    color: '#FF6600',
                    emissive: '#FF6600',
                    emissiveIntensity: 0.8
                });
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

        // Panel base
        const baseGeom = new THREE.BoxGeometry(3, 1.2, 0.3);
        const base = new THREE.Mesh(baseGeom, panelMat);
        base.position.y = 0.6;
        group.add(base);

        // Screens
        const screenMat = new THREE.MeshStandardMaterial({
            color: properties.screen_color || '#00FFFF',
            emissive: properties.screen_color || '#00FFFF',
            emissiveIntensity: 0.5
        });

        for (let i = -1; i <= 1; i++) {
            const screenGeom = new THREE.PlaneGeometry(0.8, 0.6);
            const screen = new THREE.Mesh(screenGeom, screenMat);
            screen.position.set(i * 0.9, 0.8, 0.16);
            group.add(screen);
        }

        // Buttons
        const buttonMat = new THREE.MeshStandardMaterial({
            color: '#FF0000',
            emissive: '#FF0000',
            emissiveIntensity: properties.blinking ? 0.5 : 0.2
        });

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
        const holoMat = new THREE.MeshStandardMaterial({
            color: color,
            emissive: color,
            emissiveIntensity: 0.5,
            transparent: true,
            opacity: 0.6
        });

        // Base projector
        const projGeom = new THREE.CylinderGeometry(0.3, 0.4, 0.1, 16);
        const projMat = new THREE.MeshStandardMaterial({ color: '#1A1A1A', metalness: 0.8 });
        const proj = new THREE.Mesh(projGeom, projMat);
        group.add(proj);

        // Hologram shape
        let holoGeom;
        if (properties.shape === 'globe') {
            holoGeom = new THREE.SphereGeometry(0.4, 16, 16);
        } else {
            holoGeom = new THREE.IcosahedronGeometry(0.4, 0);
        }

        const holo = new THREE.Mesh(holoGeom, holoMat);
        holo.position.y = 0.6;
        group.add(holo);

        // Light beam
        const beamGeom = new THREE.ConeGeometry(0.1, 0.5, 16);
        const beamMat = new THREE.MeshStandardMaterial({
            color: color,
            transparent: true,
            opacity: 0.3
        });
        const beam = new THREE.Mesh(beamGeom, beamMat);
        beam.position.y = 0.25;
        group.add(beam);

        return group;
    }

    createLightTube(color) {
        const group = new THREE.Group();

        const tubeGeom = new THREE.CylinderGeometry(0.05, 0.05, 3, 8);
        const tubeMat = new THREE.MeshStandardMaterial({
            color: color,
            emissive: color,
            emissiveIntensity: 0.8
        });
        const tube = new THREE.Mesh(tubeGeom, tubeMat);
        group.add(tube);

        // Light
        const light = new THREE.PointLight(new THREE.Color(color).getHex(), 0.5, 3);
        group.add(light);

        return group;
    }

    createCryopod(color, properties = {}) {
        const group = new THREE.Group();

        // Pod body
        const podGeom = new THREE.CapsuleGeometry(0.4, 1.2, 8, 16);
        const podMat = new THREE.MeshStandardMaterial({
            color: color,
            transparent: true,
            opacity: 0.6,
            metalness: 0.5
        });
        const pod = new THREE.Mesh(podGeom, podMat);
        pod.position.y = 1;
        group.add(pod);

        // Base
        const baseGeom = new THREE.CylinderGeometry(0.5, 0.6, 0.2, 16);
        const baseMat = new THREE.MeshStandardMaterial({ color: '#1A1A1A', metalness: 0.8 });
        const base = new THREE.Mesh(baseGeom, baseMat);
        base.position.y = 0.1;
        group.add(base);

        // Frost effect
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

        // Head
        const headGeom = new THREE.BoxGeometry(0.4, 0.3, 0.3);
        const head = new THREE.Mesh(headGeom, metalMat);
        head.position.y = 1.4;
        group.add(head);

        // Eyes
        const eyeMat = new THREE.MeshStandardMaterial({
            color: '#00FF00',
            emissive: '#00FF00',
            emissiveIntensity: 0.5
        });
        [-0.1, 0.1].forEach(x => {
            const eye = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), eyeMat);
            eye.position.set(x, 1.45, 0.16);
            group.add(eye);
        });

        // Body
        const bodyGeom = new THREE.BoxGeometry(0.5, 0.6, 0.35);
        const body = new THREE.Mesh(bodyGeom, metalMat);
        body.position.y = 1;
        group.add(body);

        // Legs
        [-0.15, 0.15].forEach(x => {
            const legGeom = new THREE.BoxGeometry(0.15, 0.7, 0.15);
            const leg = new THREE.Mesh(legGeom, metalMat);
            leg.position.set(x, 0.35, 0);
            group.add(leg);
        });

        // Arms
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

        // Create multiple coral branches
        for (let i = 0; i < 5; i++) {
            const branchGeom = new THREE.CylinderGeometry(0.02, 0.08, 0.5 + Math.random() * 0.5, 8);
            const branch = new THREE.Mesh(branchGeom, coralMat);
            branch.position.set(
                (Math.random() - 0.5) * 0.4,
                (0.25 + Math.random() * 0.25),
                (Math.random() - 0.5) * 0.4
            );
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

        // Central disc
        const centerGeom = new THREE.CylinderGeometry(0.15, 0.15, 0.05, 16);
        const center = new THREE.Mesh(centerGeom, starMat);
        center.rotation.x = Math.PI / 2;
        group.add(center);

        // Arms
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
        const bubbleMat = new THREE.MeshStandardMaterial({
            color: color,
            transparent: true,
            opacity: 0.4
        });

        const numBubbles = 15;
        for (let i = 0; i < numBubbles; i++) {
            const size = 0.05 + Math.random() * 0.1;
            const bubbleGeom = new THREE.SphereGeometry(size, 8, 8);
            const bubble = new THREE.Mesh(bubbleGeom, bubbleMat);
            bubble.position.set(
                (Math.random() - 0.5) * 4,
                Math.random() * 3,
                (Math.random() - 0.5) * 4
            );
            group.add(bubble);
        }

        return group;
    }

    createFish(color, properties = {}) {
        const group = new THREE.Group();
        const fishMat = new THREE.MeshStandardMaterial({ color: color });

        // Body
        const bodyGeom = new THREE.SphereGeometry(0.2, 16, 16);
        const body = new THREE.Mesh(bodyGeom, fishMat);
        body.scale.set(1.5, 0.8, 0.5);
        group.add(body);

        // Tail
        const tailGeom = new THREE.ConeGeometry(0.15, 0.3, 8);
        const tail = new THREE.Mesh(tailGeom, fishMat);
        tail.position.x = -0.35;
        tail.rotation.z = Math.PI / 2;
        group.add(tail);

        // Eye
        const eyeMat = new THREE.MeshStandardMaterial({ color: '#FFFFFF' });
        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 8), eyeMat);
        eye.position.set(0.2, 0.05, 0.08);
        group.add(eye);

        return group;
    }

    createTreasureChest(color, properties = {}) {
        const group = new THREE.Group();
        const woodMat = new THREE.MeshStandardMaterial({ color: color });

        // Base
        const baseGeom = new THREE.BoxGeometry(0.8, 0.4, 0.5);
        const base = new THREE.Mesh(baseGeom, woodMat);
        base.position.y = 0.2;
        group.add(base);

        // Lid
        const lidGeom = new THREE.CylinderGeometry(0.25, 0.25, 0.8, 16, 1, false, 0, Math.PI);
        const lid = new THREE.Mesh(lidGeom, woodMat);
        lid.rotation.z = Math.PI / 2;
        lid.position.y = 0.4;
        if (properties.open) {
            lid.rotation.x = -0.5;
            lid.position.z = -0.15;
        }
        group.add(lid);

        // Gold inside
        if (properties.gold && properties.open) {
            const goldMat = new THREE.MeshStandardMaterial({
                color: '#FFD700',
                emissive: '#FFD700',
                emissiveIntensity: 0.3,
                metalness: 0.8
            });
            for (let i = 0; i < 8; i++) {
                const coinGeom = new THREE.CylinderGeometry(0.05, 0.05, 0.02, 8);
                const coin = new THREE.Mesh(coinGeom, goldMat);
                coin.position.set(
                    (Math.random() - 0.5) * 0.4,
                    0.35 + Math.random() * 0.1,
                    (Math.random() - 0.5) * 0.2
                );
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

        // Top rings texture (simple representation)
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

        // Stem
        const stemGeom = new THREE.CylinderGeometry(0.08, 0.1, 0.3, 8);
        const stemMat = new THREE.MeshStandardMaterial({ color: '#FFFFF0' });
        const stem = new THREE.Mesh(stemGeom, stemMat);
        stem.position.y = 0.15;
        group.add(stem);

        // Cap
        const capGeom = new THREE.SphereGeometry(0.2, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2);
        const capMat = new THREE.MeshStandardMaterial({ color: color });
        const cap = new THREE.Mesh(capGeom, capMat);
        cap.position.y = 0.3;
        group.add(cap);

        // Spots
        if (properties.spots) {
            const spotMat = new THREE.MeshStandardMaterial({ color: '#FFFFFF' });
            for (let i = 0; i < 5; i++) {
                const spotGeom = new THREE.CircleGeometry(0.03, 8);
                const spot = new THREE.Mesh(spotGeom, spotMat);
                const angle = (i / 5) * Math.PI * 2;
                spot.position.set(
                    Math.cos(angle) * 0.12,
                    0.35 + Math.sin(angle * 2) * 0.03,
                    Math.sin(angle) * 0.12
                );
                spot.lookAt(spot.position.clone().multiplyScalar(2));
                group.add(spot);
            }
        }

        return group;
    }

    createFern(color) {
        const group = new THREE.Group();
        const fernMat = new THREE.MeshStandardMaterial({ color: color, side: THREE.DoubleSide });

        // Create fern fronds
        for (let i = 0; i < 8; i++) {
            const frondGeom = new THREE.PlaneGeometry(0.1, 0.8);
            const frond = new THREE.Mesh(frondGeom, fernMat);
            const angle = (i / 8) * Math.PI * 2;
            frond.position.set(
                Math.cos(angle) * 0.1,
                0.4,
                Math.sin(angle) * 0.1
            );
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

        const fireflyMat = new THREE.MeshStandardMaterial({
            color: color,
            emissive: color,
            emissiveIntensity: 0.8
        });

        for (let i = 0; i < count; i++) {
            const fireflyGeom = new THREE.SphereGeometry(0.03, 8, 8);
            const firefly = new THREE.Mesh(fireflyGeom, fireflyMat);
            firefly.position.set(
                (Math.random() - 0.5) * 4,
                0.5 + Math.random() * 2.5,
                (Math.random() - 0.5) * 4
            );
            group.add(firefly);
        }

        return group;
    }

    createBird(color) {
        const group = new THREE.Group();
        const birdMat = new THREE.MeshStandardMaterial({ color: color });

        // Body
        const bodyGeom = new THREE.SphereGeometry(0.15, 8, 8);
        const body = new THREE.Mesh(bodyGeom, birdMat);
        body.scale.set(1.2, 0.8, 0.8);
        group.add(body);

        // Head
        const headGeom = new THREE.SphereGeometry(0.1, 8, 8);
        const head = new THREE.Mesh(headGeom, birdMat);
        head.position.x = 0.15;
        head.position.y = 0.08;
        group.add(head);

        // Beak
        const beakGeom = new THREE.ConeGeometry(0.03, 0.1, 8);
        const beakMat = new THREE.MeshStandardMaterial({ color: '#FFD700' });
        const beak = new THREE.Mesh(beakGeom, beakMat);
        beak.position.set(0.28, 0.08, 0);
        beak.rotation.z = -Math.PI / 2;
        group.add(beak);

        // Wings
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

        // Main body
        const bodyGeom = new THREE.CylinderGeometry(0.2, 0.25, 1.5, 8);
        const body = new THREE.Mesh(bodyGeom, cactusMat);
        body.position.y = 0.75;
        group.add(body);

        // Arms
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

        // Cranium
        const craniumGeom = new THREE.SphereGeometry(0.2, 16, 16);
        const cranium = new THREE.Mesh(craniumGeom, boneMat);
        cranium.scale.set(0.8, 1, 0.9);
        cranium.position.y = 0.15;
        group.add(cranium);

        // Jaw
        const jawGeom = new THREE.BoxGeometry(0.15, 0.08, 0.12);
        const jaw = new THREE.Mesh(jawGeom, boneMat);
        jaw.position.set(0, 0.02, 0.08);
        group.add(jaw);

        // Eye sockets
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

        // Vase body using lathe
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
        const sunMat = new THREE.MeshStandardMaterial({
            color: color,
            emissive: color,
            emissiveIntensity: properties.glowing ? 0.8 : 0.3
        });

        const sunGeom = new THREE.CircleGeometry(0.5, 32);
        const sun = new THREE.Mesh(sunGeom, sunMat);
        group.add(sun);

        // Rays
        for (let i = 0; i < 8; i++) {
            const rayGeom = new THREE.PlaneGeometry(0.1, 0.3);
            const ray = new THREE.Mesh(rayGeom, sunMat);
            const angle = (i / 8) * Math.PI * 2;
            ray.position.set(Math.cos(angle) * 0.7, Math.sin(angle) * 0.7, 0);
            ray.rotation.z = angle + Math.PI / 2;
            group.add(ray);
        }

        // Light
        if (properties.glowing) {
            const light = new THREE.PointLight(0xFFD700, 0.5, 5);
            group.add(light);
        }

        return group;
    }

    // === CYBERPUNK DECORATIONS ===
    createNeonSign(color, properties = {}) {
        const group = new THREE.Group();
        const neonMat = new THREE.MeshStandardMaterial({
            color: color,
            emissive: color,
            emissiveIntensity: properties.flicker ? 0.8 : 0.6
        });

        // Sign backing
        const backGeom = new THREE.BoxGeometry(2.5, 0.8, 0.1);
        const backMat = new THREE.MeshStandardMaterial({ color: '#1A1A1A' });
        const back = new THREE.Mesh(backGeom, backMat);
        group.add(back);

        // Neon text (simplified as glowing bar)
        const textGeom = new THREE.BoxGeometry(2, 0.5, 0.05);
        const text = new THREE.Mesh(textGeom, neonMat);
        text.position.z = 0.08;
        group.add(text);

        // Light
        const light = new THREE.PointLight(new THREE.Color(color).getHex(), 0.5, 3);
        light.position.z = 0.5;
        group.add(light);

        return group;
    }

    createNeonTube(color) {
        const group = new THREE.Group();
        const neonMat = new THREE.MeshStandardMaterial({
            color: color,
            emissive: color,
            emissiveIntensity: 0.8
        });

        const tubeGeom = new THREE.CylinderGeometry(0.02, 0.02, 3, 8);
        const tube = new THREE.Mesh(tubeGeom, neonMat);
        group.add(tube);

        // Light
        const light = new THREE.PointLight(new THREE.Color(color).getHex(), 0.3, 2);
        group.add(light);

        return group;
    }

    createHolographicScreen(color, properties = {}) {
        const group = new THREE.Group();

        const screenMat = new THREE.MeshStandardMaterial({
            color: color,
            emissive: color,
            emissiveIntensity: 0.5,
            transparent: true,
            opacity: 0.7
        });

        const screenGeom = new THREE.PlaneGeometry(1.5, 1);
        const screen = new THREE.Mesh(screenGeom, screenMat);
        group.add(screen);

        // Frame
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

        // Scattered robot parts
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

        // Main rack
        const rackGeom = new THREE.BoxGeometry(0.8, 2, 0.5);
        const rack = new THREE.Mesh(rackGeom, rackMat);
        rack.position.y = 1;
        group.add(rack);

        // Server units
        const serverMat = new THREE.MeshStandardMaterial({ color: '#2A2A2A' });
        for (let i = 0; i < 5; i++) {
            const serverGeom = new THREE.BoxGeometry(0.75, 0.3, 0.45);
            const server = new THREE.Mesh(serverGeom, serverMat);
            server.position.set(0, 0.3 + i * 0.35, 0.03);
            group.add(server);

            // Blinking lights
            if (properties.lights) {
                const lightMat = new THREE.MeshStandardMaterial({
                    color: i % 2 === 0 ? '#00FF00' : '#FF0000',
                    emissive: i % 2 === 0 ? '#00FF00' : '#FF0000',
                    emissiveIntensity: 0.5
                });
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

        // Body
        const bodyGeom = new THREE.BoxGeometry(0.3, 0.1, 0.3);
        const body = new THREE.Mesh(bodyGeom, droneMat);
        group.add(body);

        // Propeller arms
        const armMat = new THREE.MeshStandardMaterial({ color: '#1A1A1A' });
        [[0.2, 0.2], [0.2, -0.2], [-0.2, 0.2], [-0.2, -0.2]].forEach(([x, z]) => {
            const armGeom = new THREE.CylinderGeometry(0.02, 0.02, 0.15, 8);
            const arm = new THREE.Mesh(armGeom, armMat);
            arm.position.set(x * 0.8, 0, z * 0.8);
            arm.rotation.z = Math.PI / 2;
            group.add(arm);

            // Propeller
            const propGeom = new THREE.CircleGeometry(0.1, 16);
            const propMat = new THREE.MeshStandardMaterial({ color: '#666666', side: THREE.DoubleSide });
            const prop = new THREE.Mesh(propGeom, propMat);
            prop.position.set(x * 0.8, 0.08, z * 0.8);
            prop.rotation.x = -Math.PI / 2;
            group.add(prop);
        });

        // Eye/camera
        const eyeGeom = new THREE.SphereGeometry(0.05, 8, 8);
        const eyeMat = new THREE.MeshStandardMaterial({
            color: '#FF0000',
            emissive: '#FF0000',
            emissiveIntensity: 0.5
        });
        const eye = new THREE.Mesh(eyeGeom, eyeMat);
        eye.position.set(0, -0.08, 0.1);
        group.add(eye);

        return group;
    }

    // === MEDIEVAL DECORATIONS ===
    createTorch(color, properties = {}) {
        const group = new THREE.Group();
        const woodMat = new THREE.MeshStandardMaterial({ color: color });

        // Handle
        const handleGeom = new THREE.CylinderGeometry(0.03, 0.04, 0.4, 8);
        const handle = new THREE.Mesh(handleGeom, woodMat);
        group.add(handle);

        // Torch head
        const headGeom = new THREE.CylinderGeometry(0.06, 0.04, 0.15, 8);
        const headMat = new THREE.MeshStandardMaterial({ color: '#4A3728' });
        const head = new THREE.Mesh(headGeom, headMat);
        head.position.y = 0.25;
        group.add(head);

        // Fire
        if (properties.fire) {
            const fireMat = new THREE.MeshStandardMaterial({
                color: '#FF4500',
                emissive: '#FF4500',
                emissiveIntensity: 0.8
            });
            const fireGeom = new THREE.ConeGeometry(0.08, 0.2, 8);
            const fire = new THREE.Mesh(fireGeom, fireMat);
            fire.position.y = 0.4;
            group.add(fire);

            // Light
            const light = new THREE.PointLight(0xFF6600, 0.5, 3);
            light.position.y = 0.4;
            group.add(light);
        }

        return group;
    }

    createArmorStand(color) {
        const group = new THREE.Group();
        const metalMat = new THREE.MeshStandardMaterial({ color: color, metalness: 0.8 });

        // Stand base
        const baseMat = new THREE.MeshStandardMaterial({ color: '#4A3728' });
        const baseGeom = new THREE.CylinderGeometry(0.3, 0.35, 0.1, 16);
        const base = new THREE.Mesh(baseGeom, baseMat);
        base.position.y = 0.05;
        group.add(base);

        // Stand pole
        const poleGeom = new THREE.CylinderGeometry(0.03, 0.03, 1.8, 8);
        const pole = new THREE.Mesh(poleGeom, baseMat);
        pole.position.y = 1;
        group.add(pole);

        // Helmet
        const helmetGeom = new THREE.SphereGeometry(0.15, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2);
        const helmet = new THREE.Mesh(helmetGeom, metalMat);
        helmet.position.y = 1.85;
        group.add(helmet);

        // Chest plate
        const chestGeom = new THREE.BoxGeometry(0.4, 0.5, 0.2);
        const chest = new THREE.Mesh(chestGeom, metalMat);
        chest.position.y = 1.4;
        group.add(chest);

        // Shoulders
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

        // Barrel body
        const barrelGeom = new THREE.CylinderGeometry(0.3, 0.35, 0.8, 12);
        const barrel = new THREE.Mesh(barrelGeom, woodMat);
        barrel.position.y = 0.4;
        group.add(barrel);

        // Metal bands
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

        // Banner fabric
        const bannerGeom = new THREE.PlaneGeometry(0.8, 1.5);
        const banner = new THREE.Mesh(bannerGeom, fabricMat);
        group.add(banner);

        // Pole
        const poleMat = new THREE.MeshStandardMaterial({ color: '#8B4513' });
        const poleGeom = new THREE.CylinderGeometry(0.02, 0.02, 1.8, 8);
        const pole = new THREE.Mesh(poleGeom, poleMat);
        pole.position.y = 0.9;
        group.add(pole);

        // Emblem (simple circle)
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

        // Blade
        const bladeGeom = new THREE.BoxGeometry(0.05, 1, 0.01);
        const blade = new THREE.Mesh(bladeGeom, metalMat);
        group.add(blade);

        // Guard
        const guardGeom = new THREE.BoxGeometry(0.3, 0.05, 0.05);
        const guardMat = new THREE.MeshStandardMaterial({ color: '#FFD700', metalness: 0.8 });
        const guard = new THREE.Mesh(guardGeom, guardMat);
        guard.position.y = -0.5;
        group.add(guard);

        // Handle
        const handleGeom = new THREE.CylinderGeometry(0.03, 0.03, 0.2, 8);
        const handleMat = new THREE.MeshStandardMaterial({ color: '#4A3728' });
        const handle = new THREE.Mesh(handleGeom, handleMat);
        handle.position.y = -0.65;
        group.add(handle);

        // Pommel
        const pommelGeom = new THREE.SphereGeometry(0.04, 8, 8);
        const pommel = new THREE.Mesh(pommelGeom, guardMat);
        pommel.position.y = -0.78;
        group.add(pommel);

        return group;
    }

    createChest(color) {
        const group = new THREE.Group();
        const woodMat = new THREE.MeshStandardMaterial({ color: color });

        // Base
        const baseGeom = new THREE.BoxGeometry(0.8, 0.5, 0.5);
        const base = new THREE.Mesh(baseGeom, woodMat);
        base.position.y = 0.25;
        group.add(base);

        // Lid
        const lidGeom = new THREE.BoxGeometry(0.85, 0.15, 0.55);
        const lid = new THREE.Mesh(lidGeom, woodMat);
        lid.position.y = 0.575;
        group.add(lid);

        // Metal accents
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

        // Pot
        const potGeom = new THREE.CylinderGeometry(0.2, 0.15, 0.3, 12);
        const potMat = new THREE.MeshStandardMaterial({ color: '#8B4513' });
        const pot = new THREE.Mesh(potGeom, potMat);
        pot.position.y = 0.15;
        group.add(pot);

        // Soil
        const soilGeom = new THREE.CircleGeometry(0.18, 12);
        const soilMat = new THREE.MeshStandardMaterial({ color: '#3D2914' });
        const soil = new THREE.Mesh(soilGeom, soilMat);
        soil.rotation.x = -Math.PI / 2;
        soil.position.y = 0.3;
        group.add(soil);

        // Plant leaves
        const leafMat = new THREE.MeshStandardMaterial({ color: color, side: THREE.DoubleSide });
        for (let i = 0; i < 8; i++) {
            const leafGeom = new THREE.PlaneGeometry(0.15, 0.4);
            const leaf = new THREE.Mesh(leafGeom, leafMat);
            const angle = (i / 8) * Math.PI * 2;
            leaf.position.set(
                Math.cos(angle) * 0.08,
                0.5,
                Math.sin(angle) * 0.08
            );
            leaf.rotation.y = angle;
            leaf.rotation.x = -0.3;
            group.add(leaf);
        }

        return group;
    }

    createFloorLamp(color) {
        const group = new THREE.Group();

        // Base
        const baseGeom = new THREE.CylinderGeometry(0.2, 0.25, 0.05, 16);
        const baseMat = new THREE.MeshStandardMaterial({ color: '#1A1A1A' });
        const base = new THREE.Mesh(baseGeom, baseMat);
        base.position.y = 0.025;
        group.add(base);

        // Pole
        const poleGeom = new THREE.CylinderGeometry(0.02, 0.02, 1.5, 8);
        const poleMat = new THREE.MeshStandardMaterial({ color: '#C0C0C0', metalness: 0.8 });
        const pole = new THREE.Mesh(poleGeom, poleMat);
        pole.position.y = 0.8;
        group.add(pole);

        // Shade
        const shadeGeom = new THREE.CylinderGeometry(0.25, 0.35, 0.3, 16, 1, true);
        const shadeMat = new THREE.MeshStandardMaterial({
            color: color,
            side: THREE.DoubleSide,
            emissive: color,
            emissiveIntensity: 0.2
        });
        const shade = new THREE.Mesh(shadeGeom, shadeMat);
        shade.position.y = 1.6;
        group.add(shade);

        // Light
        const light = new THREE.PointLight(0xFFFFAA, 0.5, 4);
        light.position.y = 1.5;
        group.add(light);

        return group;
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
        const adWidth = ad.width || 6;  // 2'den 6'ya çıkarıldı
        const adHeight = ad.height || 3.5; // 1.5'ten 3.5'e çıkarıldı
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
            // Remove crossOrigin when using proxy - it's same-origin now
            // video.crossOrigin = 'anonymous';
            video.playsInline = true;

            video.play().catch(err => console.warn('Video autoplay failed:', err));

            const videoTexture = new THREE.VideoTexture(video);
            videoTexture.minFilter = THREE.LinearFilter;
            videoTexture.magFilter = THREE.LinearFilter;

            panelMaterial = new THREE.MeshBasicMaterial({
                map: videoTexture,
                side: THREE.DoubleSide
            });

            console.log('Video ad created (proxied):', ad.content_url, '→', video.src);
        } else if (ad.ad_type === 'image' && ad.content_url) {
            // Image texture
            const textureLoader = new THREE.TextureLoader();
            const proxiedUrl = getProxiedUrl(ad.content_url);
            console.log('Image ad loading:', ad.content_url, '→', proxiedUrl);

            const imageTexture = textureLoader.load(
                proxiedUrl,
                (texture) => {
                    console.log('Image ad loaded successfully:', ad.content_url);
                },
                undefined,
                (error) => {
                    console.error('Error loading ad image:', error, 'URL:', proxiedUrl);
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

        // Process WASD movement
        this.processMovement();

        // Update camera rotation based on yaw and pitch
        this.updateCameraRotation();

        this.renderer.render(this.scene, this.camera);
    }

    processMovement() {
        // Calculate forward and right vectors based on yaw
        const forward = new THREE.Vector3(
            -Math.sin(this.yaw),
            0,
            -Math.cos(this.yaw)
        );
        const right = new THREE.Vector3(
            Math.cos(this.yaw),
            0,
            -Math.sin(this.yaw)
        );

        // Apply movement based on keys pressed
        const movement = new THREE.Vector3();

        if (this.keys.w) movement.add(forward);
        if (this.keys.s) movement.sub(forward);
        if (this.keys.d) movement.add(right);
        if (this.keys.a) movement.sub(right);

        if (movement.length() > 0) {
            movement.normalize().multiplyScalar(this.moveSpeed);

            // Calculate new position
            const newX = this.camera.position.x + movement.x;
            const newZ = this.camera.position.z + movement.z;

            // Clamp to room bounds (with margin for walls)
            const margin = 0.5;
            const maxPos = (this.roomSize / 2) - margin;

            this.camera.position.x = Math.max(-maxPos, Math.min(maxPos, newX));
            this.camera.position.z = Math.max(-maxPos, Math.min(maxPos, newZ));
        }
    }

    updateCameraRotation() {
        // Create rotation from yaw and pitch
        const euler = new THREE.Euler(this.pitch, this.yaw, 0, 'YXZ');
        this.camera.quaternion.setFromEuler(euler);
    }

    onKeyDown(event) {
        // Only process if canvas is visible/active
        if (!this.canvas.offsetParent) return;

        const key = event.key.toLowerCase();
        if (key in this.keys) {
            this.keys[key] = true;
            event.preventDefault();
        }
    }

    onKeyUp(event) {
        const key = event.key.toLowerCase();
        if (key in this.keys) {
            this.keys[key] = false;
        }
    }

    // === DRAG AND DROP + CAMERA LOOK METHODS ===

    getMousePosition(event) {
        const rect = this.canvas.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    }

    onMouseDown(event) {
        event.preventDefault();

        // Right-click: start looking mode
        if (event.button === 2) {
            this.isLooking = true;
            this.lastMouseX = event.clientX;
            this.lastMouseY = event.clientY;
            this.canvas.style.cursor = 'move';
            return;
        }

        // Left-click: drag objects
        if (event.button === 0) {
            this.getMousePosition(event);

            // Raycast to find draggable objects
            this.raycaster.setFromCamera(this.mouse, this.camera);

            // We need to check all children of draggable groups, not just top-level meshes
            const allDraggableChildren = [];
            this.draggableObjects.forEach(obj => {
                if (obj.type === 'Group') {
                    obj.traverse(child => {
                        if (child.isMesh) {
                            child.userData.parentDraggable = obj;
                            allDraggableChildren.push(child);
                        }
                    });
                } else {
                    allDraggableChildren.push(obj);
                }
            });

            const intersects = this.raycaster.intersectObjects(allDraggableChildren, false);

            if (intersects.length > 0) {
                // Get the top-level draggable object
                let hitObject = intersects[0].object;
                if (hitObject.userData.parentDraggable) {
                    hitObject = hitObject.userData.parentDraggable;
                } else {
                    // Find the parent that is in draggableObjects
                    while (hitObject.parent && !this.draggableObjects.includes(hitObject)) {
                        hitObject = hitObject.parent;
                    }
                }

                if (this.draggableObjects.includes(hitObject)) {
                    this.selectedObject = hitObject;
                    this.isDragging = true;

                    // Update drag plane to be at the object's Y position
                    this.dragPlane.constant = -hitObject.position.y;

                    // Calculate offset
                    const intersection = new THREE.Vector3();
                    this.raycaster.ray.intersectPlane(this.dragPlane, intersection);
                    this.dragOffset.copy(hitObject.position).sub(intersection);

                    // Change cursor
                    this.canvas.style.cursor = 'grabbing';

                    // Highlight selected object
                    this.highlightObject(hitObject, true);
                }
            }
        }
    }

    onMouseMove(event) {
        event.preventDefault();

        // Camera look mode (right-click held)
        if (this.isLooking) {
            const deltaX = event.clientX - this.lastMouseX;
            const deltaY = event.clientY - this.lastMouseY;

            this.yaw -= deltaX * this.lookSpeed;
            this.pitch -= deltaY * this.lookSpeed;

            // Clamp pitch to prevent flipping
            this.pitch = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, this.pitch));

            this.lastMouseX = event.clientX;
            this.lastMouseY = event.clientY;
            return;
        }

        this.getMousePosition(event);

        // Object dragging mode (left-click held)
        if (this.isDragging && this.selectedObject) {
            // Move object on horizontal plane
            this.raycaster.setFromCamera(this.mouse, this.camera);

            const intersection = new THREE.Vector3();
            if (this.raycaster.ray.intersectPlane(this.dragPlane, intersection)) {
                const newX = intersection.x + this.dragOffset.x;
                const newZ = intersection.z + this.dragOffset.z;

                // Clamp to room bounds (with some margin)
                const margin = 0.5;
                const maxPos = (this.roomSize / 2) - margin;
                this.selectedObject.position.x = Math.max(-maxPos, Math.min(maxPos, newX));
                this.selectedObject.position.z = Math.max(-maxPos, Math.min(maxPos, newZ));

                // Update decoration data
                const decoData = this.decorationDataMap.get(this.selectedObject);
                if (decoData) {
                    decoData.position[0] = this.selectedObject.position.x;
                    decoData.position[2] = this.selectedObject.position.z;
                }
            }
        } else {
            // Hover effect
            this.raycaster.setFromCamera(this.mouse, this.camera);

            const allDraggableChildren = [];
            this.draggableObjects.forEach(obj => {
                if (obj.type === 'Group') {
                    obj.traverse(child => {
                        if (child.isMesh) {
                            child.userData.parentDraggable = obj;
                            allDraggableChildren.push(child);
                        }
                    });
                } else {
                    allDraggableChildren.push(obj);
                }
            });

            const intersects = this.raycaster.intersectObjects(allDraggableChildren, false);
            if (intersects.length > 0) {
                this.canvas.style.cursor = 'grab';
            } else {
                this.canvas.style.cursor = 'crosshair';
            }
        }
    }

    onMouseUp(event) {
        // Stop looking mode
        if (this.isLooking) {
            this.isLooking = false;
            this.canvas.style.cursor = 'crosshair';
        }

        // Stop dragging mode
        if (this.isDragging && this.selectedObject) {
            // Remove highlight
            this.highlightObject(this.selectedObject, false);

            // Notify callback
            if (this.onDecorationMoved) {
                this.onDecorationMoved(this.getUpdatedDecorations());
            }
        }

        this.isDragging = false;
        this.selectedObject = null;
    }

    // Touch support - single touch drags, two-finger touch looks
    onTouchStart(event) {
        event.preventDefault();
        if (event.touches.length === 1) {
            const touch = event.touches[0];
            this.onMouseDown({ button: 0, clientX: touch.clientX, clientY: touch.clientY, preventDefault: () => {} });
        } else if (event.touches.length === 2) {
            // Two-finger touch starts look mode
            this.isLooking = true;
            const touch = event.touches[0];
            this.lastMouseX = touch.clientX;
            this.lastMouseY = touch.clientY;
        }
    }

    onTouchMove(event) {
        event.preventDefault();
        if (event.touches.length === 2 && this.isLooking) {
            // Two-finger drag for looking
            const touch = event.touches[0];
            const deltaX = touch.clientX - this.lastMouseX;
            const deltaY = touch.clientY - this.lastMouseY;

            this.yaw -= deltaX * this.lookSpeed;
            this.pitch -= deltaY * this.lookSpeed;
            this.pitch = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, this.pitch));

            this.lastMouseX = touch.clientX;
            this.lastMouseY = touch.clientY;
        } else if (event.touches.length === 1 && this.isDragging) {
            event.preventDefault();
            const touch = event.touches[0];
            this.onMouseMove({ clientX: touch.clientX, clientY: touch.clientY, preventDefault: () => {} });
        }
    }

    onTouchEnd(event) {
        this.onMouseUp(event);
    }

    highlightObject(object, highlight) {
        const emissiveColor = highlight ? 0x444444 : 0x000000;

        if (object.type === 'Group') {
            object.traverse(child => {
                if (child.isMesh && child.material) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach(m => {
                            if (m.emissive) m.emissive.setHex(emissiveColor);
                        });
                    } else if (child.material.emissive) {
                        child.material.emissive.setHex(emissiveColor);
                    }
                }
            });
        } else if (object.isMesh && object.material) {
            if (Array.isArray(object.material)) {
                object.material.forEach(m => {
                    if (m.emissive) m.emissive.setHex(emissiveColor);
                });
            } else if (object.material.emissive) {
                object.material.emissive.setHex(emissiveColor);
            }
        }
    }

    getUpdatedDecorations() {
        const decorations = [];
        this.decorationDataMap.forEach((data, mesh) => {
            decorations.push({
                ...data,
                position: [mesh.position.x, mesh.position.y, mesh.position.z]
            });
        });
        return decorations;
    }

    // Set callback for when decorations are moved
    setOnDecorationMoved(callback) {
        this.onDecorationMoved = callback;
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
