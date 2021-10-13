const selection: SceneNode = figma.currentPage.selection[0];

console.log({ selection });

function supportsChildren(
  node: SceneNode
): node is FrameNode | ComponentNode | InstanceNode | BooleanOperationNode {
  console.log(">>>", node.type);
  return (
    node.type === "FRAME" ||
    node.type === "GROUP" ||
    node.type === "COMPONENT" ||
    node.type === "COMPONENT_SET" ||
    node.type === "INSTANCE" ||
    node.type === "BOOLEAN_OPERATION"
  );
}

if (supportsChildren(selection)) {
  selection.children.forEach((child) => {
    console.log(child.name);
  });
}

const frame = figma.createFrame();
frame.resize(640, 480);
frame.fills = [{ type: "SOLID", color: { r: 1, g: 0.5, b: 0 } }];

figma.currentPage.appendChild(frame);
