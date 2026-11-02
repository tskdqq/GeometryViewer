// 算法
import * as alg from './algorithm';
// 业务算法算法
import * as archi_alg from './archi_alg';
import * as occ from './occ';
// 强制打包接口文件
import * as ___DontUse from './dont_use_interface';
import { Shell } from './geometry/brep/shell';
import { Body } from './geometry/brep/body';
import { BrepBody } from './geometry/brep/brep_body';
import { Coedge } from './geometry/brep/coedge';
import { Face } from './geometry/brep/face';
import { Edge } from './geometry/brep/edge';
import { Loop } from './geometry/brep/loop';
import { Polygon } from './geometry/brep/polygon';
import { Polyline } from './geometry/brep/polyline';
// topo
import { TopoTrackType } from './geometry/brep/topo_track_type';
import { TopoObject } from './geometry/brep/topo_objecet';
import { Curve } from './geometry/curve';
import { Curve2d } from './geometry/curve2d';
import { Curve3d } from './geometry/curve3d';
import { ExtrudeBody } from './algorithm/body_builder/extrude_body';
import * as GeoInterfaces from './geometry/geo_interfaces';
import * as MathInterfaces from './geometry/math_interfaces';
// 几何
import { GeometryType } from './geometry/geometry_type';
import { Geomtry } from './geometry/geometry';
import { Arc2d } from './geometry/arc2d';
import { Arc3d } from './geometry/arc3d';
import { Line2d } from './geometry/line2d';
import { Line3d } from './geometry/line3d';
import { Plane } from './geometry/plane';
import { Cylinder } from './geometry/cylinder';
import { ReflectUtil } from './geometry/reflect_util';
import { Surface } from './geometry/surface';
import { Coordinate2 } from './math/coordinate2';
import { Coordinate3 } from './math/coordinate3';
import { Interval } from './math/interval';
import { Matrix3 } from './math/matrix3';
import { Matrix4 } from './math/matrix4';
import { Box } from './math/box';
import { Box2 } from './math/box2';
import { Box3 } from './math/box3';
import { Vector } from './math/vector';
import { Vector2 } from './math/vector2';
import { Vector3 } from './math/vector3';
// 数学库
import { XY, XYZ } from './math/xy';
// . QmathUtil工具类
import { MathUtil } from './util/math_util';
import { LogUtil } from './util/log_util';
import { ErrorSystem } from './math/error_system';

// math
export type { XY, XYZ };
export { Vector };
export { Vector2 };
export { Vector3 };
export { Interval };
export { Coordinate2 };
export { Coordinate3 };
export { Matrix3 };
export { Matrix4 };
export { Box };
export { Box2 };
export { Box3 };
export { ErrorSystem };

// geometry
export { GeometryType };
export { Geomtry };
export { Curve };
export { Curve2d };
export { Curve3d };
export { Line2d };
export { Line3d };
export { Arc2d };
export { Arc3d };
export { Surface };
export { Plane };
export { Cylinder };
export { GeoInterfaces };
export { MathInterfaces };

// brep
export { TopoTrackType };
export { TopoObject };
export { Coedge };
export { Polyline };
export { Loop };
export { Polygon };
export { Face };
export { Edge };
export { Shell };
export { Body };
export { BrepBody };
export { ExtrudeBody };


// 工具类
export { ReflectUtil };
export { MathUtil };
export { LogUtil };

// 几何算法
export { alg };
// 业务算法
export { archi_alg };
export { occ };


export { ___DontUse };


