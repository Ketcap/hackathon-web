"use client";
import ReactFlow, {
  Background,
  NodeTypes,
  ReactFlowProvider,
  useNodesState,
  useReactFlow,
  OnNodesChange,
} from "reactflow";
import "reactflow/dist/style.css";
import { CanvasContextMenu } from "./canvas-context-menu";
import { createNode } from "@/app/actions/node";
import { toast } from "sonner";
import { NodeType, Node } from "@prisma/client";
import { useState } from "react";
import { AINode } from "../canvas/nodes/ai/ai";
import { ImageNode } from "../canvas/nodes/image/image";
import { useRoom } from "./room-context";

export interface InfiniteCanvasProps {
  roomId: string;
  initialNodes: Node[];
  children: React.ReactNode;
}

const nodeTypes: NodeTypes = {
  [NodeType.Chat]: AINode,
  [NodeType.Image]: ImageNode,
  [NodeType.Doc]: AINode,
};

function InfiniteCanvas({
  roomId,
  initialNodes,
  children,
}: InfiniteCanvasProps) {
  const { handleNodePositionChange } = useRoom();
  const { screenToFlowPosition } = useReactFlow();
  const [contextMenuPosition, setContextMenuPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState(
    // Convert database nodes to React Flow nodes
    initialNodes.map((node) => ({
      id: node.id,
      type: node.type,
      dragHandle: ".drag-handle",
      position: { x: node.posX, y: node.posY },
      data: { label: node.name, type: node.type },
    }))
  );

  // Handle node position changes
  const handleNodesChange: OnNodesChange = (changes) => {
    onNodesChange(changes);

    // Update positions in the database when nodes are dragged
    changes.forEach((change) => {
      if (change.type === "position" && change.dragging) {
        const node = nodes.find((n) => n.id === change.id);
        if (node) {
          handleNodePositionChange(node.id, node.position);
        }
      }
    });
  };

  const handleNodeCreate = async (type: NodeType) => {
    try {
      const result = await createNode(roomId, type, {
        x: contextMenuPosition?.x || 0,
        y: contextMenuPosition?.y || 0,
      });

      if (result.success && result.node) {
        const newNode = {
          id: result.node.id,
          type: result.node.type,
          dragHandle: ".drag-handle",
          position: { x: result.node.posX, y: result.node.posY },
          data: { label: result.node.name, type: result.node.type },
        };
        setNodes((nds) => [...nds, newNode]);
        toast.success(`${result.node.name} created successfully`);
      } else {
        toast.error("Failed to create node");
      }
    } catch (error) {
      console.error("Error creating node:", error);
      toast.error("Something went wrong");
    }
  };

  const handleNodeCreated = (node: Node) => {
    const newNode = {
      id: node.id,
      type: node.type,
      dragHandle: ".drag-handle",
      position: { x: node.posX, y: node.posY },
      data: { label: node.name, type: node.type },
    };
    setNodes((nds) => [...nds, newNode]);
  };

  return (
    <CanvasContextMenu onNodeCreate={handleNodeCreate}>
      <div className="w-full h-full">
        <ReactFlow
          fitView
          multiSelectionKeyCode={null}
          nodes={nodes}
          onNodesChange={handleNodesChange}
          className="bg-background"
          zoomOnPinch
          minZoom={0.5}
          maxZoom={1}
          nodeTypes={nodeTypes}
          zoomOnScroll={false}
          preventScrolling={false}
          onContextMenu={(e) => {
            const flowPosition = screenToFlowPosition({
              x: e.clientX,
              y: e.clientY,
            });
            setContextMenuPosition(flowPosition);
          }}
        >
          <Background
            gap={50}
            size={2}
            color="#232323"
            style={{ opacity: 1 }}
          />
          {children}
        </ReactFlow>
      </div>
    </CanvasContextMenu>
  );
}

export default function InfiniteCanvasWrapper(props: InfiniteCanvasProps) {
  return (
    <ReactFlowProvider>
      <InfiniteCanvas {...props} />
    </ReactFlowProvider>
  );
}
