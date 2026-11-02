// TODO:避免与GeometryType中数值相同，暂时先都加1000.以后重构续将两个Type写在同一个文件中
enum MathType {
    // 抽象类型
    enInvalid = -1000,

    // 二维点/二维向量
    enVector2D = 1200,
    // 二维包围盒
    enBox2D = 1210,
    // 平面坐标系
    enCoordinate2d = 1220,

    // 三维点/三维向量
    enVector3D = 1300,
    // 三维包围盒
    enBox3D = 1310,
    // 空间坐标系
    enCoordinate3d = 1320,
    // 三行三列矩阵
    enMatrix3D = 1330,

    // 四行四列矩阵
    enMatrix4D = 1420
}

export { MathType };
