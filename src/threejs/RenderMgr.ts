import * as THREE from 'three';

import { RenderObject } from '../algorithm/discrete/render_object';
import { Vector2 } from '../math/vector2';
import { Vector3 } from '../math/vector3';
import { XYZ } from '../math/xy';
import { OrbitControls } from './OrbitControl';

class RenderMgr {

    // 单例
    public static getInstance(): RenderMgr {
        if (!RenderMgr.instance) {
            RenderMgr.instance = new RenderMgr();
        }
        return RenderMgr.instance;
    }

    private static instance: RenderMgr;

    private mScene: THREE.Scene;
    // 几何数据挂到该节点
    private mGeometryRenderArea: THREE.Group;
    // 坐标轴、网格挂到该节点
    private mGridArea: THREE.Group;
    private mTmpArea: THREE.Group;
    private mCamera: THREE.OrthographicCamera;
    private mRenderer: THREE.WebGLRenderer;
    private mControls: OrbitControls;

    private constructor() {
        const width = 1280;
        const height = 640;
        // 场景
        this.mScene = new THREE.Scene();
        this.mGeometryRenderArea = new THREE.Group();
        this.mGridArea = new THREE.Group();
        this.mTmpArea = new THREE.Group();
        this.mScene.add(this.mGeometryRenderArea);
        this.mScene.add(this.mGridArea);
        this.mScene.add(this.mTmpArea);

        // 相机
        // this.mCamera = new THREE.PerspectiveCamera(30, width / height, 0.1, 1000);
        this.mCamera = new THREE.OrthographicCamera(-width / 2, width / 2, height / 2, -height / 2, -10000, 10000);
        this.mCamera.position.set(0, 0, 10000);
        this.mCamera.zoom = 100;

        this.mCamera.up.set(0, 0, 1);
        this.mCamera.lookAt(new THREE.Vector3(0, 0, 0));
        this.mScene.add(this.mCamera);
        // render
        this.mRenderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true
        });
        this.mRenderer.setSize(width, height);
        this.mRenderer.setClearColor(0x212830, 1);

        this.initAxisGrid();

        this.mControls = new OrbitControls(this.mCamera, this.mRenderer.domElement);
        this.initControl();
    }

    //
    public initScene(canvasDomParent: any, width: number, height: number) {
        // 场景
        canvasDomParent.appendChild(this.mRenderer.domElement);
        this.onWindowResize(width, height);
    }


    public initAxisGrid() {

        for (let i = -10; i < 11; i++) {
            this.addLine(this.mGridArea, { x: 100 * i, y: -1000, z: 0 }, { x: 100 * i, y: 1000, z: 0 }, 0x65686C);
            this.addLine(this.mGridArea, { x: -1000, y: 100 * i, z: 0 }, { x: 1000, y: 100 * i, z: 0 }, 0x65686C);
        }

        const axisHelper = new THREE.AxesHelper(1000);
        this.mGridArea.add(axisHelper);
    }

    public initControl() {

        // 使动画循环使用时阻尼或自转 意思是否有惯性 
        this.mControls.enableDamping = true;
        // 是否可以缩放 
        this.mControls.enableZoom = true;
        // 是否自动旋转 
        this.mControls.autoRotate = false;
        // 不可旋转
        this.mControls.enableRotate = true;
        // 设置相机距离原点的最远距离 
        this.mControls.minDistance = 1;
        // 设置相机距离原点的最远距离 
        this.mControls.maxDistance = 1000;
        this.mControls.rotateSpeed = 0.2;
        // 是否开启右键拖拽 
        this.mControls.enableKeys = false;
        this.mControls.addEventListener('change', this.update.bind(this));
        this.mControls.reset();
    }

    public toggleRotate() {
        this.mControls.enableRotate = !this.mControls.enableRotate;
    }

    public lookAt(axis: string) {
        // 此处有bug， 
        switch (axis) {
            case 'xy':
                this.mCamera.position.set(0, 0, this.mCamera.far);
                break;

            case 'xz':
                this.mCamera.position.set(0, this.mCamera.top, 0);
                break;

            case 'yz':
                this.mCamera.position.set(this.mCamera.right, 0, 0);
                break;
        }
        this.mCamera.rotation.set(0, 0, 0);
        this.mCamera.updateMatrix();
        this.mControls.target.set(0, 0, 0);
        this.mControls.update();
    }

    public onWindowResize(width: number, height: number) {
        // this.mCamera.aspect = width / height;
        this.mCamera.left = -width / 2;
        // (offset, width + offset, height + offset, offset, -10000, 10000);
        this.mCamera.right = width / 2;
        this.mCamera.top = height / 2;
        this.mCamera.bottom = -height / 2;
        this.mCamera.updateProjectionMatrix();
        this.mRenderer.setSize(width, height);
        this.mControls.update();
        this.update();
    }

    public update() {
        this.mRenderer.render(this.mScene, this.mCamera);
    }

    // 添加一个渲染对象
    public addRenderObject(renderObj: RenderObject, colorHex: string, parent: THREE.Group = this.mGeometryRenderArea, updateView: boolean = true) {
        const thisGroup = new THREE.Group();
        thisGroup.visible = !renderObj.isDebug;
        thisGroup.name = renderObj.geoId + '';

        parent.add(thisGroup);

        let color = colorHex;
        if (renderObj.color) {
            color = renderObj.color;
        }

        // 点
        if (renderObj.points && renderObj.points.length > 0) {
            const p = renderObj.vertices[0];
            const geometry = new THREE.BufferGeometry();
            const positions = [p.x, p.y, p.z || 0];
            geometry.addAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
            geometry.computeBoundingSphere();
            //
            const material = new THREE.PointsMaterial();
            material.size = 10;
            material.color = new THREE.Color(color);
            const points = new THREE.Points(geometry, material);
            thisGroup.add(points);
        }

        // 线段
        if (renderObj.edges && renderObj.edges.length > 0) {

            for (const startEnd of renderObj.edges) {
                const geometry = new THREE.Geometry();
                for (let i = startEnd[0]; i <= startEnd[1]; i++) {
                    geometry.vertices.push(new THREE.Vector3(
                        renderObj.vertices[i].x,
                        renderObj.vertices[i].y,
                        renderObj.vertices[i].z)
                    );
                }
                const material = new THREE.LineBasicMaterial({ color });
                material.side = THREE.DoubleSide;

                const line = new THREE.Line(geometry, material);
                thisGroup.add(line);
            }
        }

        // 三角片
        if (renderObj.faces && renderObj.faces.length > 0) {
            const geo = new THREE.Geometry();

            geo.vertices = renderObj.vertices.map((v) => {
                return new THREE.Vector3(v.x, v.y, v.z);
            });

            geo.faces = [];
            const { length } = renderObj.faces;
            for (let i = 0; i < length; i++) {
                const tri = renderObj.faces[i];
                const face = new THREE.Face3(tri[0], tri[1], tri[2]);
                geo.faces.push(face);
            }

            // geo.computeFaceNormals();

            const material = new THREE.MeshBasicMaterial({ color });
            // const material = new THREE.MeshBasicMaterial({ color, wireframe: true });
            material.polygonOffset = true;
            material.polygonOffsetFactor = 1;
            material.polygonOffsetUnits = 1;
            material.side = THREE.DoubleSide;
            const mesh = new THREE.Mesh(geo, material);
            thisGroup.add(mesh);
        }

        if (renderObj.children && renderObj.children.length > 0) {

            for (const child of renderObj.children) {
                this.addRenderObject(child, color, thisGroup, false);
            }
        }

        if (updateView) {
            this.update();
        }
    }

    // 替换渲染对象
    public replace(renderObj: RenderObject, update: boolean = true) {
        this.deleteRenderObjById(renderObj.geoId);
        const colorHex = '#ff0103';
        this.addRenderObject(renderObj, colorHex);
        if (update) {
            this.update();
        }
    }

    // 删除一个渲染对象
    public deleteRenderObjById(geoId: number, update: boolean = true) {
        const geo = this.mGeometryRenderArea.children.find((group) => {
            if (group.name === geoId + '') {
                return true;
            }
            return false;
        });
        if (geo) {
            this.disposeHierarchy(geo, this.disposeNode);
            if (geo.parent) {
                this.disposeNode(geo);
                geo.parent.remove(geo);
            }
        } else {
            console.warn("can't find geo");
        }

        this.clearHighLight();

        if (update) {
            this.update();
        }
    }

    public disposeNode(node: THREE.Object3D) {
        if (node instanceof THREE.Mesh) {
            if (node.geometry) {
                node.geometry.dispose();
            }

            if (node.material) {
                if (node.material instanceof THREE.MeshFaceMaterial) {
                    node.material.materials.forEach((mtrl: any) => {
                        if (mtrl.map) { mtrl.map.dispose(); }
                        if (mtrl.lightMap) { mtrl.lightMap.dispose(); }
                        if (mtrl.bumpMap) { mtrl.bumpMap.dispose(); }
                        if (mtrl.normalMap) { mtrl.normalMap.dispose(); }
                        if (mtrl.specularMap) { mtrl.specularMap.dispose(); }
                        if (mtrl.envMap) { mtrl.envMap.dispose(); }

                        mtrl.dispose();    // disposes any programs associated with the material
                    });
                } else {
                    const material: any = node.material;
                    if (material.map) { material.map.dispose(); }
                    if (material.lightMap) { material.lightMap.dispose(); }
                    if (material.bumpMap) { material.bumpMap.dispose(); }
                    if (material.normalMap) { material.normalMap.dispose(); }
                    if (material.specularMap) { material.specularMap.dispose(); }
                    if (material.envMap) { material.envMap.dispose(); }

                    material.dispose();   // disposes any programs associated with the material
                }
            }
        }
    }   // disposeNode

    public disposeHierarchy(node: THREE.Object3D, callback: any) {
        for (let i = node.children.length - 1; i >= 0; i--) {
            const child = node.children[i];
            this.disposeHierarchy(child, callback);
            callback(child);
            node.remove(child);
        }
    }

    public clearAllGeometries() {
        this.disposeHierarchy(this.mGeometryRenderArea, this.disposeNode);
        this.update();
    }

    public clearHighLight() {
        this.disposeHierarchy(this.mTmpArea, this.disposeNode);
        this.update();
    }

    public findObjectByName(node: THREE.Group, name: string): THREE.Object3D | undefined {
        for (const group of node.children) {
            if (group.name === name) {
                return group;
            }

            if (group instanceof THREE.Group) {//
                const res = this.findObjectByName(group as THREE.Group, name);
                if (res) {
                    return res;
                }
            }
        }
        return;
    }

    public changeMaterialColorToWhite(newObject: THREE.Object3D) {
        newObject.traverse((node) => {
            if (node instanceof THREE.Line) {
                const line: THREE.Line = node as THREE.Line;
                line.material = new THREE.LineBasicMaterial({ depthTest: false, linewidth: 10, color: 'white' });
                line.material.side = THREE.DoubleSide;
            } else if (node instanceof THREE.Mesh) {
                const mesh: THREE.Mesh = node as THREE.Mesh;
                mesh.material = new THREE.MeshBasicMaterial({ depthTest: false, color: 'white' });
                // mesh.material.side = THREE.DoubleSide;
            }
        });
    }

    public pickupObjects(x: number, y: number): number {
        const raycaster = new THREE.Raycaster();
        raycaster.linePrecision = 6;

        const mouse = new THREE.Vector2(x, y);
        // // 将鼠标点击位置的屏幕坐标转成threejs中的标准坐标
        mouse.x = (x / this.mRenderer.getSize().width) * 2 - 1;
        mouse.y = -(y / this.mRenderer.getSize().height) * 2 + 1;
        // 从相机发射一条射线，经过鼠标点击位置
        raycaster.setFromCamera(mouse, this.mCamera);
        // 计算射线相机到的对象，可能有多个对象，因此返回的是一个数组，按离相机远近排列
        const intersects = raycaster.intersectObjects(this.mGeometryRenderArea.children, true);

        if (intersects.length > 0) { //
            const group = intersects[0].object.parent;
            if (group !== null) { //
                this.highLightObject(group);
                return Number.parseInt(group.name, 10);
            } else {
                this.highLightObject(intersects[0].object);
                return Number.parseInt(intersects[0].object.name, 10);
            }
        } else { //
            // this.clearHighLight();
            return -1;
        }
    }


    public screenPtToWorld3d(x: number, y: number): Vector3 {

        const raycaster = new THREE.Raycaster();
        const mouse = new THREE.Vector2();

        mouse.x = (x / this.mRenderer.getSize().width) * 2 - 1;
        mouse.y = -(y / this.mRenderer.getSize().height) * 2 + 1;

        const normal = new THREE.Vector3(0, 0, 1);
        /* 创建平面 */
        const planeGround = new THREE.Plane(normal, 0);

        /* 从相机发出一条射线经过鼠标点击的位置 */
        raycaster.setFromCamera(mouse, this.mCamera);

        /* 获取射线 */
        const ray = raycaster.ray;

        const target = new THREE.Vector3();
        /* 计算相机到射线的对象，可能有多个对象，返回一个数组，按照距离相机远近排列 */
        const intersects = ray.intersectPlane(planeGround, target);

        if (!intersects) {
            return Vector3.zero();
        }

        /* 返回向量 */
        return new Vector3(intersects);
    }

    public screenPtToWorld2d(x: number, y: number): Vector2 {
        const p = this.screenPtToWorld3d(x, y);
        return p.toVector2();
    }

    public highLightById(...ids: number[]) {
        const objs: THREE.Object3D[] = [];
        for (const id of ids) {
            const object = this.findObjectByName(this.mGeometryRenderArea, id + '');
            if (object) {
                objs.push(object);
            }
        }

        if (objs.length > 0) { //
            this.highLightObject(...objs);
        }
    }

    public highLightObject(...objects: THREE.Object3D[]) {
        this.disposeHierarchy(this.mTmpArea, this.disposeNode);
        if (objects.length < 1) { return; }
        objects.forEach(object => {
            const newObject = object.clone();
            newObject.visible = true;
            this.changeMaterialColorToWhite(newObject);

            this.mTmpArea.add(newObject);
            this.update();
        });
    }

    public showOrHideGrid() {
        if (this.mGridArea.children.length > 0) {
            this.disposeHierarchy(this.mGridArea, this.disposeNode);
        } else {
            this.initAxisGrid();
        }

        this.update();
    }

    public clearTmp() {
        this.clearHighLight();
    }

    public drawTmpLine(start: Vector3, end: Vector3) {
        this.addLine(this.mTmpArea, start, end);
        this.update();
    }

    private addLine(
        renderArea: THREE.Group,
        { x: x1, y: y1, z: z1 }: XYZ,
        { x: x2, y: y2, z: z2 }: XYZ,
        colorHx: number = 0xFFFFFF) {

        const lineGeo = new THREE.Geometry();
        lineGeo.vertices.push(new THREE.Vector3(x1, y1, z1));
        lineGeo.vertices.push(new THREE.Vector3(x2, y2, z2));
        const lineMeterial = new THREE.LineBasicMaterial({ color: colorHx });
        // const lineMeterial = new THREE.LineDashedMaterial({ color: colorHx, dashSize: 0.1, gapSize: 0.1, linewidth: 1 });

        const line = new THREE.Line(lineGeo, lineMeterial);
        // 非常重要不然出不来效果
        // line.computeLineDistances();
        renderArea.add(line);
    }
}

/*  //屏幕坐标转世界坐标
  screenPosToWorldPos(x, y) {
    return new THREE.Vector3(x, y, 1).unproject(this.camera);
  }


      let dom = this.refs.canvas;
    let rect = dom.getBoundingClientRect();
    let x = event.clientX - rect.left;
    let y = event.clientY - rect.top;
    return new THREE.Vector2(x / this.width * 2 - 1, -y / this.height * 2 + 1);

*/

export { RenderMgr };
