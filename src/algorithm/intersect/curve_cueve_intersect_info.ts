import { Interval } from '../../math/interval';

export interface CurveCueveIntersectInfo<T> {
    point: T;
    param1: number;
    param2: number;
    isOverlap: boolean;
    overlap1?: Interval;
    overlap2?: Interval;
}
