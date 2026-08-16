export enum TypeKind {
  Int32 = "Int32",
  Float = "Float",
  Bool = "Bool",
  Vec2 = "Vec2",
  Vec3 = "Vec3",
  Vec4 = "Vec4",
  Quat = "Quat",
  Color3 = "Color3",
  Color4 = "Color4",
  String = "String",
  AssetHandle = "AssetHandle",
  Enum = "Enum",
}

export interface PropertyMetadata {
  name: string;
  displayName: string;
  type: TypeKind;
  offset: number; // byte offset relative to class start
  size: number;   // size in bytes
  category: string;
  tooltip?: string;
  min?: number;
  max?: number;
  step?: number;
  enumOptions?: string[];
  isReadOnly?: boolean;
}

export interface ClassMetadata {
  className: string;
  parentClassName?: string;
  size: number;
  properties: PropertyMetadata[];
  category: string;
}

export interface EngineComponent {
  id: string;
  type: string;
  name: string;
  enabled: boolean;
  properties: Record<string, any>;
}

export interface EngineActor {
  id: string;
  name: string;
  tag: string;
  layer: string;
  parentId: string | null;
  childrenIds: string[];
  transform: {
    position: [number, number, number];
    rotation: [number, number, number]; // Euler angles in degrees
    scale: [number, number, number];
  };
  components: EngineComponent[];
  isStatic?: boolean;
  isVisible?: boolean;
}

export enum ResourceType {
  Texture2D = "Texture2D",
  DepthStencil = "DepthStencil",
  Buffer = "Buffer",
  UniformBuffer = "UniformBuffer",
}

export enum PassType {
  Raster = "Raster",
  Compute = "Compute",
  RayTracing = "RayTracing",
  Transfer = "Transfer",
}

export interface RenderGraphResource {
  id: string;
  name: string;
  type: ResourceType;
  format: string;
  width: number;
  height: number;
  aliasPoolId?: string;
  sizeBytes: number;
}

export interface RenderGraphPass {
  id: string;
  name: string;
  type: PassType;
  reads: string[]; // Resource IDs
  writes: string[]; // Resource IDs
  description: string;
  queue: "Graphics" | "Compute" | "AsyncCompute";
  inputLayouts?: Record<string, string>; // resourceId -> layout
  outputLayouts?: Record<string, string>; // resourceId -> layout
  pipelineState: {
    depthTest: boolean;
    depthWrite: boolean;
    cullMode: string;
    blendMode: string;
    shader: string;
  };
  sampleCodeSnippet?: string;
}

export interface CodeFile {
  id: string;
  title: string;
  phase: number;
  phaseName: string;
  filename: string;
  type: "header" | "source" | "cmake" | "config";
  language: string;
  category: string;
  description: string;
  code: string;
  architecturalNotes?: string[];
}

export interface TracyZone {
  name: string;
  durationMs: number;
  percentage: number;
  color: string;
  callstack: string;
  category: "Core" | "Physics" | "RenderGraph" | "RHI" | "Editor";
}

export interface PhysicsBodyState {
  id: string;
  actorId: string;
  shape: "Box" | "Sphere" | "Capsule" | "Mesh";
  motionType: "Dynamic" | "Static" | "Kinematic";
  massKg: number;
  friction: number;
  restitution: number;
  linearVelocity: [number, number, number];
  angularVelocity: [number, number, number];
  collisionLayer: "MOVING" | "NON_MOVING" | "DEBRIS" | "SENSOR";
  active: boolean;
}
