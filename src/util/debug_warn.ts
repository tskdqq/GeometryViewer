/**
 * 调试警告
 */
class DebugWarn {
    public static assert(value: any, message: string = 'error', ...s: any) {
        if (!value) {
            throw new Error(message);
        }
    }
    public static warn(value: any, message: string = 'error') {
        if (!value) {
            console.warn(message);
        }
    }
}

export { DebugWarn };
