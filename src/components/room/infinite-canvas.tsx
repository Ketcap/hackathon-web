"use client";
import ReactFlow, {
  Background,
  NodeTypes,
  ReactFlowProvider,
  useReactFlow,
  OnNodesChange,
  Node,
  useNodesState,
  NodePositionChange,
  NodeProps,
} from "reactflow";
import "reactflow/dist/style.css";
import { CanvasContextMenu } from "./canvas-context-menu";
import { createNode } from "@/app/actions/node";
import { toast } from "sonner";
import { NodeType, Node as PrismaNode } from "@prisma/client";
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { AINode } from "../canvas/nodes/ai/ai";
import { ImageNode } from "../canvas/nodes/image/image";
import { useRoom, NodeData } from "./room-context";
import { updateNodePosition, deleteNode } from "@/app/actions/node";

export interface InfiniteCanvasProps {
  roomId: string;
  initialNodes: PrismaNode[];
  children: React.ReactNode;
}

// Helper to format Prisma nodes to React Flow nodes
const formatNodes = (prismaNodes: PrismaNode[]): Node<NodeData>[] => {
  return prismaNodes.map((node) => ({
    id: node.id,
    type: node.type,
    dragHandle: ".drag-handle",
    position: { x: node.posX, y: node.posY },
    data: { label: node.name, type: node.type },
  }));
};

const NODE_POSITION_THROTTLE_MS = 33; // Real-time broadcast throttle
const NODE_SAVE_DEBOUNCE_MS = 100; // Save delay after drag stops

