/**
 * UUID生成器
 */
class UUIDUtil {
    /**
     * 生成UUID
     */
    public static generate(): string {
        // tslint:disable-next-line
        return (UUIDUtil.s4() + UUIDUtil.s4()
            + '-' + UUIDUtil.s4()
            + '-' + UUIDUtil.s4()
            + '-' + UUIDUtil.s4()
            + '-' + UUIDUtil.s4() + UUIDUtil.s4() + UUIDUtil.s4());
    }

    /**
     * 生成8位短的UUID
     */
    public static generateShort(): string {
        const s = [];
        const digits = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ-_';
        const length = digits.length;
        for (let i = 0; i < 8; i++) {
            s.push(digits.charAt(Math.floor(Math.random() * length)));
        }
        return s.join('');
    }

    // 用于生成uuid
    private static s4() {
        return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
    }
}

export { UUIDUtil };
