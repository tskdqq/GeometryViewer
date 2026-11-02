import { Shell } from './shell';

/**
 *  体
 */
abstract class Body extends Shell {
    /**
     *  深拷贝
     */
    public clone(): Body {
        throw new Error('not implement');
    }
}

export { Body };
