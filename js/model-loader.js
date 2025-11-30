// Model Loader - Handles loading and caching of 3D GLTF models

class ModelLoader {
    constructor() {
        this.loader = new THREE.GLTFLoader();
        this.cache = new Map();  // Cache loaded models
        this.loadingPromises = new Map();  // Track loading promises to avoid duplicate loads
        this.basePath = '/assets/models/';

        // Model definitions - maps decoration types to model files
        this.modelDefinitions = {
            // Christmas
            'christmas_tree': { file: 'christmas_tree.glb', scale: 1.0 },
            'gift_box': { file: 'gift_box.glb', scale: 0.5 },
            'snowman': { file: 'snowman.glb', scale: 0.8 },

            // Halloween
            'pumpkin': { file: 'pumpkin.glb', scale: 0.6 },
            'cauldron': { file: 'cauldron.glb', scale: 0.7 },

            // Office
            'desk': { file: 'desk.glb', scale: 1.0 },
            'office_chair': { file: 'office_chair.glb', scale: 0.8 },

            // Medieval
            'torch': { file: 'torch.glb', scale: 0.5 },
            'barrel': { file: 'barrel.glb', scale: 0.6 },
            'chest': { file: 'chest.glb', scale: 0.7 },
            'armor_stand': { file: 'armor_stand.glb', scale: 1.0 },

            // Furniture
            'armchair': { file: 'armchair.glb', scale: 0.9 },
            'fireplace': { file: 'fireplace.glb', scale: 1.0 },

            // Plants
            'potted_plant': { file: 'potted_plant.glb', scale: 0.6 },
            'cactus': { file: 'cactus.glb', scale: 0.7 },

            // Misc
            'treasure_chest': { file: 'treasure_chest.glb', scale: 0.7 },
            'rock': { file: 'rock.glb', scale: 0.5 }
        };
    }

    /**
     * Check if a model file exists for the given decoration type
     */
    hasModel(type) {
        return this.modelDefinitions.hasOwnProperty(type);
    }

    /**
     * Get model definition for a type
     */
    getModelDefinition(type) {
        return this.modelDefinitions[type] || null;
    }

    /**
     * Load a model by decoration type
     * Returns a promise that resolves to a cloned THREE.Group
     */
    async loadModel(type) {
        const definition = this.modelDefinitions[type];
        if (!definition) {
            return null;
        }

        const filePath = this.basePath + definition.file;

        // Return cached model (cloned)
        if (this.cache.has(filePath)) {
            return this.cloneModel(this.cache.get(filePath), definition.scale);
        }

        // Return existing loading promise if already loading
        if (this.loadingPromises.has(filePath)) {
            const originalModel = await this.loadingPromises.get(filePath);
            return this.cloneModel(originalModel, definition.scale);
        }

        // Start loading
        const loadPromise = new Promise((resolve, reject) => {
            this.loader.load(
                filePath,
                (gltf) => {
                    const model = gltf.scene;

                    // Setup shadows for all meshes
                    model.traverse((child) => {
                        if (child.isMesh) {
                            child.castShadow = true;
                            child.receiveShadow = true;
                        }
                    });

                    // Cache the original model
                    this.cache.set(filePath, model);
                    this.loadingPromises.delete(filePath);

                    resolve(model);
                },
                (progress) => {
                    // Loading progress
                    const percent = (progress.loaded / progress.total * 100).toFixed(0);
                    console.log(`Loading ${type}: ${percent}%`);
                },
                (error) => {
                    console.warn(`Failed to load model ${filePath}:`, error);
                    this.loadingPromises.delete(filePath);
                    resolve(null);  // Return null instead of rejecting
                }
            );
        });

        this.loadingPromises.set(filePath, loadPromise);
        const originalModel = await loadPromise;

        if (originalModel) {
            return this.cloneModel(originalModel, definition.scale);
        }
        return null;
    }

    /**
     * Clone a model for use in the scene
     */
    cloneModel(originalModel, scale = 1.0) {
        const clone = originalModel.clone();

        // Deep clone materials to allow individual modifications
        clone.traverse((child) => {
            if (child.isMesh) {
                if (Array.isArray(child.material)) {
                    child.material = child.material.map(m => m.clone());
                } else if (child.material) {
                    child.material = child.material.clone();
                }
            }
        });

        // Apply default scale from definition
        clone.scale.setScalar(scale);

        return clone;
    }

    /**
     * Preload multiple models
     */
    async preloadModels(types) {
        const promises = types.map(type => this.loadModel(type));
        await Promise.all(promises);
    }

    /**
     * Preload all defined models
     */
    async preloadAll() {
        const types = Object.keys(this.modelDefinitions);
        await this.preloadModels(types);
    }

    /**
     * Clear the model cache
     */
    clearCache() {
        this.cache.forEach((model) => {
            model.traverse((child) => {
                if (child.isMesh) {
                    if (child.geometry) child.geometry.dispose();
                    if (child.material) {
                        if (Array.isArray(child.material)) {
                            child.material.forEach(m => m.dispose());
                        } else {
                            child.material.dispose();
                        }
                    }
                }
            });
        });
        this.cache.clear();
    }

    /**
     * Apply a color tint to a model
     */
    applyColorTint(model, color) {
        const tintColor = new THREE.Color(color);

        model.traverse((child) => {
            if (child.isMesh && child.material) {
                if (Array.isArray(child.material)) {
                    child.material.forEach(m => {
                        if (m.color) {
                            m.color.multiply(tintColor);
                        }
                    });
                } else if (child.material.color) {
                    child.material.color.multiply(tintColor);
                }
            }
        });
    }

    /**
     * Set emissive glow on a model (for highlighting)
     */
    setEmissive(model, color, intensity = 0.3) {
        const emissiveColor = new THREE.Color(color);

        model.traverse((child) => {
            if (child.isMesh && child.material) {
                const materials = Array.isArray(child.material) ? child.material : [child.material];
                materials.forEach(m => {
                    if (m.emissive !== undefined) {
                        m.emissive = emissiveColor;
                        m.emissiveIntensity = intensity;
                    }
                });
            }
        });
    }
}

// Create global instance
const modelLoader = new ModelLoader();
