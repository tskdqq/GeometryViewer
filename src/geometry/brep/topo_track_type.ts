export enum TopoTrackType {
    // 新建
    NEW,
    // 投影
    PROJECT,
    // 扫掠
    SWEEP,
    // 打断
    SPLIT,
    // 合并
    MERGE,
    // 布尔运算
    BOOL_OPERATE,

    // 施工图专用
    CONSTRUCTION_DRAWING_ADDED = 1000,
    CONSTRUCTION_DRAWING_MODIFIED = 1001,
    CONSTRUCTION_DRAWING_RESERVED = 1002
}
