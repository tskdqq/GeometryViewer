export interface XYIndex {
    x: number;
    y: number;
    index: number;
}

export interface PolygonTri {
    vertices: XYIndex[];
    edges: number[][];
    faces: number[][];
}
