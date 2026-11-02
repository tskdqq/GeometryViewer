
/**
 * 点与曲线位置关系类型
 * 
 * 点在线上（非0）：
 * - ON_START 点在曲线起点
 * - ON_END 点在曲线末点
 * - ON 点在曲线末点
 * 
 * 点不在线上（0）：
 * - NOT_ON 点不在线上 
 */
enum PtCurvePostionType {
    NOT_ON = 0,

    ON_START = 1,
    ON_END = 2,
    IN = 3
}

/**
 * 曲线间位置关系类型
 * 
 * 重叠，十位数为1：
 * - OVERLAP 部分重叠
 * - OVERLAP_EQUAL 在几何上完全相等
 * - OVERLAP_IN 在内部
 * - OVERLAP_CONTAIN 包含
 * 
 * 相交，十位数为2
 * - INTERSECT_IN 在曲线内部相交
 * - INTERSECT_ON 在曲线端点处相交
 * 
 * 不相交（为0）
 * - NOT_INTERSECT 不相交
 */
enum CurveCuvePositonType {
    NOT_INTERSECT = 0,

    OVERLAP = 10,
    OVERLAP_EQUAL = 11,
    OVERLAP_IN = 12,
    OVERLAP_CONTAIN = 13,

    INTERSECT_IN = 21,
    INTERSECT_ON = 22
}

/**
 * 点与loop的关系类型:
 * - OUT 点在loop外部
 * - ON  点在loop边界上
 * - IN 点在loop内部
 */
enum PtLoopPositonType {

    OUT = 0,

    ON = 1,

    IN = 2
}

/** 
 * 曲线与loop的关系类型:
 *  - TANGENT_INNER 内切
 *  - TANGENT_OUTTER 外切
 *  - ON 曲线在loop的边界上
 *  - INTERSECT 相交
 *  - IN 曲线在loop内部
 *  - OUT 曲线在loop外部 
 */
enum CurveLoopPositonType {
    INTERSECT = 10,
    TANGENT_INNER = 11,
    TANGENT_OUTTER = 12,
    ON = 13,

    IN = 0,
    OUT = 1
}

/**
 * loop与loop的关系
 */
enum LoopLoopPositonType {
    // 内切
    INTERSECT_TANGENT_INNER = 11,
    // 相交
    INTERSECT = 12,
    // 外切
    INTERSECT_TANGENT_OUTTER = 13,
    // 几何上相等
    EQUAL = 14,

    // 在内部
    IN = 1,
    // 在内部
    CONTAIN = 2,
    // 在外部
    OUT = 0
}

/**
 * point与body的关系
 */
enum PointBodyPositonType {
        // 在内部
    IN = 1,
        // 在外部
    OUT = 0,
        // 在body上
    ON = 2
}

/**
 * curve与body的关系
 */
enum CurveBodyPositonType {
    // 内切
    INTERSECT_TANGENT_INNER = 11,
        // 相交
    INTERSECT = 12,
        // 外切
    INTERSECT_TANGENT_OUTTER = 13,
        // 在内部
    IN = 1,
        // 在内部
    CONTAIN = 2,
        // 在外部
    OUT = 0
}

/**
 * curve与body的关系
 */
enum CurveFacePositonType {
        // 相切
    INTERSECT_TANGENT= 11,
        // 相交
    INTERSECT = 12,
        // 在内部
    CONTAIN = 1,
        // 在外部
    OUT = 0
}

/**
 * face与body的关系
 */
enum FaceBodyPositonType {
        // 相交
    INTERSECT = 12,
        // 外切
    IN = 1,
        // 在内部
    CONTAIN = 2,
        // 在外部
    OUT = 0
}

export {
    PtCurvePostionType,
    CurveCuvePositonType,
    PtLoopPositonType,
    CurveLoopPositonType,
    LoopLoopPositonType,
    PointBodyPositonType,
    CurveBodyPositonType,
    FaceBodyPositonType,
    CurveFacePositonType
};
