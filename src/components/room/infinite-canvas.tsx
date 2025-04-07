"use client";
import ReactFlow, {
  Background,
  ReactFlowProvider,
  useNodesState,
  useReactFlow,
} from "reactflow";
import "reactflow/dist/style.css";
import { CanvasContextMenu } from "./canvas-context-menu";
import { createNode } from "@/app/actions/node";
import { toast } from "sonner";
import { NodeType, Node } from "@prisma/client";
import { useState } from "react";

interface InfiniteCanvasProps {
  children?: React.ReactNode;
  roomId: string;
  initialNodes: Node[];
}

function InfiniteCanvas({
  children,
  roomId,
  initialNodes,
}: InfiniteCanvasProps) {
  const { screenToFlowPosition } = useReactFlow();
  const [contextMenuPosition, setContextMenuPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState(
    // Convert database nodes to React Flow nodes
    initialNodes.map((node) => ({
      id: node.id,
      type: "default",
      position: { x: node.posX, y: node.posY },
      data: { label: node.name, type: node.type },
    }))
  );

  const handleNodeCreate = async (type: NodeType) => {
    try {
      const result = await createNode(roomId, type, {
        x: contextMenuPosition?.x || 0,
        y: contextMenuPosition?.y || 0,
      });

      if (result.success && result.node) {
        const newNode = {
          id: result.node.id,
          type: "default",
          position: { x: result.node.posX, y: result.node.posY },
          data: { label: result.node.name, type: result.node.type },
        };
        setNodes((nds) => [...nds, newNode]);
        toast.success("Node created successfully");
      } else {
        toast.error("Failed to create node");
      }
    } catch (error) {
      console.error("Error creating node:", error);
      toast.error("Something went wrong");
    }
  };

  return (
    <CanvasContextMenu onNodeCreate={handleNodeCreate}>
      <div className="w-full h-full">
        <ReactFlow
          nodes={nodes}
          onNodesChange={onNodesChange}
          fitView
          className="bg-background"
          onContextMenu={(e) => {
            const flowPosition = screenToFlowPosition({
              x: e.clientX,
              y: e.clientY,
            });
            setContextMenuPosition(flowPosition);
          }}
        >
          <Background
            gap={30}
            size={1}
            color="#323232"
            style={{ opacity: 1 }}
          />
        </ReactFlow>
      </div>
    </CanvasContextMenu>
  );
}

export default (props: InfiniteCanvasProps) => (
  <ReactFlowProvider>
    <InfiniteCanvas {...props} />
  </ReactFlowProvider>
);