function InfiniteCanvas({
  roomId,
  initialNodes,
  children,
}: InfiniteCanvasProps) {
  const {
    handleNodePositionChange,
    lastNodeUpdate,
    handleNodeAdd,
    handleNodeRemove,
    lastNodeAdd,
    lastNodeRemove,
  } = useRoom();
  const { screenToFlowPosition } = useReactFlow();
  const [contextMenuPosition, setContextMenuPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState<NodeData>([]);

  // Ref for throttling node position updates
  const nodeBroadcastTimestamps = useRef<Record<string, number>>({});
  // Ref for debounce timers
  const nodeSaveTimers = useRef<Record<string, NodeJS.Timeout>>({});

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      Object.values(nodeSaveTimers.current).forEach(clearTimeout);
    };
  }, []);

  // Initial node setup
  useEffect(() => {
    setNodes(formatNodes(initialNodes));
  }, [initialNodes, setNodes]);

  // Effect for external position updates
  useEffect(() => {
    if (lastNodeUpdate) {
      setNodes((currentNodes) =>
        currentNodes.map((node) =>
          node.id === lastNodeUpdate.nodeId
            ? { ...node, position: lastNodeUpdate.position }
            : node
        )
      );
    }
  }, [lastNodeUpdate, setNodes]);

  // Effect for external node additions
  useEffect(() => {
    if (lastNodeAdd) {
      const newNodeData: NodeData = {
        label: lastNodeAdd.node.name,
        type: lastNodeAdd.node.type as NodeType,
      };
      const newNode: Node<NodeData> = {
        id: lastNodeAdd.node.id,
        type: lastNodeAdd.node.type as NodeType,
        dragHandle: ".drag-handle",
        position: { x: lastNodeAdd.node.posX, y: lastNodeAdd.node.posY },
        data: newNodeData,
      };
      setNodes((currentNodes) =>
        currentNodes.some((n) => n.id === newNode.id)
          ? currentNodes
          : [...currentNodes, newNode]
      );
    }
  }, [lastNodeAdd, setNodes]);

  // Effect for external node removals
  useEffect(() => {
    if (lastNodeRemove) {
      console.log(
        "[Canvas] Received node remove from context:",
        lastNodeRemove
      );
      setNodes((currentNodes) =>
        currentNodes.filter((node) => node.id !== lastNodeRemove.nodeId)
      );
    }
  }, [lastNodeRemove, setNodes]);

  // Combined handler for local changes and throttling broadcasts during drag
  const handleNodesChange: OnNodesChange = useCallback(
    (changes) => {
      onNodesChange(changes);

      const positionChanges = changes.filter(
        (change): change is NodePositionChange => change.type === "position"
      );

      const now = Date.now();
      positionChanges.forEach((change) => {
        if (change.dragging && change.position) {
          // Throttle real-time broadcasts
          const lastBroadcast = nodeBroadcastTimestamps.current[change.id] || 0;
          if (now - lastBroadcast > NODE_POSITION_THROTTLE_MS) {
            handleNodePositionChange(change.id, change.position);
            nodeBroadcastTimestamps.current[change.id] = now;
          }
          // Clear pending save timer on drag start
          if (nodeSaveTimers.current[change.id]) {
            clearTimeout(nodeSaveTimers.current[change.id]);
            delete nodeSaveTimers.current[change.id];
          }
        }
      });
    },
    [onNodesChange, handleNodePositionChange]
  );

  // Handler for finished drag events (triggers debounced save)
  const handleNodeDragStop = useCallback(
    (_event: React.MouseEvent, node: Node<NodeData>) => {
      if (nodeSaveTimers.current[node.id]) {
        clearTimeout(nodeSaveTimers.current[node.id]);
      }
      nodeSaveTimers.current[node.id] = setTimeout(async () => {
        try {
          const result = await updateNodePosition(node.id, node.position);
          if (!result.success) {
            toast.error("Failed to save node position.");
            console.error("Failed to update node position:", result.error);
          }
        } catch (error) {
          toast.error("Error saving node position.");
          console.error("Error calling updateNodePosition:", error);
        }
        delete nodeSaveTimers.current[node.id];
      }, NODE_SAVE_DEBOUNCE_MS);
    },
    []
  );

  const handleNodeCreate = useCallback(
    async (type: NodeType) => {
      try {
        const position = {
          x: contextMenuPosition?.x || 0,
          y: contextMenuPosition?.y || 0,
        };
        const result = await createNode(roomId, type, position);

        if (result.success && result.node) {
          const newNodeData: NodeData = {
            label: result.node.name,
            type: result.node.type,
          };
          const newNode: Node<NodeData> = {
            id: result.node.id,
            type: result.node.type,
            dragHandle: ".drag-handle",
            position: { x: result.node.posX, y: result.node.posY },
            data: newNodeData,
          };
          setNodes((nds) => [...nds, newNode]);
          handleNodeAdd(result.node);
          toast.success(`${result.node.name} created successfully`);
        } else {
          toast.error("Failed to create node");
        }
      } catch (error) {
        console.error("Error creating node:", error);
        toast.error("Something went wrong");
      }
    },
    [roomId, contextMenuPosition, setNodes, handleNodeAdd]
  );

  // Function to handle node deletion (will be passed to nodes)
  const handleNodeDelete = useCallback(
    async (nodeId: string) => {
      setNodes((nds) => nds.filter((n) => n.id !== nodeId));
      handleNodeRemove(nodeId); // Broadcast removal
      try {
        const result = await deleteNode(nodeId);
        if (result.success) {
          toast.success("Node deleted successfully");
        } else {
          toast.error("Failed to delete node on server.");
          console.error("Failed to delete node:", result.error);
          // TODO: Revert local deletion?
        }
      } catch (error) {
        toast.error("Error deleting node.");
        console.error("Error calling deleteNode:", error);
        // TODO: Revert local deletion?
      }
    },
    [setNodes, handleNodeRemove] // Dependencies
  );

  // Create nodeTypes dynamically to inject onDelete
  const nodeTypes: NodeTypes = useMemo(
    () => ({
      [NodeType.Chat]: (props: NodeProps<NodeData>) => (
        <AINode {...props} onDelete={handleNodeDelete} />
      ),
      [NodeType.Image]: (props: NodeProps<NodeData>) => (
        <ImageNode {...props} onDelete={handleNodeDelete} />
      ),
    }),
    [handleNodeDelete]
  );

  return (
    <CanvasContextMenu onNodeCreate={handleNodeCreate}>
      <div className="w-full h-full">
        <ReactFlow
          fitView
          multiSelectionKeyCode={null}
          nodes={nodes}
          onNodesChange={handleNodesChange}
          onNodeDragStop={handleNodeDragStop}
          nodeTypes={nodeTypes} // Use the memoized nodeTypes
          className="bg-background"
          zoomOnPinch
          minZoom={0.5}
          maxZoom={1}
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
