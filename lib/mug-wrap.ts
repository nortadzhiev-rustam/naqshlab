// Derived from the current public/models/mug.glb bounds.
// Keep the full cylindrical circumference so the studio export can wrap across
// the full mug surface while the viewer handles front alignment separately.
export const MUG_WRAP_ANGLE = Math.PI * 2;
export const MUG_CANVAS_HEIGHT = 340;
export const MUG_CANVAS_WIDTH = 1080;
export const MUG_CANVAS_ASPECT = MUG_CANVAS_WIDTH / MUG_CANVAS_HEIGHT;