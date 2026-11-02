class ErrorSystem {
    // double级别的容差
    public static readonly DOUBLE_EPS = 1e-6;

    // 长度容差 0.1mm
    public static readonly LENGTH_EPS = 1e-4;

    // 角度容差
    public static readonly ANGLE_EPS = 1e-4;

    // 建筑的最大的容差 10km
    public static readonly MODEL_MAX_LENGTH = 1e4;

    // 几何库内部使用
    public static readonly DELTA_EPS = 1e-10;
}

export { ErrorSystem };
