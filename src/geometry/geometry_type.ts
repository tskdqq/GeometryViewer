

enum GeometryType {
    // 抽象类型
    enInvalid = -1,

    // 二维点
    enPoint2D = 200,
    // 二维直线
    enLine2D = 201,
    // 二维圆弧
    enArc2D = 202,

    // 三维点
    enPoint3D = 300,
    // 三维直线  与 二维必须对应
    enLine3D = 301,
    // 三维圆弧
    enArc3D = 302,
    // 平面
    enPlane = 330,
    // 柱面
    enCylinder = 331,

    // 半边
    enCoedge = 101,
    // 边集
    enPolyline = 102,
    // 环
    enLoop = 103,
    // 多边形
    enPolygon = 104,
    // edge
    enEdge = 105,
    // face
    enFace = 106,
    // shell
    enShell = 107,
    // body
    enBrepBody = 108,
    // body
    enFacesBody = 109
}

export { GeometryType };
