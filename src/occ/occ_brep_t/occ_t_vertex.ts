import { Vector3 } from '../../math/vector3';
class OCCTVertex {
    constructor(public vector3: Vector3) { }
    public equals(mOCCTVertex: OCCTVertex): boolean {
        return this.vector3.equals(mOCCTVertex.vector3);
    }
    public toJson() {
        return `{"x":${this.vector3.x},"y":${this.vector3.y},"z":${this.vector3.z}}`;
    }
}
export { OCCTVertex };
